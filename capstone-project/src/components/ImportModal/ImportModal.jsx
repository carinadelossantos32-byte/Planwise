import { useState } from "react";
import * as XLSX from "xlsx";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import "./import-modal.css";
import { findDuplicate } from "../../utils/checkDuplicates";

// ─── CODE MAPS ────────────────────────────────────────────────────
const CIVIL_STATUS_MAP = {
  "1": "Married", "1-": "Married", "1 -": "Married",
  "2": "Single", "2-": "Single",
  "3": "Widowed", "3-": "Widowed",
  "4": "Separated", "4-": "Separated",
  "5": "Live-In", "5-": "Live-In",
};
const EDUCATION_MAP = {
  "1": "No Education", "1-": "No Education",
  "2": "Elementary Level", "2-": "Elementary Level",
  "3": "Elementary Graduate", "3-": "Elementary Graduate",
  "4": "High School Level", "4-": "High School Level",
  "5": "High School Graduate", "5-": "High School Graduate",
  "6": "Vocational", "6-": "Vocational",
  "7": "College Level", "7-": "College Level",
  "8": "College Graduate", "8-": "College Graduate",
  "9": "Post Graduate", "9-": "Post Graduate",
};
const METHOD_MAP = {
  "1": "Condom", "1-": "Condom",
  "2": "IUD", "2-": "IUD",
  "3": "Pills", "3-": "Pills",
  "4": "Injectable", "4-": "Injectable",
  "5": "Vasectomy", "5-": "Vasectomy",
  "6": "Tubal Ligation", "6-": "Tubal Ligation",
  "7": "Implant", "7-": "Implant",
  "8": "CMM/Billings", "8-": "CMM/Billings",
  "9": "BBT", "9-": "BBT",
  "10": "Symptothermal", "10-": "Symptothermal",
  "11": "SDM", "11-": "SDM",
  "12": "LAM", "12-": "LAM",
};
const TYPE_MAP = {
  "1": "Withdrawal", "1-": "Withdrawal",
  "2": "Rhythm", "2-": "Rhythm",
  "3": "Calendar", "3-": "Calendar",
  "4": "Abstinence", "4-": "Abstinence",
  "5": "Herbal", "5-": "Herbal",
  "6": "No Method", "6-": "No Method",
};
const STATUS_MAP = {
  "A": "Expressing Intention to Use Modern FP",
  "B": "Undecided",
  "C": "Currently Pregnant",
  "D": "No Intention to Use",
};
const REASON_MAP = {
  "1": "Spacing", "1-": "Spacing",
  "2": "Limiting", "2-": "Limiting",
  "3": "Achieving", "3-": "Achieving",
};

const decode = (map, raw) => {
  if (!raw) return "";
  const str = String(raw).trim();
  if (map[str]) return map[str];
  const match = str.match(/^([A-Za-z0-9]+)\s*[-–]?\s*/);
  if (match && map[match[1]]) return map[match[1]];
  return str;
};

const excelDateToString = (serial) => {
  if (!serial || isNaN(serial)) return "";
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split("T")[0];
};

// ─── PARSERS ──────────────────────────────────────────────────────

// Public FP — paired husband/wife rows
const parsePublicRows = (rows) => {
  const clients = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    const husbandName = row["Name"];
    if (!husbandName || String(husbandName).trim() === "" || String(husbandName) === "-1") {
      i++; continue;
    }
    const nextRow = rows[i + 1] || {};
    const nextRowSex = String(nextRow["Sex (M/F)"] || "").trim().toUpperCase();
    const isWifeRow = nextRowSex === "F";
    const wifeRow = isWifeRow ? nextRow : {};

    const client = {
      name: String(husbandName).trim(),
      spouse_name: wifeRow["Name"] ? String(wifeRow["Name"]).trim() : "",
      civil_status: decode(CIVIL_STATUS_MAP, row["Civil Status"]),
      birthdate_male: typeof row["Birthdate / Age"] === "number"
        ? excelDateToString(row["Birthdate / Age"])
        : String(row["Birthdate / Age"] || "").trim(),
      birthdate_female: isWifeRow
        ? typeof wifeRow["Birthdate / Age"] === "number"
          ? excelDateToString(wifeRow["Birthdate / Age"])
          : String(wifeRow["Birthdate / Age"] || "").trim()
        : "",
      address: String(row["Address& Contact Number"] || "").trim(),
      barangay: "",
      educational_attainment_male: decode(EDUCATION_MAP, row["Highest Educational Attainment"]),
      educational_attainment_female: isWifeRow ? decode(EDUCATION_MAP, wifeRow["Highest Educational Attainment"]) : "",
      no_of_children: row["No. of Children"] ? String(Math.round(Number(row["No. of Children"]))) : "",
      fp_method: decode(METHOD_MAP, row["Method Used"]),
      intention_to_shift: decode(METHOD_MAP, row["Intention to shift to other FP Method"]),
      type: decode(TYPE_MAP, row["Type"]),
      status: decode(STATUS_MAP, row["Status"]),
      reason: decode(REASON_MAP, row["Reason for Intending to use FP Method"]),
    };
    client._errors = [];
    if (!client.name) client._errors.push("Missing husband name");
    if (!client.civil_status) client._errors.push("Missing civil status");
    if (!client.birthdate_male) client._errors.push("Missing male birthdate");
    if (!client.fp_method) client._errors.push("Missing FP method");

    clients.push(client);
    i += isWifeRow ? 2 : 1;
  }
  return clients;
};

// Template columns: Name | Age | Birthday | Barangay | Family Planning Method | Fp issued by
const parsePrivateRows = (rows) => {
  const clients = [];
  rows.forEach((row) => {
    const name = row["Name:             "] || row["Name"] || row["Name:"] || "";
    if (!name || String(name).trim() === "") return;

    const client = {
      name: String(name).trim(),
      age: row["Age:"] ? String(row["Age:"]).trim() : "",
      birthdate: row["Birthday:"] ? String(row["Birthday:"]).trim() : "",
      barangay: row["Barangay:"] ? String(row["Barangay:"]).trim() : "",
      fp_method: row["Family Planning Method"] ? String(row["Family Planning Method"]).trim() : "",
      fp_issued_by: row["Fp issued by: (Name of Clinic, Hospitals, Lying Inn)"]
        ? String(row["Fp issued by: (Name of Clinic, Hospitals, Lying Inn)"]).trim()
        : "",
    };
    client._errors = [];
    if (!client.name) client._errors.push("Missing name");
    if (!client.fp_method) client._errors.push("Missing FP method");

    clients.push(client);
  });
  return clients;
};

const parseReferredRows = (rows) => {
  const clients = [];
  rows.forEach((row) => {
    const name = row["Name"] || "";
    if (!name || String(name).trim() === "") return;

    const client = {
      name:              String(name).trim(),
      address:           row["Address"] ? String(row["Address"]).trim() : "",
      FP_method:         row["FP Method"] ? String(row["FP Method"]).trim() : "",
      facility_name:     row["Name of Health Service Facility"] ? String(row["Name of Health Service Facility"]).trim() : "",
      facility_address:  row["Address of Health Service Facility"] ? String(row["Address of Health Service Facility"]).trim() : "",
      referred_by:       row["Referred By"] ? String(row["Referred By"]).trim() : "",
      volunteer_contact: row["Contact No. Volunteer"] ? String(row["Contact No. Volunteer"]).trim() : "",
      date:              row["Date"] ? String(row["Date"]).trim() : "",
    };

    client._errors = [];
    if (!client.name)    client._errors.push("Missing name");
    if (!client.address) client._errors.push("Missing address");
    if (!client.date)    client._errors.push("Missing date");

    clients.push(client);
  });
  return clients;
};

// ─── CONFIG per tab ───────────────────────────────────────────────
const TAB_CONFIG = {
  public: {
    label: "RPFP Form 1",
    template: "/RPFP_Form_1_Template.xlsx",
    templateName: "RPFP_Form_1_Template.xlsx",
    headerRow: 1,
    parseRows: parsePublicRows,
    previewCols: [
      { label: "#", key: "_index" },
      { label: "Husband Name", key: "name" },
      { label: "Wife Name", key: "spouse_name" },
      { label: "Civil Status", key: "civil_status" },
      { label: "Birthdate (M)", key: "birthdate_male" },
      { label: "Birthdate (F)", key: "birthdate_female" },
      { label: "Address", key: "address" },
      { label: "Education (M)", key: "educational_attainment_male" },
      { label: "Education (F)", key: "educational_attainment_female" },
      { label: "Children", key: "no_of_children" },
      { label: "FP Method", key: "fp_method" },
      { label: "Shift To", key: "intention_to_shift" },
      { label: "Type", key: "type" },
      { label: "Status", key: "status" },
      { label: "Reason", key: "reason" },
    ],
  },
  private: {
    label: "Private FP Template",
    template: "/Private_Template.xlsx",
    templateName: "Private_Template.xlsx",
    headerRow: 5,
    parseRows: parsePrivateRows,
    previewCols: [
      { label: "#", key: "_index" },
      { label: "Name", key: "name" },
      { label: "Age", key: "age" },
      { label: "Birthday", key: "birthdate" },
      { label: "Barangay", key: "barangay" },
      { label: "FP Method", key: "fp_method" },
      { label: "Issued By", key: "fp_issued_by" },
    ],
  },
  referred: {
    label: "Referred & Served Template",
    template: "/Referred_Template.xlsx",
    templateName: "Referred_Template.xlsx",
    headerRow: 3,
    parseRows: parseReferredRows,
    previewCols: [
      { label: "#", key: "_index" },
      { label: "Name", key: "name" },
      { label: "Address", key: "address" },
      { label: "FP Method", key: "FP_method" },
      { label: "Facility Name", key: "facility_name" },
      { label: "Facility Address", key: "facility_address" },
      { label: "Referred By", key: "referred_by" },
      { label: "Volunteer Contact", key: "volunteer_contact" },
      { label: "Date", key: "date" },
    ],
  },
};

// ─── COMPONENT ────────────────────────────────────────────────────
function ImportModal({ onClose, collectionName, onSuccess, tabType = "public" }) {
  const config = TAB_CONFIG[tabType] ?? TAB_CONFIG.public;

  const [step, setStep] = useState("upload");
  const [parsedClients, setParsedClients] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [duplicates, setDuplicates] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          range: config.headerRow, defval: "",
        });

        const clients = config.parseRows(rows);
        if (clients.length === 0) {
          alert("No records found. Make sure you're using the correct template.");
          return;
        }

        // Check duplicates against Firestore
        setStep("checking");
        const dupResults = [];
        for (let i = 0; i < clients.length; i++) {
          const existing = await findDuplicate(collectionName, tabType, clients[i]);
          if (existing) {
            dupResults.push({ index: i, incoming: clients[i], existing });
            clients[i]._isDuplicate = true;
            clients[i]._existingRecord = existing;
          }
        }

        setParsedClients(clients);
        setDuplicates(dupResults);
        setErrorCount(clients.filter(c => c._errors.length > 0).length);
        setStep("preview");
      } catch (err) {
        console.error("File parse error:", err);
        alert("Could not read this file.");
        setStep("upload");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    setStep("saving");
    try {
      const toSave = parsedClients.filter(c => !c._skip);
      const chunkSize = 500;
      let saved = 0;

      for (let i = 0; i < toSave.length; i += chunkSize) {
        const batch = writeBatch(db);
        toSave.slice(i, i + chunkSize).forEach(client => {
          const { _errors, _isDuplicate, _existingRecord, _skip, _overwrite, ...clean } = client;

          if (_overwrite && _existingRecord?.id) {
            // Update the existing doc instead of creating a new one
            const ref = doc(db, collectionName, _existingRecord.id);
            batch.set(ref, { ...clean, updated_at: serverTimestamp() }, { merge: true });
          } else {
            batch.set(doc(collection(db, collectionName)), {
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
      console.error("Import error:", err);
      alert("Something went wrong. Please try again.");
      setStep("preview");
    }
  };

  const handleReupload = () => {
    setParsedClients([]); setErrorCount(0); setSavedCount(0); setStep("upload");
  };

  return (
    <div className="modal-overlay-import">
      <div className="modal-import">

        {/* HEADER */}
        <div className="modal-header-import">
          <h2>
            {step === "upload" && `Import — ${config.label}`}
            {step === "preview" && `Preview — ${parsedClients.length} records found`}
            {step === "saving" && "Saving to database..."}
            {step === "done" && "Import Complete"}
          </h2>
          {step !== "saving" && step !== "done" && (
            <button className="modal-close-import" onClick={onClose}>✕</button>
          )}
        </div>

        {/* UPLOAD */}
        {step === "upload" && (
          <div className="import-upload-area">
            <Upload size={36} color="#6366f1" />
            <p>Upload your {config.label} Excel file</p>
            <span className="import-note">Accepts .xlsx and .xls files</span>
            <a
              href={config.template}
              download={config.templateName}
              className="download-template-link"
              style={{ display: "block", margin: "10px 0", color: "#6366f1", textDecoration: "underline", fontSize: "13px" }}
            >
              Don't have the template? Download it here.
            </a>
            <label className="btn-choose-file">
              Choose File
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
        )}

        {/* PREVIEW */}
        {step === "preview" && (
          <>
            {duplicates.length > 0 && (
              <div className="import-warning" style={{ background: "#fef9c3", borderColor: "#ca8a04" }}>
                <AlertCircle size={16} />
                <span>
                  {duplicates.length} possible duplicate(s) found.
                  Review them below before saving.
                </span>
              </div>
            )}

            {errorCount > 0 && (
              <div className="import-warning">
                <AlertCircle size={16} />
                <span>{errorCount} record(s) have missing required fields.</span>
              </div>
            )}

            <div className="import-preview-table-wrapper">
              <table className="import-preview-table">
                <thead>
                  <tr>
                    {config.previewCols.map(col => <th key={col.key}>{col.label}</th>)}
                    <th>Issues</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedClients.map((client, index) => (
                    <>
                      <tr
                        key={index}
                        className={
                          client._errors.length > 0 ? "row-error" :
                            client._isDuplicate ? "row-duplicate" : ""
                        }
                      >
                        {config.previewCols.map(col => (
                          <td key={col.key}>
                            {col.key === "_index" ? index + 1 : client[col.key] || "—"}
                          </td>
                        ))}
                        <td>
                          {client._errors.length > 0
                            ? <span className="error-badge">{client._errors.join(", ")}</span>
                            : client._isDuplicate
                              ? <span className="duplicate-badge">Duplicate</span>
                              : <span className="ok-badge">OK</span>}
                        </td>
                        <td>
                          {client._isDuplicate && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="btn-skip-dup"
                                onClick={() => {
                                  const updated = [...parsedClients];
                                  updated[index]._skip = true;
                                  updated[index]._isDuplicate = false;
                                  setParsedClients(updated);
                                  setDuplicates(duplicates.filter(d => d.index !== index));
                                }}
                              >
                                Skip
                              </button>
                              <button
                                className="btn-overwrite-dup"
                                onClick={() => {
                                  const updated = [...parsedClients];
                                  updated[index]._overwrite = true;
                                  updated[index]._isDuplicate = false;
                                  setParsedClients(updated);
                                  setDuplicates(duplicates.filter(d => d.index !== index));
                                }}
                              >
                                Overwrite
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Side-by-side comparison row */}
                      {client._isDuplicate && client._existingRecord && (
                        <tr key={`dup-${index}`} className="row-duplicate-detail">
                          <td colSpan={config.previewCols.length + 2}>
                            <div className="dup-comparison">
                              <div className="dup-side incoming">
                                <strong>⬆ Incoming (from file)</strong>
                                {config.previewCols
                                  .filter(c => c.key !== "_index")
                                  .map(col => (
                                    <div key={col.key} className={
                                      client[col.key] !== client._existingRecord[col.key]
                                        ? "dup-field changed" : "dup-field"
                                    }>
                                      <span className="dup-label">{col.label}:</span>
                                      <span>{client[col.key] || "—"}</span>
                                    </div>
                                  ))}
                              </div>
                              <div className="dup-side existing">
                                <strong>📁 Existing (in database)</strong>
                                {config.previewCols
                                  .filter(c => c.key !== "_index")
                                  .map(col => (
                                    <div key={col.key} className={
                                      client[col.key] !== client._existingRecord[col.key]
                                        ? "dup-field changed" : "dup-field"
                                    }>
                                      <span className="dup-label">{col.label}:</span>
                                      <span>{client._existingRecord[col.key] || "—"}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-btn-import">
              <button className="btn-reupload" onClick={handleReupload}>Re - Upload</button>
              <button className="btn-cancel-import" onClick={onClose}>Cancel</button>
              <button
                className="btn-confirm-import"
                onClick={handleSave}
                disabled={errorCount > 0 || duplicates.length > 0}
              >
                {duplicates.length > 0
                  ? `Resolve ${duplicates.length} duplicate(s) first`
                  : errorCount > 0
                    ? `Fix ${errorCount} error(s) before saving`
                    : `Confirm & Save ${parsedClients.filter(c => !c._skip).length} Records`}
              </button>
            </div>
          </>
        )}

        {/* SAVING */}
        {step === "saving" && (
          <div className="import-status">
            <div className="import-spinner" />
            <p>Saving {savedCount} of {parsedClients.length} records...</p>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="import-status">
            <CheckCircle size={40} color="#16a34a" />
            <p>{parsedClients.length} records saved successfully!</p>
          </div>
        )}
        {step === "checking" && (
          <div className="import-status">
            <div className="import-spinner" />
            <p>Checking for duplicates...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportModal;