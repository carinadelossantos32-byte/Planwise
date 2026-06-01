import { useState } from "react";
import * as XLSX from "xlsx";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import "./import-modal.css";

// CODE MAPS
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

const parseRows = (rows) => {
  const clients = [];
  let i = 0;

  while (i < rows.length) {
    const row = rows[i];

    const husbandName = row["Name"];

    if (!husbandName || String(husbandName).trim() === "" || String(husbandName) === "-1") {
      i++;
      continue;
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
      educational_attainment_female: isWifeRow
        ? decode(EDUCATION_MAP, wifeRow["Highest Educational Attainment"])
        : "",

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

    if (isWifeRow) {
      i += 2; 
    } else {
      i++;    
    }
  }

  return clients;
};


function ImportModal({ onClose, collectionName, onSuccess }) {
  const [step, setStep] = useState("upload");
  const [parsedClients, setParsedClients] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(sheet, {
          range: 1,
          defval: ""
        });

        const clients = parseRows(rows);
        if (clients.length === 0) {
          alert("No records found. Make sure you're using the correct template and that it has data.");
          setStep("upload");
          return;
        }
        const errors = clients.filter(c => c._errors.length > 0).length;

        setParsedClients(clients);
        setErrorCount(errors);
        setStep("preview");
      } catch (error) {
        console.error("File parse error:", error);
        alert("Could not read this file. It might be corrupted or password protected.");
        setStep("upload");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    setStep("saving");
    try {
      const chunkSize = 500;
      let saved = 0;

      for (let i = 0; i < parsedClients.length; i += chunkSize) {
        const chunk = parsedClients.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(client => {
          const { _errors, ...cleanClient } = client;
          const ref = doc(collection(db, collectionName));
          batch.set(ref, {
            ...cleanClient,
            is_archived: false,
            created_at: serverTimestamp()
          });
        });

        await batch.commit();
        saved += chunk.length;
        setSavedCount(saved);
      }

      setStep("done");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Import error:", error);
      alert("Something went wrong while saving. Please try again.");
      setStep("preview");
    }
  };

  const handleReupload = () => {
    setParsedClients([]);
    setErrorCount(0);
    setSavedCount(0);
    setFileName("");
    setStep("upload");
  };

  return (
    <div className="modal-overlay-import">
      <div className="modal-import">

        {/* HEADER */}
        <div className="modal-header-import">
          <h2>
            {step === "upload" && "Import Clients"}
            {step === "preview" && `Preview — ${parsedClients.length} records found`}
            {step === "saving" && "Saving to database..."}
            {step === "done" && "Import Complete"}
          </h2>
          {step !== "saving" && step !== "done" && (
            <button className="modal-close-import" onClick={onClose}>✕</button>
          )}
        </div>

        {/* UPLOAD STEP */}
        {step === "upload" && (
          <div className="import-upload-area">
            <Upload size={36} color="#6366f1" />
            <p>Upload your RPFP Form 1 Excel file</p>
            <span className="import-note">Accepts .xlsx and .xls files</span>

            <a
              href="/RPFP_Form_1_Template.xlsx"
              download="RPFP_Form_1_Template.xlsx"
              className="download-template-link"
              style={{ display: "block", margin: "10px 0", color: "#6366f1", textDecoration: "underline", fontSize: "13px" }}
            >
              Don't have the template? Download it here.
            </a>
            {/* =========================== */}

            <label className="btn-choose-file">
              Choose File
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        {/* PREVIEW STEP */}
        {step === "preview" && (
          <>
            {errorCount > 0 && (
              <div className="import-warning">
                <AlertCircle size={16} />
                <span>
                  {errorCount} record(s) have missing required fields.
                  Fix the errors in your Excel file and re-upload before saving.
                </span>
              </div>
            )}

            <div className="import-preview-table-wrapper">
              <table className="import-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Husband Name</th>
                    <th>Wife Name</th>
                    <th>Civil Status</th>
                    <th>Birthdate (M)</th>
                    <th>Birthdate (F)</th>
                    <th>Address</th>
                    <th>Education (M)</th>
                    <th>Education (F)</th>
                    <th>Children</th>
                    <th>FP Method</th>
                    <th>Intention to Shift</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedClients.map((client, index) => (
                    <tr
                      key={index}
                      className={client._errors.length > 0 ? "row-error" : ""}
                    >
                      <td>{index + 1}</td>
                      <td>{client.name}</td>
                      <td>{client.spouse_name || "—"}</td>
                      <td>{client.civil_status || <span className="missing">—</span>}</td>
                      <td>{client.birthdate_male || <span className="missing">—</span>}</td>
                      <td>{client.birthdate_female || "—"}</td>
                      <td>{client.address || "—"}</td>
                      <td>{client.educational_attainment_male || "—"}</td>
                      <td>{client.educational_attainment_female || "—"}</td>
                      <td>{client.no_of_children || "—"}</td>
                      <td>{client.fp_method || <span className="missing">—</span>}</td>
                      <td>{client.intention_to_shift || "—"}</td>
                      <td>{client.type || "—"}</td>
                      <td>{client.status || "—"}</td>
                      <td>{client.reason || "—"}</td>
                      <td>
                        {client._errors.length > 0 ? (
                          <span className="error-badge">
                            {client._errors.join(", ")}
                          </span>
                        ) : (
                          <span className="ok-badge">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-btn-import">
              <button className="btn-reupload" onClick={handleReupload}>
                Re-upload
              </button>
              <button className="btn-cancel-import" onClick={onClose}>Cancel</button>
              <button
                className="btn-confirm-import"
                onClick={handleSave}
                disabled={errorCount > 0}
              >
                {errorCount > 0
                  ? `Fix ${errorCount} error(s) before saving`
                  : `Confirm & Save ${parsedClients.length} Records`}
              </button>
            </div>
          </>
        )}

        {/* SAVING STEP */}
        {step === "saving" && (
          <div className="import-status">
            <div className="import-spinner" />
            <p>Saving {savedCount} of {parsedClients.length} records...</p>
          </div>
        )}

        {/* DONE STEP */}
        {step === "done" && (
          <div className="import-status">
            <CheckCircle size={40} color="#16a34a" />
            <p>{parsedClients.length} records saved successfully!</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default ImportModal;