import { notify } from "../../utils/notify";
import { useState, useEffect, useRef } from "react";
import { collection, writeBatch, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase-config";
import { AlertCircle, CheckCircle, FileText } from "lucide-react";
import { findDuplicate } from "../../utils/checkDuplicates";
import { MALOLOS_BARANGAY_LIST, checkAddressBarangay, findBarangayCenter } from "../../utils/geoHelper";
import { geocodeAddresses, classifyGeocode, LOCATION_MESSAGES } from "../../utils/geocodeKobo";
import "../ImportModal/import-modal.css";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase-config";

const reverseGeocodeLocations = async (locations) => {
    const reverseGeocode = httpsCallable(functions, "reverseGeocodeBatch", { timeout: 120000 });
    const result = await reverseGeocode({ locations });
    return result.data.addresses || [];
};

//  Secure background queue using Firebase Callable Function
const processSignatureQueue = async (items, collectionName) => {
    const syncSignatureFn = httpsCallable(functions, "syncKoboSignature");
    const CHUNK_SIZE = 3;

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);

        const results = await Promise.allSettled(
            chunk.map((item) =>
                syncSignatureFn({
                    submissionId: item.kobo_id,
                    downloadUrl: item._signatureDownloadUrl,
                    filename: item._signatureFilename,
                    collectionName,
                })
            )
        );

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error(
                    `Signature sync failed for Kobo submission ${chunk[index].kobo_id}:`,
                    result.reason
                );
            }
        });
    }
};

const hasLocationMismatch = (client) => !checkAddressBarangay(client.address, client.barangay).ok;

// A real coordinate pair; the old city-center default does not count
const CITY_CENTER = { lat: 14.8436, lng: 120.8114 };
const hasCoordinates = (record) =>
    record.latitude != null && record.longitude != null &&
    Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude)) &&
    Number(record.latitude) !== 0 && Number(record.longitude) !== 0;
const isMissingLocation = (record) =>
    !hasCoordinates(record) ||
    (Math.abs(Number(record.latitude) - CITY_CENTER.lat) < 1e-6 && Math.abs(Number(record.longitude) - CITY_CENTER.lng) < 1e-6);

// Everything that keeps a row from being saved
const problemsOf = (client) => {
    const problems = [...client._errors];
    if (hasLocationMismatch(client)) problems.push("Address and barangay do not match");
    if (client._checksLocation) {
        if (!MALOLOS_BARANGAY_LIST.some((b) => b.name === client.barangay)) {
            problems.push("Barangay is missing or not one of the 51 barangays of Malolos");
        }
        if (client._municipalityError) problems.push(client._municipalityError);
        if (client._requiresLocation && !hasCoordinates(client)) {
            problems.push(client._locationNote || "The location has not been found yet");
        }
    }
    return problems;
};
const countFlagged = (clients) => clients.filter((c) => problemsOf(c).length > 0).length;

// Saves a verified lookup on the row, or explains why it was not accepted
const applyLookup = (client, result) => {
    const outcome = classifyGeocode(result, client.barangay);
    if (outcome.status === "exact" || outcome.status === "street") {
        return {
            ...client,
            latitude: outcome.lat,
            longitude: outcome.lon,
            location_precision: outcome.status === "exact" ? "address" : "street",
            location_approximate: false,
            _approxCenter: null,
            _locationNote: "",
        };
    }

    const detail = outcome.status === "other-barangay" ? ` (it is in ${outcome.detectedBarangay})` : "";
    return {
        ...client,
        latitude: null,
        longitude: null,
        location_approximate: false,
        _approxCenter: findBarangayCenter(client.barangay),
        _locationNote: `${LOCATION_MESSAGES[outcome.status] || LOCATION_MESSAGES.none}${detail}`,
    };
};

const markLookupUnavailable = (client) => ({
    ...client,
    latitude: null,
    longitude: null,
    _approxCenter: findBarangayCenter(client.barangay),
    _locationNote: LOCATION_MESSAGES.unavailable,
});

// The text a geocoder should search for, from an address the user may have edited
const searchTextOf = (address) => String(address || "").replace(/\s*\(pob\.?\)/i, "");

function KoboSyncModal({ onClose, onSuccess, config }) {
    const [step, setStep] = useState("fetching");
    const [parsedClients, setParsedClients] = useState([]);
    const [errorCount, setErrorCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [duplicates, setDuplicates] = useState([]);
    const [locationReport, setLocationReport] = useState({ updated: 0, failed: 0 });
    const [lookingUp, setLookingUp] = useState(null);

    // The page behind this window re-renders whenever its live data changes, which hands over a new onClose each time.
    // The sync must not start over because of that, so the latest onClose is kept in a ref instead of the effect deps.
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    useEffect(() => {
        let cancelled = false;
        const fetchFromKobo = async () => {
            try {
                const idToken = await auth.currentUser?.getIdToken();
                const response = await fetch(config.syncUrl, {
                    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
                });

                if (!response.ok) throw new Error("Failed to connect to Kobo API.");
                const data = await response.json();
                if (cancelled) return;
                const submissions = data.results || [];

                if (submissions.length === 0) {
                    setStep("empty");
                    return;
                }

                setStep("checking");

                // 1. Fetch all existing kobo_ids from Firestore to prevent re-importing past submissions
                const existingSnap = await getDocs(
                    query(collection(db, config.collectionName), where("kobo_id", "!=", null))
                );
                if (cancelled) return;
                const existingByKoboId = new Map(
                    existingSnap.docs.map((docSnap) => [
                        String(docSnap.data().kobo_id),
                        { ...docSnap.data(), documentId: docSnap.id },
                    ])
                );

                const signatureRetries = submissions.flatMap((submission) => {
                    const existing = existingByKoboId.get(String(submission._id));
                    if (
                        !existing ||
                        existing.signature_url ||
                        !["pending", "failed"].includes(existing.signature_status)
                    ) {
                        return [];
                    }

                    const client = config.mapFields(submission);
                    return client._signatureDownloadUrl ? [client] : [];
                });

                if (signatureRetries.length > 0) {
                    processSignatureQueue(signatureRetries, config.collectionName).catch((err) =>
                        console.error("Signature retry queue failed:", err)
                    );
                }

                // 2. Filter out submissions that are already in the database
                const newSubmissions = submissions.filter(
                    (submission) => !existingByKoboId.has(String(submission._id))
                );

                const existingAddressTargets = submissions.flatMap((submission) => {
                    const existing = existingByKoboId.get(String(submission._id));
                    if (!existing) return [];

                    const address = String(existing.address || "").trim();
                    const addressParts = address.split(",");
                    const isCoordinateAddress = !address || (
                        addressParts.length === 2 &&
                        addressParts.every((part) => part.trim() && Number.isFinite(Number(part)))
                    );
                    const coordinates = Array.isArray(submission._geolocation)
                        ? submission._geolocation.map(Number)
                        : [];

                    if (
                        !isCoordinateAddress ||
                        !Number.isFinite(coordinates[0]) ||
                        !Number.isFinite(coordinates[1])
                    ) {
                        return [];
                    }

                    return [{
                        documentId: existing.documentId,
                        lat: coordinates[0],
                        lon: coordinates[1],
                    }];
                });

                // Existing records that have no real coordinates yet: look them up from the submission's address
                const existingLocationTargets = config.geocodeAddress
                    ? submissions.flatMap((submission) => {
                        const existing = existingByKoboId.get(String(submission._id));
                        if (!existing || existing.location_approximate === true || !isMissingLocation(existing)) return [];
                        const client = config.mapFields(submission);
                        if (!client._geocodeQuery && !hasCoordinates(client)) return [];
                        return [{ existing, client }];
                    })
                    : [];

                if (existingLocationTargets.length > 0) {
                    let updated = 0;
                    let failed = 0;
                    const toLookUp = existingLocationTargets.filter(({ client }) => !hasCoordinates(client));
                    let lookups = [];
                    try {
                        lookups = await geocodeAddresses(
                            toLookUp.map(({ client }) => ({ query: client._geocodeQuery, fallbackQuery: client._geocodeFallbackQuery || "", barangay: client.barangay }))
                        );
                    } catch (error) {
                        console.warn("Address lookup unavailable for existing records.", error);
                    }

                    const fixes = writeBatch(db);
                    existingLocationTargets.forEach(({ existing, client }) => {
                        let located = hasCoordinates(client) ? client : null;
                        if (!located) {
                            const checked = applyLookup(client, lookups[toLookUp.findIndex((t) => t.client === client)]);
                            located = hasCoordinates(checked) ? checked : null;
                        }

                        if (!located) {
                            failed += 1;
                            return;
                        }

                        const address = String(existing.address || "").trim();
                        const coordinateLike = !address || /^[-0-9.,\s]+$/.test(address);
                        fixes.update(doc(db, config.collectionName, existing.documentId), {
                            latitude: located.latitude,
                            longitude: located.longitude,
                            location_precision: located.location_precision || "gps-pin",
                            location_approximate: false,
                            ...(coordinateLike ? { address: client.address } : {}),
                            updated_at: serverTimestamp(),
                        });
                        updated += 1;
                    });

                    if (cancelled) return;
                    if (updated > 0) await fixes.commit();
                    setLocationReport({ updated, failed });
                }

                if (newSubmissions.length === 0 && existingAddressTargets.length === 0) {
                    setStep("empty");
                    return;
                }

                // 3. Map and enrich the new, unsynced submissions sequentially
                const records = [];
                const geocodeTargets = [...existingAddressTargets];
                for (const sub of newSubmissions) {
                    const client = config.mapFields(sub);
                    const coordinates = Array.isArray(sub._geolocation)
                        ? sub._geolocation.map(Number)
                        : [];

                    if (
                        !client.address &&
                        Number.isFinite(coordinates[0]) &&
                        Number.isFinite(coordinates[1])
                    ) {
                        client.address = `${coordinates[0]}, ${coordinates[1]}`;
                        geocodeTargets.push({
                            recordIndex: records.length,
                            lat: coordinates[0],
                            lon: coordinates[1],
                        });
                    }

                    records.push(client);
                }

                for (let i = 0; i < geocodeTargets.length; i += 25) {
                    const batch = geocodeTargets.slice(i, i + 25);
                    try {
                        const addresses = await reverseGeocodeLocations(
                            batch.map(({ lat, lon }) => ({ lat, lon }))
                        );
                        const addressUpdates = writeBatch(db);
                        let hasAddressUpdates = false;

                        batch.forEach((target, index) => {
                            const address = addresses[index];
                            if (!address || address === `${target.lat}, ${target.lon}`) return;

                            if (target.recordIndex !== undefined) {
                                records[target.recordIndex].address = address;
                            } else {
                                addressUpdates.update(
                                    doc(db, config.collectionName, target.documentId),
                                    { address, updated_at: serverTimestamp() }
                                );
                                hasAddressUpdates = true;
                            }
                        });

                        if (hasAddressUpdates) await addressUpdates.commit();
                    } catch (error) {
                        console.warn("Address lookup failed; keeping coordinates for this batch.", error);
                    }
                }

                if (records.length === 0) {
                    setStep("empty");
                    return;
                }

                if (cancelled) return;

                // Rows that came with an address but no coordinates are looked up and checked against Malolos
                const toLocate = records.filter((record) => record._requiresLocation && record._geocodeQuery);
                if (toLocate.length > 0) {
                    try {
                        const lookups = await geocodeAddresses(
                            toLocate.map((record) => ({ query: record._geocodeQuery, fallbackQuery: record._geocodeFallbackQuery || "", barangay: record.barangay }))
                        );
                        toLocate.forEach((record, i) => {
                            records[records.indexOf(record)] = applyLookup(record, lookups[i]);
                        });
                    } catch (error) {
                        console.warn("Address lookup unavailable.", error);
                        if (cancelled) return;
                        notify("The address lookup is unavailable right now. You can retry each row or use its barangay center.");
                        toLocate.forEach((record) => {
                            records[records.indexOf(record)] = markLookupUnavailable(record);
                        });
                    }
                }

                // 4. Secondary duplicate check
                const dupResults = [];
                for (let i = 0; i < records.length; i++) {
                    const existing = await findDuplicate(
                        config.collectionName,
                        config.duplicateScope,
                        records[i]
                    );
                    if (existing) {
                        dupResults.push({ index: i, incoming: records[i], existing });
                        records[i]._isDuplicate = true;
                        records[i]._existingRecord = existing;
                    }
                }

                // 5. Rows whose address and barangay disagree stay editable in the preview
                records.forEach((record) => {
                    record._needsLocationFix = hasLocationMismatch(record);
                });

                setParsedClients(records);
                setDuplicates(dupResults);
                setErrorCount(countFlagged(records));
                setStep("preview");
            } catch (err) {
                console.error("Kobo data retrieval failure:", err.message);
                if (cancelled) return;
                notify("Error fetching records: " + err.message);
                onCloseRef.current();
            }
        };

        fetchFromKobo();
        return () => { cancelled = true; };
    }, [config]);

    // Skip handler: tuluyang inaalis ang row sa preview
    const handleSkipRecord = (indexToRemove) => {
        const updatedClients = parsedClients.filter((_, idx) => idx !== indexToRemove);
        const updatedDuplicates = duplicates
            .filter((d) => d.index !== indexToRemove)
            .map((d) => (d.index > indexToRemove ? { ...d, index: d.index - 1 } : d));

        setParsedClients(updatedClients);
        setDuplicates(updatedDuplicates);
        setErrorCount(countFlagged(updatedClients));
    };

    // Lets the user correct a typo in the address or a wrong barangay before saving
    const handleLocationEdit = (index, field, value) => {
        const updatedClients = parsedClients.map((client, idx) => {
            if (idx !== index) return client;
            const edited = { ...client, [field]: value, _municipalityError: "" };
            if (!client._checksLocation || client._gpsPin) return edited;
            // the place changed, so any earlier lookup or approximation no longer applies
            return {
                ...edited,
                latitude: null,
                longitude: null,
                location_approximate: false,
                _requiresLocation: true,
                _approxCenter: findBarangayCenter(field === "barangay" ? value : client.barangay),
                _locationNote: "The address was changed. Look up its location again.",
            };
        });
        setParsedClients(updatedClients);
        setErrorCount(countFlagged(updatedClients));
    };

    // Looks the (possibly corrected) address up again
    const handleRelookup = async (index) => {
        const row = parsedClients[index];
        setLookingUp(index);
        let next;
        try {
            const [result] = await geocodeAddresses([{ query: searchTextOf(row.address), barangay: row.barangay }]);
            next = applyLookup(row, result);
        } catch (error) {
            console.warn("Address lookup unavailable.", error);
            next = markLookupUnavailable(row);
        }
        const updatedClients = parsedClients.map((client, idx) => (idx === index ? next : client));
        setParsedClients(updatedClients);
        setErrorCount(countFlagged(updatedClients));
        setLookingUp(null);
    };

    // Only after the user agrees: the barangay center stands in for the address and is saved as approximate
    const handleUseBarangayCenter = (index) => {
        const updatedClients = parsedClients.map((client, idx) => {
            if (idx !== index || !client._approxCenter) return client;
            return {
                ...client,
                latitude: client._approxCenter.latitude,
                longitude: client._approxCenter.longitude,
                location_precision: "barangay-center",
                location_approximate: true,
                _locationNote: "",
            };
        });
        setParsedClients(updatedClients);
        setErrorCount(countFlagged(updatedClients));
    };

    const handleSave = async () => {
        setStep("saving");
        try {
            const toSave = parsedClients.filter((c) => !c._skip);
            const chunkSize = 500;
            let saved = 0;

            // 1. Isulat ang mga records sa Firestore
            for (let i = 0; i < toSave.length; i += chunkSize) {
                const batch = writeBatch(db);
                toSave.slice(i, i + chunkSize).forEach((client) => {
                    const {
                        _errors,
                        _isDuplicate,
                        _existingRecord,
                        _skip,
                        _overwrite,
                        _needsLocationFix,
                        _checksLocation,
                        _requiresLocation,
                        _gpsPin,
                        _geocodeQuery,
                        _geocodeFallbackQuery,
                        _municipalityError,
                        _locationNote,
                        _approxCenter,
                        _addressKeys,
                        _signatureDownloadUrl,
                        _signatureFilename,
                        ...clean
                    } = client;

                    if (_overwrite && _existingRecord?.id) {
                        const ref = doc(db, config.collectionName, _existingRecord.id);
                        batch.set(ref, { ...clean, updated_at: serverTimestamp() }, { merge: true });
                    } else {
                        // Gamitin ang mismong kobo_id bilang document ID para madaling mai-link ang signature
                        const docRef = _overwrite && _existingRecord?.id
                            ? doc(db, config.collectionName, _existingRecord.id)
                            : doc(collection(db, config.collectionName));

                        batch.set(
                            docRef,
                            {
                                ...clean,
                                is_archived: false,
                                created_at: serverTimestamp(),
                            },
                            { merge: true }
                        );
                    }
                });

                await batch.commit();
                saved += Math.min(chunkSize, toSave.length - i);
                setSavedCount(saved);
            }

            // 2. ✍️ I-trigger ang background signature transfer sa Firebase Storage
            const signatureQueue = toSave.filter((c) => c._signatureDownloadUrl);
            if (signatureQueue.length > 0) {
                processSignatureQueue(signatureQueue, config.collectionName)
                    .then(() => console.log("Background signature sync finished!"))
                    .catch((err) => console.error("Background signature sync error:", err));
            }

            setStep("done");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Kobo save error:", err);
            notify("Failed to save synchronized entries to database.");
            setStep("preview");
        }
    };

    return (
        <div className="modal-overlay-import">
            <div className="modal-import" style={{ maxWidth: "90%" }}>

                {/* HEADER */}
                <div className="modal-header-import">
                    <h2>
                        {step === "fetching" && "Connecting to KoboToolBox..."}
                        {step === "checking" && `Checking Database for Synced ${config.recordLabel} Records...`}
                        {step === "empty" && "Sync Check Complete"}
                        {step === "preview" && `Kobo Sync — ${parsedClients.length} New ${config.recordLabel} Records Found`}
                        {step === "saving" && "Saving Records to Database..."}
                        {step === "done" && "Synchronization Complete"}
                    </h2>
                    {step !== "saving" && step !== "done" && (
                        <button className="modal-close-import" onClick={onClose}>✕</button>
                    )}
                </div>

                {/* LOADING PANE */}
                {(step === "fetching" || step === "checking" || step === "saving") && (
                    <div className="import-status">
                        <div className="import-spinner" />
                        <p>
                            {step === "fetching" && "Downloading field survey records..."}
                            {step === "checking" && "Scanning database to exclude previously synced entries..."}
                            {step === "saving" && `Saving entries (${savedCount}/${parsedClients.length})...`}
                        </p>
                    </div>
                )}

                {/* PREVIEW WORKSPACE */}
                {step === "preview" && (
                    <>
                        {duplicates.length > 0 && (
                            <div className="import-warning" style={{ background: "#fef9c3", borderColor: "#ca8a04" }}>
                                <AlertCircle size={16} />
                                <span>
                                    {duplicates.length} duplicate record(s) found in your database. Resolve them below.
                                </span>
                            </div>
                        )}

                        {(locationReport.updated > 0 || locationReport.failed > 0) && (
                            <div className="import-warning" style={{ background: "#eff6ff", borderColor: "#3b82f6" }}>
                                <AlertCircle size={16} />
                                <span>
                                    {locationReport.updated} existing record(s) had their location filled in from their address.
                                    {locationReport.failed > 0 && ` ${locationReport.failed} could not be located; correct their address in Client Records.`}
                                </span>
                            </div>
                        )}

                        {parsedClients.some((c) => problemsOf(c).some((p) => !c._errors.includes(p))) && (
                            <div className="import-warning">
                                <AlertCircle size={16} />
                                <span>
                                    {parsedClients.filter((c) => problemsOf(c).some((p) => !c._errors.includes(p))).length} record(s) need their address,
                                    barangay, or location checked. Edit them in the highlighted rows, look the location up again, or skip them.
                                </span>
                            </div>
                        )}

                        <div className="import-preview-table-wrapper">
                            <table className="import-preview-table">
                                <thead>
                                    <tr>
                                        {config.columns.map((col) => <th key={col.key}>{col.label}</th>)}
                                        <th>Status Flag</th>
                                        <th>Resolve Clash</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedClients.map((client, index) => {
                                        const problems = problemsOf(client);
                                        const mismatch = problems.some((p) => !client._errors.includes(p));
                                        return (
                                        <tr key={index} className={problems.length > 0 ? "row-error" : client._isDuplicate ? "row-duplicate" : ""}>
                                            {config.columns.map((col) => (
                                                <td key={col.key}>
                                                    {col.key === "_index" ? (
                                                        index + 1
                                                    ) : col.key === "signature_status" ? (
                                                        client._signatureDownloadUrl ? (
                                                            <span style={{ fontSize: "11px", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                                <FileText size={12} /> Captured
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: "11px", color: "#9ca3af" }}>None</span>
                                                        )
                                                    ) : (client._needsLocationFix || client._checksLocation) && mismatch && col.key === "address" ? (
                                                        <input
                                                            type="text"
                                                            aria-label="Address"
                                                            value={client.address || ""}
                                                            onChange={(e) => handleLocationEdit(index, "address", e.target.value)}
                                                            style={{ minWidth: 260, padding: "4px 6px", border: `1px solid ${mismatch ? "#dc2626" : "#16a34a"}`, borderRadius: 4 }}
                                                        />
                                                    ) : (client._needsLocationFix || client._checksLocation) && mismatch && col.key === "barangay" ? (
                                                        <select
                                                            aria-label="Barangay"
                                                            value={client.barangay || ""}
                                                            onChange={(e) => handleLocationEdit(index, "barangay", e.target.value)}
                                                            style={{ padding: "4px 6px", border: `1px solid ${mismatch ? "#dc2626" : "#16a34a"}`, borderRadius: 4 }}
                                                        >
                                                            {!MALOLOS_BARANGAY_LIST.some((b) => b.name === client.barangay) && (
                                                                <option value={client.barangay || ""}>{client.barangay || "Select barangay"}</option>
                                                            )}
                                                            {MALOLOS_BARANGAY_LIST.map((b) => (
                                                                <option key={b.name} value={b.name}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        client[col.key] || "—"
                                                    )}
                                                </td>
                                            ))}
                                            <td>
                                                {problems.length > 0 ? (
                                                    <span className="error-badge">{problems.join(", ")}</span>
                                                ) : client._isDuplicate ? (
                                                    <span className="duplicate-badge">Duplicate Detected</span>
                                                ) : client.location_approximate ? (
                                                    <span className="ok-badge" style={{ backgroundColor: "#d97706" }}>Approximate location</span>
                                                ) : client._overwrite ? (
                                                    <span className="ok-badge" style={{ backgroundColor: "#3b82f6" }}>Overwriting</span>
                                                ) : (
                                                    <span className="ok-badge">Clean Row</span>
                                                )}
                                            </td>
                                            <td>
                                                {mismatch && !client._isDuplicate && (
                                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                        {client._checksLocation && !client._gpsPin && (
                                                            <button
                                                                type="button"
                                                                className="btn-overwrite-dup"
                                                                disabled={lookingUp === index}
                                                                onClick={() => handleRelookup(index)}
                                                            >
                                                                {lookingUp === index ? "Looking up..." : "Look up again"}
                                                            </button>
                                                        )}
                                                        {client._approxCenter && !hasCoordinates(client) && (
                                                            <button
                                                                type="button"
                                                                className="btn-skip-dup"
                                                                title="Saves the center of the barangay and marks the record as approximate"
                                                                onClick={() => handleUseBarangayCenter(index)}
                                                            >
                                                                Use barangay center (approximate)
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="btn-skip-dup"
                                                            onClick={() => handleSkipRecord(index)}
                                                        >
                                                            Skip
                                                        </button>
                                                    </div>
                                                )}
                                                {client._isDuplicate && (
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            className="btn-skip-dup"
                                                            onClick={() => handleSkipRecord(index)}
                                                        >
                                                            Skip
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-overwrite-dup"
                                                            onClick={() => {
                                                                const updated = [...parsedClients];
                                                                updated[index]._overwrite = true;
                                                                updated[index]._isDuplicate = false;
                                                                setParsedClients(updated);
                                                                setDuplicates(duplicates.filter((d) => d.index !== index));
                                                            }}
                                                        >
                                                            Overwrite
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-btn-import">
                            <button className="btn-cancel-import" onClick={onClose}>Close</button>
                            <button
                                className="btn-confirm-import"
                                onClick={handleSave}
                                disabled={errorCount > 0 || duplicates.length > 0}
                            >
                                {duplicates.length > 0
                                    ? `Resolve Actions (${duplicates.length}) First`
                                    : errorCount > 0
                                        ? "Correct Flagged Form Errors"
                                        : `Save ${parsedClients.filter((c) => !c._skip).length} Records to PlanWise`}
                            </button>
                        </div>
                    </>
                )}

                {/* DONE STATUS */}
                {step === "done" && (
                    <div className="import-status">
                        <CheckCircle size={40} color="#16a34a" />
                        <p>Data synced successfully!</p>
                    </div>
                )}

                {/* ALREADY UP TO DATE (EMPTY) STATUS */}
                {step === "empty" && (
                    <div className="import-status">
                        <CheckCircle size={44} color="#3b82f6" />
                        <h3 style={{ marginTop: "12px", fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                            Already Up to Date
                        </h3>
                        <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
                            All KoboToolBox entries have already been synchronized to PlanWise.
                        </p>
                        {(locationReport.updated > 0 || locationReport.failed > 0) && (
                            <p style={{ color: "#1d4ed8", fontSize: "14px", marginTop: "10px" }}>
                                {locationReport.updated} existing record(s) had their location filled in from their address.
                                {locationReport.failed > 0 && ` ${locationReport.failed} could not be located; correct their address in Client Records.`}
                            </p>
                        )}
                        <button
                            className="btn-confirm-import"
                            onClick={onClose}
                            style={{ marginTop: "20px", padding: "8px 24px" }}
                        >
                            Got it
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default KoboSyncModal;