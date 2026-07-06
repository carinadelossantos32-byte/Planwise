import { useState } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { findDuplicate } from "../../utils/checkDuplicates";
import "../ClientAddModal/client-add-modal.css";

function ClientAddModalPrivate({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    birthdate: "",
    barangay: "",
    fp_method: "",
    fp_issued_by: ""
  });

  const [errors, setErrors] = useState({});
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    let newErrors = {};
    let isValid = true;
    Object.keys(formData).forEach((key) => {
      if (!formData[key] || String(formData[key]).trim() === "") {
        newErrors[key] = "This field is required";
        isValid = false;
      }
    });
    if (!isValid) { setErrors(newErrors); return; }

    const duplicate = await findDuplicate("clients_private", "private", formData);
    if (duplicate) {
      setExistingRecord(duplicate);
      setDupModalOpen(true);
      return;
    }

    await saveRecord();
  };

  const saveRecord = async (overwriteId = null) => {
    try {
      if (overwriteId) {
        await setDoc(doc(db, "clients_private", overwriteId), {
          ...formData, is_archived: false, updated_at: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(collection(db, "clients_private"), {
          ...formData, is_archived: false, created_at: serverTimestamp()
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving private client:", error);
    }
  };

  const comparisonFields = [
    { label: "Client Name",  key: "name" },
    { label: "Age",          key: "age" },
    { label: "Birthdate",    key: "birthdate" },
    { label: "Barangay",     key: "barangay" },
    { label: "FP Method",    key: "fp_method" },
    { label: "FP Issued By", key: "fp_issued_by" },
  ];

  return (
    <>
      <div className="modal-overlay-add">
        <div className="modal">
          <div className="modal-header">
            <h2>Create New Private Record</h2>
          </div>
          <div className="modal-body">
            <h3>Please verify that all entries are correct and no fields remain empty for secure processing.</h3>
            <form className="form-grid" onSubmit={handleAdd}>

              <div className="form-group">
                <label>Client Name</label>
                <input name="name" value={formData.name} onChange={handleInputChange}
                  placeholder="Client Name" className={errors.name ? "input-error" : ""} />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange}
                  placeholder="Age" min="0" className={errors.age ? "input-error" : ""} />
                {errors.age && <span className="error-text">{errors.age}</span>}
              </div>

              <div className="form-group">
                <label>Birthdate</label>
                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleInputChange}
                  className={errors.birthdate ? "input-error" : ""} />
                {errors.birthdate && <span className="error-text">{errors.birthdate}</span>}
              </div>

              <div className="form-group">
                <label>Barangay</label>
                <input name="barangay" value={formData.barangay} onChange={handleInputChange}
                  placeholder="Barangay" className={errors.barangay ? "input-error" : ""} />
                {errors.barangay && <span className="error-text">{errors.barangay}</span>}
              </div>

              <div className="form-group">
                <label>Method Used</label>
                <select name="fp_method" value={formData.fp_method} onChange={handleInputChange}
                  className={errors.fp_method ? "input-error" : ""}>
                  <option value="">Select</option>
                  <option value="Condom">Condom</option>
                  <option value="IUD">IUD</option>
                  <option value="Pills">Pills</option>
                  <option value="Injectable">Injectable</option>
                  <option value="Vasectomy">Vasectomy</option>
                  <option value="Tubal Ligation">Tubal Ligation</option>
                  <option value="Implant">Implant</option>
                  <option value="CMM/Billings">CMM/Billings</option>
                  <option value="BBT">BBT</option>
                  <option value="Symptothermal">Symptothermal</option>
                  <option value="SDM">SDM</option>
                  <option value="LAM">LAM</option>
                </select>
                {errors.fp_method && <span className="error-text">{errors.fp_method}</span>}
              </div>

              <div className="form-group">
                <label>FP Issued By</label>
                <input name="fp_issued_by" value={formData.fp_issued_by} onChange={handleInputChange}
                  placeholder="Clinic, Hospital, Lying-In" className={errors.fp_issued_by ? "input-error" : ""} />
                {errors.fp_issued_by && <span className="error-text">{errors.fp_issued_by}</span>}
              </div>

              <div className="modal-btn" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "15px" }}>
                <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-save">Create Record</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── DUPLICATE COMPARISON MODAL ── */}
      {dupModalOpen && existingRecord && (
        <div className="modal-overlay-add dup-modal-overlay">
          <div className="modal dup-modal">
            <div className="modal-header dup-modal-header">
              <h2 className="dup-modal-title">⚠ Duplicate Record Found</h2>
            </div>
            <div className="modal-body">
              <p className="dup-modal-subtitle">
                A record with the same husband and wife name already exists.
                Review the differences below and choose how to proceed.
              </p>

              <div className="dup-comparison-grid">
                <div className="dup-column">
                  <div className="dup-column-header dup-column-header--new">
                    ⬆ New Entry (yours)
                  </div>
                  {comparisonFields.map(({ label, key }) => (
                    <div key={key} className={`dup-field-row ${formData[key] !== existingRecord[key] ? "dup-field-row--diff" : ""}`}>
                      <span className="dup-field-label">{label}</span>
                      <span>{formData[key] || "—"}</span>
                    </div>
                  ))}
                </div>

                <div className="dup-column">
                  <div className="dup-column-header dup-column-header--existing">
                    📁 Existing (in database)
                  </div>
                  {comparisonFields.map(({ label, key }) => (
                    <div key={key} className={`dup-field-row ${formData[key] !== existingRecord[key] ? "dup-field-row--diff" : ""}`}>
                      <span className="dup-field-label">{label}</span>
                      <span>{existingRecord[key] || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="dup-legend">🟡 Highlighted fields have different values.</p>

              <div className="dup-actions">
                <button className="dup-btn-cancel" onClick={() => { setDupModalOpen(false); setExistingRecord(null); }}>
                  Cancel (go back)
                </button>
                <button className="dup-btn-skip" onClick={() => { setDupModalOpen(false); onClose(); }}>
                  Skip (don't save)
                </button>
                <button className="dup-btn-overwrite" onClick={() => { setDupModalOpen(false); saveRecord(existingRecord.id); }}>
                  Overwrite Existing
                </button>
                <button className="dup-btn-save" onClick={() => { setDupModalOpen(false); saveRecord(); }}>
                  Save as New
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ClientAddModalPrivate;