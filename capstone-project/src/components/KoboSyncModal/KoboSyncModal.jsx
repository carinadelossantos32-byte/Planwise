import { useState, useEffect } from "react";
import { collection, writeBatch, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase-config";
import { AlertCircle, CheckCircle, FileText } from "lucide-react";
import { findDuplicate } from "../../utils/checkDuplicates";
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

function KoboSyncModal({ onClose, onSuccess, config }) {
    const [step, setStep] = useState("fetching");
    const [parsedClients, setParsedClients] = useState([]);
    const [errorCount, setErrorCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [duplicates, setDuplicates] = useState([]);

    useEffect(() => {
        const fetchFromKobo = async () => {
            try {
                const response = await fetch(config.syncUrl);

                if (!response.ok) throw new Error("Failed to connect to Kobo API.");
                const data = await response.json();
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

                setParsedClients(records);
                setDuplicates(dupResults);
                setErrorCount(records.filter((c) => c._errors.length > 0).length);
                setStep("preview");
            } catch (err) {
                console.error("Kobo data retrieval failure:", err.message);
                alert("Error fetching records: " + err.message);
                onClose();
            }
        };

        fetchFromKobo();
    }, [onClose, config]);

    // Skip handler: tuluyang inaalis ang row sa preview
    const handleSkipRecord = (indexToRemove) => {
        const updatedClients = parsedClients.filter((_, idx) => idx !== indexToRemove);
        const updatedDuplicates = duplicates
            .filter((d) => d.index !== indexToRemove)
            .map((d) => (d.index > indexToRemove ? { ...d, index: d.index - 1 } : d));

        setParsedClients(updatedClients);
        setDuplicates(updatedDuplicates);
        setErrorCount(updatedClients.filter((c) => c._errors.length > 0).length);
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
            alert("Failed to save synchronized entries to database.");
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
                                    {parsedClients.map((client, index) => (
                                        <tr key={index} className={client._errors.length > 0 ? "row-error" : client._isDuplicate ? "row-duplicate" : ""}>
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
                                                    ) : (
                                                        client[col.key] || "—"
                                                    )}
                                                </td>
                                            ))}
                                            <td>
                                                {client._errors.length > 0 ? (
                                                    <span className="error-badge">{client._errors.join(", ")}</span>
                                                ) : client._isDuplicate ? (
                                                    <span className="duplicate-badge">Duplicate Detected</span>
                                                ) : client._overwrite ? (
                                                    <span className="ok-badge" style={{ backgroundColor: "#3b82f6" }}>Overwriting</span>
                                                ) : (
                                                    <span className="ok-badge">Clean Row</span>
                                                )}
                                            </td>
                                            <td>
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
                                    ))}
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