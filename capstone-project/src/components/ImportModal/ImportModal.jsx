import { useState } from "react";
import * as XLSX from "xlsx";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { Upload, AlertCircle, CheckCircle, MapPin } from "lucide-react";
import "./import-modal.css";
import { findDuplicate } from "../../utils/checkDuplicates";
import {
  extractLocationFromAddress,
  MALOLOS_BARANGAY_LIST,
  getCoordinatesByBarangay,
} from "../../utils/geoHelper";

// ─── FILE LIMIT CONSTANTS ─────────────────────────────────────────
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

// ─── HELPERS ──────────────────────────────────────────────────────
const sanitizeCell = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if ("result" in val) return String(val.result ?? "").trim();
    if ("formula" in val) return String(val.formula ?? "").trim();
    if ("text" in val) return String(val.text ?? "").trim();
  }
  return String(val).trim();
};

const decode = (map, raw) => {
  const str = sanitizeCell(raw);
  if (!str) return "";
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

const readColumnValue = (row, columnName) => {
  const normalizedColumnName = columnName.replace(/\s+/g, " ").trim().toLowerCase();
  const entry = Object.entries(row).find(
    ([key]) => key.replace(/\s+/g, " ").trim().toLowerCase() === normalizedColumnName
  );
  return entry?.[1] ?? "";
};

const normalizeImportedDate = (value) => typeof value === "number"
  ? excelDateToString(value)
  : sanitizeCell(value);

const isSummaryRow = (name) => {
  const clean = name.toUpperCase().trim();
  const summaryKeywords = [
    "MSTR/NSV", "CONDOM", "NFP-LAM", "METHODS", "NFP-STM",
    "PILLS-COC", "TOTAL", "GRAND TOTAL", "SUM(", "SUBTOTAL"
  ];
  return summaryKeywords.some((keyword) => clean.includes(keyword));
};

// ─── PARSER PARA SA RPFP FORM 1 ───────────────────────────────────
const parsePublicRows = (rows) => {
  const clients = [];
  let i = 0;

  while (i < rows.length) {
    const row = rows[i];
    const husbandName = sanitizeCell(row["Name"]);

    // 1. Skip empty rows, code indicator rows (-1, -2, etc.), and repeated header titles
    if (
      !husbandName ||
      husbandName === "-1" ||
      husbandName.startsWith("-") ||
      husbandName.toLowerCase() === "name" ||
      isSummaryRow(husbandName)
    ) {
      i++;
      continue;
    }

    const nextRow = rows[i + 1] || {};
    const nextRowSex = sanitizeCell(nextRow["Sex (M/F)"]).toUpperCase();
    const isWifeRow = nextRowSex === "F";
    const wifeRow = isWifeRow ? nextRow : {};

    const rawBirthdateMale = row["Birthdate / Age"];
    const rawBirthdateFemale = wifeRow["Birthdate / Age"];

    // 2. Extract address from either husband or wife row
    const rawAddress = sanitizeCell(
      row["Address& Contact Number"] ||
      row["Address & Contact Number"] ||
      row["Address"] ||
      wifeRow["Address& Contact Number"] ||
      wifeRow["Address"]
    );
    const loc = extractLocationFromAddress(rawAddress);

    // 3. Extract number of children
    const rawChildren = sanitizeCell(row["No. of Children"] || wifeRow["No. of Children"]);
    const parsedChildren = rawChildren && !isNaN(Number(rawChildren))
      ? String(Math.round(Number(rawChildren)))
      : "";

    // 4. Check for participant signature value in the template
    const rawSignature = sanitizeCell(row["PARTICIPANT'S SIGNATURE"] || wifeRow["PARTICIPANT'S SIGNATURE"]);

    const client = {
      name: husbandName,
      spouse_name: isWifeRow ? sanitizeCell(wifeRow["Name"]) : "",
      civil_status_male: decode(CIVIL_STATUS_MAP, row["Civil Status"]),
      civil_status_female: isWifeRow ? decode(CIVIL_STATUS_MAP, wifeRow["Civil Status"]) : "",
      birthdate_male: typeof rawBirthdateMale === "number"
        ? excelDateToString(rawBirthdateMale)
        : sanitizeCell(rawBirthdateMale),
      birthdate_female: isWifeRow
        ? typeof rawBirthdateFemale === "number"
          ? excelDateToString(rawBirthdateFemale)
          : sanitizeCell(rawBirthdateFemale)
        : "",
      address: rawAddress,
      barangay: loc.barangay,
      latitude: loc.latitude,
      longitude: loc.longitude,
      educational_attainment_male: decode(EDUCATION_MAP, row["Highest Educational Attainment"]),
      educational_attainment_female: isWifeRow ? decode(EDUCATION_MAP, wifeRow["Highest Educational Attainment"]) : "",
      no_of_children: parsedChildren,
      fp_method: decode(METHOD_MAP, row["Method Used"]),
      intention_to_shift: decode(METHOD_MAP, row["Intention to shift to other FP Method"]),
      type: decode(TYPE_MAP, row["Type"]),
      status: decode(STATUS_MAP, row["Status"]),
      reason: decode(REASON_MAP, row["Reason for Intending to use FP Method"]),
      signature_status: rawSignature ? "imported" : "none",
    };

    // Validation checks
    client._errors = [];
    if (!client.name) client._errors.push("Missing husband name");
    if (!client.civil_status_male) client._errors.push("Missing civil status");
    if (!client.birthdate_male) client._errors.push("Missing male birthdate");
    if (!loc.isMatched || client.barangay === "Unassigned") {
      client._errors.push("Barangay not detected");
    }

    clients.push(client);
    i += isWifeRow ? 2 : 1;
  }

  return clients;
};

const parsePrivateRows = (rows) => rows
  .map((row) => {
    const client = {
      name: sanitizeCell(readColumnValue(row, "Name:")),
      age: sanitizeCell(readColumnValue(row, "Age:")),
      birthdate: normalizeImportedDate(readColumnValue(row, "Birthday:")),
      barangay: sanitizeCell(readColumnValue(row, "Barangay:")),
      fp_method: sanitizeCell(readColumnValue(row, "Family Planning Method")),
      fp_issued_by: sanitizeCell(readColumnValue(row, "Fp issued by: (Name of Clinic, Hospitals, Lying Inn)")),
    };

    if (!client.name && !client.age && !client.birthdate && !client.barangay && !client.fp_method && !client.fp_issued_by) {
      return null;
    }

    client._errors = [];
    if (!client.name) client._errors.push("Missing client name");
    if (!client.fp_method) client._errors.push("Missing FP method");
    return client;
  })
  .filter(Boolean);

const parseReferredRows = (rows) => rows
  .map((row) => {
    const client = {
      name: sanitizeCell(readColumnValue(row, "Name")),
      address: sanitizeCell(readColumnValue(row, "Address")),
      fp_method: sanitizeCell(readColumnValue(row, "FP Method")),
      facility_name: sanitizeCell(readColumnValue(row, "Name of Health Service Facility")),
      facility_address: sanitizeCell(readColumnValue(row, "Address of Health Service Facility")),
      referred_by: sanitizeCell(readColumnValue(row, "Referred By")),
      volunteer_contact: sanitizeCell(readColumnValue(row, "Contact No. Volunteer")),
      date: normalizeImportedDate(readColumnValue(row, "Date")),
    };

    if (!client.name && !client.address && !client.fp_method && !client.facility_name && !client.facility_address && !client.referred_by && !client.volunteer_contact && !client.date) {
      return null;
    }

    client._errors = [];
    if (!client.name) client._errors.push("Missing client name");
    if (!client.fp_method) client._errors.push("Missing FP method");
    return client;
  })
  .filter(Boolean);

const TAB_CONFIG = {
  public: {
    label: "RPFP Form 1",
    recordNoun: "couples",
    template: "/RPFP_Form1_Template.xlsx",
    templateName: "RPFP_Form1_Template.xlsx",
    headerRow: 6, // Row 7 sa Excel
    parseRows: parsePublicRows,
    previewCols: [
      { label: "#", key: "_index" },
      { label: "Husband Name", key: "name" },
      { label: "Wife Name", key: "spouse_name" },
      { label: "Civil Status (M)", key: "civil_status_male" },
      { label: "Civil Status (F)", key: "civil_status_female" },
      { label: "Birthdate (M)", key: "birthdate_male" },
      { label: "Birthdate (F)", key: "birthdate_female" },
      { label: "Address", key: "address" },
      { label: "Barangay", key: "barangay" },
      { label: "Coordinates", key: "_coords" },
      { label: "Educational Attainment (M)", key: "educational_attainment_male" },
      { label: "Educational Attainment (F)", key: "educational_attainment_female" },
      { label: "Children", key: "no_of_children" },
      { label: "FP Method", key: "fp_method" },
      { label: "Intention to Shift", key: "intention_to_shift" },
      { label: "Type", key: "type" },
      { label: "Status", key: "status" },
      { label: "Reason", key: "reason" },
    ],
  },
  private: {
    label: "Private Client Records",
    recordNoun: "clients",
    template: "/Private_Template.xlsx",
    templateName: "Private_Template.xlsx",
    headerRow: 5,
    parseRows: parsePrivateRows,
    previewCols: [
      { label: "Name", key: "name" },
      { label: "Age", key: "age" },
      { label: "Birthday", key: "birthdate" },
      { label: "Barangay", key: "barangay" },
      { label: "Family Planning Method", key: "fp_method" },
      { label: "FP Issued By", key: "fp_issued_by" },
    ],
  },
  referred: {
    label: "Referred & Served Records",
    recordNoun: "referrals",
    template: "/Export_Template_Referred.xlsx",
    templateName: "Export_Template_Referred.xlsx",
    headerRow: 3,
    parseRows: parseReferredRows,
    previewCols: [
      { label: "Name", key: "name" },
      { label: "Address", key: "address" },
      { label: "FP Method", key: "fp_method" },
      { label: "Health Service Facility", key: "facility_name" },
      { label: "Facility Address", key: "facility_address" },
      { label: "Referred By", key: "referred_by" },
      { label: "Volunteer Contact", key: "volunteer_contact" },
      { label: "Date", key: "date" },
    ],
  },
};

function ImportModal({ onClose, collectionName, onSuccess, tabType = "public" }) {
  const config = TAB_CONFIG[tabType] ?? TAB_CONFIG.public;

  const [step, setStep] = useState("upload");
  const [parsedClients, setParsedClients] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [duplicates, setDuplicates] = useState([]);

  // File Upload Handler na may Size Check (5MB)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`The selected file is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(sheet, {
          range: config.headerRow,
          defval: "",
        });

        const clients = config.parseRows(rows);
        if (clients.length === 0) {
          alert("No valid records found in template.");
          return;
        }

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
        setErrorCount(clients.filter((c) => c._errors.length > 0).length);
        setStep("preview");
      } catch (err) {
        console.error("File parse error:", err);
        alert("Failed to parse file. Please verify structure.");
        setStep("upload");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Dropdown Change Handler
  const handleBarangayChange = (index, selectedBarangay) => {
    const updated = [...parsedClients];
    const client = updated[index];

    client.barangay = selectedBarangay;

    const coords = getCoordinatesByBarangay(selectedBarangay);
    client.latitude = coords.latitude;
    client.longitude = coords.longitude;

    if (selectedBarangay !== "Unassigned") {
      client._errors = client._errors.filter((err) => err !== "Barangay not detected");
    } else if (!client._errors.includes("Barangay not detected")) {
      client._errors.push("Barangay not detected");
    }

    setParsedClients(updated);
    setErrorCount(updated.filter((c) => c._errors.length > 0).length);
  };

  const handleSkipRecord = (indexToRemove) => {
    const updatedClients = parsedClients.filter((_, idx) => idx !== indexToRemove);

    const updatedDuplicates = duplicates
      .filter((d) => d.index !== indexToRemove)
      .map((d) => {
        if (d.index > indexToRemove) {
          return { ...d, index: d.index - 1 };
        }
        return d;
      });

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

      for (let i = 0; i < toSave.length; i += chunkSize) {
        const batch = writeBatch(db);
        toSave.slice(i, i + chunkSize).forEach((client) => {
          const { _errors, _isDuplicate, _existingRecord, _skip, _overwrite, ...clean } = client;

          if (_overwrite && _existingRecord?.id) {
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
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Import error:", err);
      alert("Something went wrong saving the records.");
      setStep("preview");
    }
  };

  const handleReupload = () => {
    setParsedClients([]);
    setErrorCount(0);
    setSavedCount(0);
    setStep("upload");
  };

  return (
    <div className="modal-overlay-import">
      <div className="modal-import">
        <div className="modal-header-import">
          <h2>
            {step === "upload" && `Import — ${config.label}`}
            {step === "preview" && `Preview — ${parsedClients.length} ${config.recordNoun} found`}
            {step === "saving" && "Saving to database..."}
            {step === "done" && "Import Complete"}
          </h2>
          {step !== "saving" && step !== "done" && (
            <button className="modal-close-import" onClick={onClose}>✕</button>
          )}
        </div>

        {step === "upload" && (
          <div className="import-upload-area">
            <Upload size={36} color="#6366f1" />
            <p>Upload your {config.label} Excel file</p>
            <span className="import-note">
              Accepts .xlsx and .xls files (Max: <strong>{MAX_FILE_SIZE_MB}MB</strong>)
            </span>
            <a
              href={config.template}
              download={config.templateName}
              className="download-template-link"
              style={{ display: "block", margin: "10px 0", color: "#6366f1", textDecoration: "underline", fontSize: "13px" }}
            >
              Don't have the template? Download it here.
            </a>
            <label className="btn-choose-file" style={{ marginTop: "12px" }}>
              Choose File
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
        )}

        {step === "preview" && (
          <>
            {duplicates.length > 0 && (
              <div className="import-warning" style={{ background: "#fef9c3", borderColor: "#ca8a04" }}>
                <AlertCircle size={16} />
                <span>
                  {duplicates.length} duplicate record(s) detected. Choose to Skip or Overwrite.
                </span>
              </div>
            )}

            {errorCount > 0 && (
              <div className="import-warning">
                <AlertCircle size={16} />
                <span>
                  {tabType === "public"
                    ? `${errorCount} record(s) need attention. Assign a Barangay using the dropdown.`
                    : `${errorCount} record(s) have missing required fields. Review the flagged rows.`}
                </span>
              </div>
            )}

            <div className="import-preview-table-wrapper">
              <table className="import-preview-table">
                <thead>
                  <tr>
                    {config.previewCols.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    <th>Status</th>
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
                        {config.previewCols.map((col) => {
                          if (col.key === "_index") return <td key={col.key}>{index + 1}</td>;

                          if (col.key === "barangay" && tabType === "public") {
                            const isUnassigned = client.barangay === "Unassigned";
                            return (
                              <td key={col.key}>
                                <select
                                  value={client.barangay}
                                  onChange={(e) => handleBarangayChange(index, e.target.value)}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    borderRadius: "4px",
                                    border: isUnassigned ? "1.5px solid #ef4444" : "1px solid #d1d5db",
                                    backgroundColor: isUnassigned ? "#fef2f2" : "#ffffff",
                                    color: isUnassigned ? "#b91c1c" : "#1f2937",
                                    fontWeight: isUnassigned ? "600" : "normal",
                                    outline: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <option value="Unassigned">-- Select Barangay --</option>
                                  {MALOLOS_BARANGAY_LIST.map((bgy) => (
                                    <option key={bgy.name} value={bgy.name}>
                                      {bgy.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          }

                          if (col.key === "_coords") {
                            return (
                              <td key={col.key} style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>
                                <MapPin size={12} style={{ display: "inline", marginRight: 2 }} />
                                {client.latitude ? `${client.latitude.toFixed(4)}, ${client.longitude.toFixed(4)}` : "—"}
                              </td>
                            );
                          }

                          return <td key={col.key}>{client[col.key] || "—"}</td>;
                        })}

                        <td>
                          {client._errors.length > 0 ? (
                            <span className="error-badge">{client._errors.join(", ")}</span>
                          ) : client._isDuplicate ? (
                            <span className="duplicate-badge">Duplicate</span>
                          ) : (
                            <span className="ok-badge">OK</span>
                          )}
                        </td>

                        <td>
                          {client._isDuplicate && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="btn-skip-dup"
                                onClick={() => handleSkipRecord(index)}
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
                                  setDuplicates(duplicates.filter((d) => d.index !== index));
                                }}
                              >
                                Overwrite
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-btn-import">
              <button className="btn-reupload" onClick={handleReupload}>Re-Upload</button>
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
                    : `Confirm & Save ${parsedClients.filter((c) => !c._skip).length} Records`}
              </button>
            </div>
          </>
        )}

        {step === "checking" && (
          <div className="import-status">
            <div className="import-spinner" />
            <p>Geocoding addresses & checking duplicates...</p>
          </div>
        )}

        {step === "saving" && (
          <div className="import-status">
            <div className="import-spinner" />
            <p>Saving {savedCount} of {parsedClients.length} records...</p>
          </div>
        )}

        {step === "done" && (
          <div className="import-status">
            <CheckCircle size={40} color="#16a34a" />
            <p>{parsedClients.length} records imported successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportModal;