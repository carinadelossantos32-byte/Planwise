import { useState, useEffect } from "react";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { findDuplicate } from "../../utils/checkDuplicates";
import "../ImportModal/import-modal.css";

const PREVIEW_COLUMNS = [
    { label: "#", key: "_index" },
    { label: "Husband Name", key: "name" },
    { label: "Wife Name", key: "spouse_name" },
    { label: "Civil Status (M))", key: "civil_status_male" },
    { label: "Civil Status (F))", key: "civil_status_female" },
    { label: "Birthdate (M)", key: "birthdate_male" },
    { label: "Birthdate (F)", key: "birthdate_female" },
    { label: "Address", key: "address" },
    { label: "Barangay", key: "barangay" },
    { label: "Educational Attainment (M)", key: "educational_attainment_male" },
    { label: "Educational Attainment (F)", key: "educational_attainment_female" },
    { label: "Children", key: "no_of_children" },
    { label: "FP Method", key: "fp_method" },
];

function KoboSyncModal({ onClose, onSuccess }) {
    const [step, setStep] = useState("fetching");
    const [parsedClients, setParsedClients] = useState([]);
    const [errorCount, setErrorCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [duplicates, setDuplicates] = useState([]);

    const normalizeKoboValue = (value) => {
        if (!value) return "";

        return String(value)
            // remove Kobo prefixes like 1___, 8___, a___, etc.
            .replace(/^[0-9a-zA-Z]+___/, "")
            // convert option_9 -> ""
            .replace(/^option_\d+$/, "")
            // replace underscores with spaces
            .replace(/_/g, " ")
            // capitalize words
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim();
    };

    useEffect(() => {
        const fetchFromKobo = async () => {


            try {
                const response = await fetch(import.meta.env.VITE_KOBO_SYNC_URL);

                if (!response.ok) throw new Error("Failed to connect to Kobo API.");
                const data = await response.json();
                const submissions = data.results || [];



                if (submissions.length === 0) {
                    alert("No remote submissions found inside KoboToolBox.");
                    onClose();
                    return;
                }

                console.log(submissions)

                const records = submissions.map((survey) => {
                    const client = {
                        name: survey["Pangalan_ng_LALAKI_Asawa_Partner"]?.trim() || "",
                        spouse_name: survey["Pangalan_ng_BABAE_Asawa_Partner"]?.trim() || "",

                        birthdate_male:
                            survey["Kailan_ipinanganak_a_laki_Birthday_Male"] || "",

                        birthdate_female:
                            survey["Kailan_ipinanganak_a_ae_Birthday_Female"] || "",

                        educational_attainment_male: normalizeKoboValue(
                            survey["Ano_ang_pinakamataas_onal_Attainment_Male"] 
                        ),

                        educational_attainment_female: normalizeKoboValue(
                            survey["Ano_ang_pinakamataas_al_Attainment_Female"] 
                        ),

                        civil_status_male: normalizeKoboValue(
                            survey["Civil_Status_Male"]
                        ),

                        civil_status_female: normalizeKoboValue(
                            survey["Civil_Status_Female"]
                        ),

                        address:
                            survey["Address"]?.trim() || "",

                        barangay:
                            survey["Barangay"]?.trim() || "",

                        no_of_children:
                            survey["No_of_Children"]
                                ? String(survey["No_of_Children"])
                                : "0",

                        fp_method:
                            survey["Method_Used"] || "",

                        latitude:
                            survey._geolocation
                                ? parseFloat(survey._geolocation[0])
                                : 14.8534,

                        longitude:
                            survey._geolocation
                                ? parseFloat(survey._geolocation[1])
                                : 120.8174,
                    };


                    // IMPORTANT: create this property
                    client._errors = [];

                    if (!client.name) {
                        client._errors.push("Missing husband name");
                    }

                    if (!client.spouse_name) {
                        client._errors.push("Missing wife name");
                    }


                    return client;
                });

                setStep("checking");
                const dupResults = [];
                for (let i = 0; i < records.length; i++) {
                    const existing = await findDuplicate("clients_public", "public", records[i]);
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
    }, [onClose]);

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
                        const ref = doc(db, "clients_public", _existingRecord.id);
                        batch.set(ref, { ...clean, updated_at: serverTimestamp() }, { merge: true });
                    } else {
                        batch.set(doc(collection(db, "clients_public")), {
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
                        {step === "checking" && "Checking for Duplicate Public Records..."}
                        {step === "preview" && `Kobo Sync — ${parsedClients.length} Public Records Found`}
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
                                        {PREVIEW_COLUMNS.map((col) => <th key={col.key}>{col.label}</th>)}
                                        <th>Status Flag</th>
                                        <th>Resolve Clash</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedClients.map((client, index) => (
                                        <tr key={index} className={client._errors.length > 0 ? "row-error" : client._isDuplicate ? "row-duplicate" : ""}>
                                            {PREVIEW_COLUMNS.map((col) => (
                                                <td key={col.key}>
                                                    {col.key === "_index" ? index + 1 : client[col.key] || "—"}
                                                </td>
                                            ))}
                                            <td>
                                                {client._errors.length > 0 ? (
                                                    <span className="error-badge">{client._errors.join(", ")}</span>
                                                ) : client._isDuplicate ? (
                                                    <span className="duplicate-badge">Clash Detected</span>
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