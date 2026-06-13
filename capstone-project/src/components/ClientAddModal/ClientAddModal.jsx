import { useState } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { findDuplicate } from "../../utils/checkDuplicates";
import "./client-add-modal.css";

function ClientAddModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    spouse_name: "",
    birthdate_male: "",
    birthdate_female: "",
    educational_attainment_male: "",
    educational_attainment_female: "",
    civil_status_male: "",
    civil_status_female: "",
    address: "",
    barangay: "",
    no_of_children: "",
    fp_method: "",
    intention_to_shift: "",
    type: "",
    status: "",
    reason: ""
  });

  const [errors, setErrors] = useState({});
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

const handleAdd = async (e) => {
    e.preventDefault();

    let newErrors = {};
    let isValid = true;

    const mandatoryFields = [
      "name",
      "spouse_name",
      "birthdate_male",
      "birthdate_female",
      "educational_attainment_male",
      "educational_attainment_female",
      "civil_status_male",
      "civil_status_female",
      "address",
      "barangay",
      "no_of_children",
      "fp_method"
    ];

    mandatoryFields.forEach((key) => {
      if (!formData[key] || String(formData[key]).trim() === "") {
        newErrors[key] = "This field is required";
        isValid = false;
      }
    });

    if (!isValid) { 
      setErrors(newErrors); 
      return; 
    }

    try {
      const cleanedData = {
        ...formData,
        name: formData.name.trim(),
        spouse_name: formData.spouse_name.trim()
      };

      const duplicate = await findDuplicate("clients_public", "public", cleanedData);
      console.log("duplicate result:", duplicate);
      
      if (duplicate) {
        setExistingRecord(duplicate);
        setDupModalOpen(true);
        return;
      }
      
      await saveRecord();
    } catch (err) {
      console.error("findDuplicate error:", err);
      alert("Error checking for duplicates: " + err.message);
    }
  };

  const saveRecord = async (overwriteId = null) => {
    try {
      if (overwriteId) {
        await setDoc(doc(db, "clients_public", overwriteId), {
          ...formData,
          is_archived: false,
          updated_at: serverTimestamp(),
        }, { merge: true });
      } else {
        await addDoc(collection(db, "clients_public"), {
          ...formData,
          is_archived: false,
          created_at: serverTimestamp(),
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving public client:", error);
    }
  };

  // Fields to show in the side-by-side comparison
  const comparisonFields = [
    { label: "Male Partner", key: "name" },
    { label: "Female Partner", key: "spouse_name" },
    { label: "Birthdate (M)", key: "birthdate_male" },
    { label: "Birthdate (F)", key: "birthdate_female" },
    { label: "Address", key: "address" },
    { label: "Barangay", key: "barangay" },
    { label: "FP Method", key: "fp_method" },
    { label: "No. of Children", key: "no_of_children" },
    { label: "Civil Status (M)", key: "civil_status_male" },
    { label: "Civil Status (F)", key: "civil_status_female" },
    { label: "Education (M)", key: "educational_attainment_male" },
    { label: "Education (F)", key: "educational_attainment_female" },
    { label: "Intention to Shift", key: "intention_to_shift" },
    { label: "Type", key: "type" },
    { label: "Status", key: "status" },
    { label: "Reason", key: "reason" },
  ];

  return (
    <>
      <div className="modal-overlay-add">
        <div className="modal">
          <div className="modal-header">
            <h2>Create New Public Record</h2>
          </div>

          <div className="modal-body">
            <h3>Please verify that all entries are correct and no fields remain empty for secure processing.</h3>

            <form className="form-grid" onSubmit={handleAdd}>

              <div className="form-group">
                <label>Male Partner</label>
                <input name="name" value={formData.name} onChange={handleInputChange}
                  placeholder="Male Partner" className={errors.name ? "input-error" : ""} />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Female Partner</label>
                <input name="spouse_name" value={formData.spouse_name} onChange={handleInputChange}
                  placeholder="Female Partner" className={errors.spouse_name ? "input-error" : ""} />
                {errors.spouse_name && <span className="error-text">{errors.spouse_name}</span>}
              </div>

              <div className="form-group">
                <label>Birthdate Male</label>
                <input type="date" name="birthdate_male" value={formData.birthdate_male}
                  onChange={handleInputChange} className={errors.birthdate_male ? "input-error" : ""} />
                {errors.birthdate_male && <span className="error-text">{errors.birthdate_male}</span>}
              </div>

              <div className="form-group">
                <label>Birthdate Female</label>
                <input type="date" name="birthdate_female" value={formData.birthdate_female}
                  onChange={handleInputChange} className={errors.birthdate_female ? "input-error" : ""} />
                {errors.birthdate_female && <span className="error-text">{errors.birthdate_female}</span>}
              </div>

              <div className="form-group">
                <label>Educational Attainment Male</label>
                <select name="educational_attainment_male" value={formData.educational_attainment_male}
                  onChange={handleInputChange} className={errors.educational_attainment_male ? "input-error" : ""}>
                  <option value="">Select</option>
                  <option value="No Education">1 - No Education</option>
                  <option value="Elementary Level">2 - Elementary Level</option>
                  <option value="Elementary Graduate">3 - Elementary Graduate</option>
                  <option value="High School Level">4 - High School Level</option>
                  <option value="High School Graduate">5 - High School Graduate</option>
                  <option value="Vocational">6 - Vocational</option>
                  <option value="College Level">7 - College Level</option>
                  <option value="College Graduate">8 - College Graduate</option>
                  <option value="Post Graduate">9 - Post Graduate</option>
                </select>
                {errors.educational_attainment_male && <span className="error-text">{errors.educational_attainment_male}</span>}
              </div>

              <div className="form-group">
                <label>Educational Attainment Female</label>
                <select name="educational_attainment_female" value={formData.educational_attainment_female}
                  onChange={handleInputChange} className={errors.educational_attainment_female ? "input-error" : ""}>
                  <option value="">Select</option>
                  <option value="No Education">1 - No Education</option>
                  <option value="Elementary Level">2 - Elementary Level</option>
                  <option value="Elementary Graduate">3 - Elementary Graduate</option>
                  <option value="High School Level">4 - High School Level</option>
                  <option value="High School Graduate">5 - High School Graduate</option>
                  <option value="Vocational">6 - Vocational</option>
                  <option value="College Level">7 - College Level</option>
                  <option value="College Graduate">8 - College Graduate</option>
                  <option value="Post Graduate">9 - Post Graduate</option>
                </select>
                {errors.educational_attainment_female && <span className="error-text">{errors.educational_attainment_female}</span>}
              </div>

              <div className="form-group">
                <label>Civil Status Male</label>
                <select name="civil_status_male" value={formData.civil_status_male}
                  onChange={handleInputChange} className={errors.civil_status_male ? "input-error" : ""}>
                  <option value="">Select</option>
                  <option value="Single">1 - Single</option>
                  <option value="Married">2 - Married</option>
                  <option value="Widowed">3 - Widowed</option>
                  <option value="Separated">4 - Separated</option>
                  <option value="Live-In">5 - Live-In</option>
                </select>
                {errors.civil_status_male && <span className="error-text">{errors.civil_status_male}</span>}
              </div>

              <div className="form-group">
                <label>Civil Status Female</label>
                <select name="civil_status_female" value={formData.civil_status_female}
                  onChange={handleInputChange} className={errors.civil_status_female ? "input-error" : ""}>
                  <option value="">Select</option>
                  <option value="Single">1 - Single</option>
                  <option value="Married">2 - Married</option>
                  <option value="Widowed">3 - Widowed</option>
                  <option value="Separated">4 - Separated</option>
                  <option value="Live-In">5 - Live-In</option>
                </select>
                {errors.civil_status_female && <span className="error-text">{errors.civil_status_female}</span>}
              </div>

              <div className="form-group">
                <label>Address</label>
                <input name="address" value={formData.address} onChange={handleInputChange}
                  placeholder="Address" className={errors.address ? "input-error" : ""} />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>

              <div className="form-group">
                <label>Barangay</label>
                <input name="barangay" value={formData.barangay} onChange={handleInputChange}
                  placeholder="Barangay" className={errors.barangay ? "input-error" : ""} />
                {errors.barangay && <span className="error-text">{errors.barangay}</span>}
              </div>

              <div className="form-group">
                <label>No. of Children</label>
                <input type="number" name="no_of_children" value={formData.no_of_children}
                  onChange={handleInputChange} min="0" className={errors.no_of_children ? "input-error" : ""} />
                {errors.no_of_children && <span className="error-text">{errors.no_of_children}</span>}
              </div>

              <div className="form-group">
                <label>Method Used</label>
                <select name="fp_method" value={formData.fp_method} onChange={handleInputChange}
                  className={errors.fp_method ? "input-error" : ""}>
                  <option value="">Select</option>
                  <option value="Condom">1 - Condom</option>
                  <option value="IUD">2 - IUD</option>
                  <option value="Pills">3 - Pills</option>
                  <option value="Injectable">4 - Injectable</option>
                  <option value="Vasectomy">5 - Vasectomy</option>
                  <option value="Tubal Ligation">6 - Tubal Ligation</option>
                  <option value="Implant">7 - Implant</option>
                  <option value="CMM/Billings">8 - CMM/Billings</option>
                  <option value="BBT">9 - BBT</option>
                  <option value="Symptothermal">10 - Symptothermal</option>
                  <option value="SDM">11 - SDM</option>
                  <option value="LAM">12 - LAM</option>
                </select>
                {errors.fp_method && <span className="error-text">{errors.fp_method}</span>}
              </div>

              <div className="form-group">
                <label>Intention to Shift</label>
                <select name="intention_to_shift" value={formData.intention_to_shift} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option value="Condom">1 - Condom</option>
                  <option value="IUD">2 - IUD</option>
                  <option value="Pills">3 - Pills</option>
                  <option value="Injectable">4 - Injectable</option>
                  <option value="Vasectomy">5 - Vasectomy</option>
                  <option value="Tubal Ligation">6 - Tubal Ligation</option>
                  <option value="Implant">7 - Implant</option>
                  <option value="CMM/Billings">8 - CMM/Billings</option>
                  <option value="BBT">9 - BBT</option>
                  <option value="Symptothermal">10 - Symptothermal</option>
                  <option value="SDM">11 - SDM</option>
                  <option value="LAM">12 - LAM</option>
                </select>
              </div>

              <div className="form-group">
                <label>Traditional FP User: Type</label>
                <select name="type" value={formData.type} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option value="Withdrawal">1 - Withdrawal</option>
                  <option value="Rhythm">2 - Rhythm</option>
                  <option value="Calendar">3 - Calendar</option>
                  <option value="Abstinence">4 - Abstinence</option>
                  <option value="Herbal">5 - Herbal</option>
                  <option value="No Method">6 - No Method</option>
                </select>
              </div>

              <div className="form-group">
                <label>Traditional FP User: Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option value="Expressing Intention to Use Modern FP">A - Expressing Intention to Use Modern FP</option>
                  <option value="Undecided">B - Undecided</option>
                  <option value="Currently Pregnant">C - Currently Pregnant</option>
                  <option value="No Intention to Use">D - No Intention to Use</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <select name="reason" value={formData.reason} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option value="Spacing">1 - Spacing</option>
                  <option value="Limiting">2 - Limiting</option>
                  <option value="Achieving">3 - Achieving</option>
                </select>
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

export default ClientAddModal;