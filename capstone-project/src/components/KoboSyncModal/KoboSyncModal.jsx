import { useState, useEffect } from "react";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { AlertCircle, CheckCircle } from "lucide-react";
import { findDuplicate } from "../../utils/checkDuplicates";
import "../ImportModal/import-modal.css";


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
                    alert(config.emptyMessage || "No remote submissions found inside KoboToolBox.");
                    onClose();
                    return;
                }

                console.log(submissions);

                const records = submissions.map(config.mapFields);

                setStep("checking");
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

    const handleSave = async () => {
        setStep("saving");
        try {
            const toSave = parsedClients.filter((c) => !c._skip);
            const chunkSize = 500;
            let saved = 0;

            for (let i = 0; i < toSave.length; i += chunkSize) {
                const batch = writeBatch(db);
                toSave.slice(i, i + chunkSize).forEach((client) => {
                    const { _errors, _isDuplicate, _existingRecord, _skip, _overwrite, ...clean } = client;

                    if (_overwrite && _existingRecord?.id) {
                        const ref = doc(db, config.collectionName, _existingRecord.id);
                        batch.set(ref, { ...clean, updated_at: serverTimestamp() }, { merge: true });
                    } else {
                        batch.set(doc(collection(db, config.collectionName)), {
                            ...clean,
                            is_archived: false,
                            created_at: serverTimestamp(),
                        });
                    }
                });

                await batch.commit();
                saved += Math.min(chunkSize, toSave.length - i);
                setSavedCount(saved);
            }

            setStep("done");
            setTimeout(() => { onSuccess(); onClose(); }, 1500);
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
                        {step === "checking" && `Checking for Duplicate ${config.recordLabel} Records...`}
                        {step === "preview" && `Kobo Sync — ${parsedClients.length} ${config.recordLabel} Records Found`}
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
                            {step === "checking" && "Scanning registries for identical names..."}
                            {step === "saving" && `Saving entries (${savedCount}/${parsedClients.length})...`}
                        </p>
                    </div>
                )}

                {/* PREVIEW AND CLASH RESOLUTION WORKSPACE */}
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
                                                    {col.key === "_index" ? index + 1 : client[col.key] || "—"}
                                                </td>
                                            ))}
                                            <td>
                                                {client._errors.length > 0 ? (
                                                    <span className="error-badge">{client._errors.join(", ")}</span>
                                                ) : client._isDuplicate ? (
                                                    <span className="duplicate-badge">Duplicate Detected</span>
                                                ) : client._skip ? (
                                                    <span className="error-badge" style={{ backgroundColor: "#9ca3af" }}>Skipped</span>
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
                                                            onClick={() => {
                                                                const updated = [...parsedClients];
                                                                updated[index]._skip = true;
                                                                updated[index]._isDuplicate = false;
                                                                setParsedClients(updated);
                                                                setDuplicates(duplicates.filter((d) => d.index !== index));
                                                            }}
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
                        <p>Ecosystem data synced successfully!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default KoboSyncModal;
