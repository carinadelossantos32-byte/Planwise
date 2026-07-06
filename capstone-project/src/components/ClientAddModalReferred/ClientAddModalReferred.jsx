import { useState } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { findDuplicate } from "../../utils/checkDuplicates";
import "./client-add-modal-referred.css";
import { ImageIcon, X } from "lucide-react";

function ClientAddModalReferred({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    FP_method: "",
    facility_name: "",
    facility_address: "",
    referred_by: "",
    volunteer_contact: "",
    date: "",
    referral_slip_file: ""
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.5);
          setFormData(prev => ({ ...prev, referral_slip_file: compressed }));
          setImagePreview(compressed);
          if (errors.referral_slip_file) setErrors(prev => ({ ...prev, referral_slip_file: "" }));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, referral_slip_file: "" });
    setImagePreview(null);
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

  try {
    const duplicate = await findDuplicate("clients_referred", "referred", formData);
    console.log("Duplicate result:", duplicate);
    if (duplicate) {
      setExistingRecord(duplicate);
      setDupModalOpen(true);
      return;
    }
    await saveRecord();
  } catch (err) {
    console.error("Duplicate check failed:", err);
    alert("Error checking for duplicates: " + err.message);
  }
};

  const saveRecord = async (overwriteId = null) => {
    try {
      if (overwriteId) {
        await setDoc(doc(db, "clients_referred", overwriteId), {
          ...formData, is_archived: false, updated_at: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(collection(db, "clients_referred"), {
          ...formData, is_archived: false, created_at: serverTimestamp()
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving referral record:", error);
    }
  };

  const comparisonFields = [
    { label: "Client Name",       key: "name" },
    { label: "Address",           key: "address" },
    { label: "FP Method",         key: "FP_method" },
    { label: "Facility Name",     key: "facility_name" },
    { label: "Facility Address",  key: "facility_address" },
    { label: "Referred By",       key: "referred_by" },
    { label: "Volunteer Contact", key: "volunteer_contact" },
    { label: "Date",              key: "date" },
  ];

  return (
    <>
      <div className="modal-overlay-add">
        <div className="modal">
          <div className="modal-header">
            <h2>Create New Referral Record</h2>
          </div>
          <div className="modal-body">
            <form className="form-grid" onSubmit={handleAdd}>

              <div className="form-group">
                <label>Client Name</label>
                <input name="name" value={formData.name} onChange={handleInputChange}
                  className={errors.name ? "input-error" : ""} />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Address</label>
                <input name="address" value={formData.address} onChange={handleInputChange}
                  className={errors.address ? "input-error" : ""} />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>

              <div className="form-group">
                <label>FP Method</label>
                <input name="FP_method" value={formData.FP_method} onChange={handleInputChange}
                  className={errors.FP_method ? "input-error" : ""} />
                {errors.FP_method && <span className="error-text">{errors.FP_method}</span>}
              </div>

              <div className="form-group">
                <label>Health Service Facility</label>
                <input name="facility_name" value={formData.facility_name} onChange={handleInputChange}
                  className={errors.facility_name ? "input-error" : ""} />
                {errors.facility_name && <span className="error-text">{errors.facility_name}</span>}
              </div>

              <div className="form-group">
                <label>Facility Address</label>
                <input name="facility_address" value={formData.facility_address} onChange={handleInputChange}
                  className={errors.facility_address ? "input-error" : ""} />
                {errors.facility_address && <span className="error-text">{errors.facility_address}</span>}
              </div>

              <div className="form-group">
                <label>Referred By</label>
                <input name="referred_by" value={formData.referred_by} onChange={handleInputChange}
                  className={errors.referred_by ? "input-error" : ""} />
                {errors.referred_by && <span className="error-text">{errors.referred_by}</span>}
              </div>

              <div className="form-group">
                <label>Volunteer Contact No.</label>
                <input name="volunteer_contact" value={formData.volunteer_contact} onChange={handleInputChange}
                  className={errors.volunteer_contact ? "input-error" : ""} />
                {errors.volunteer_contact && <span className="error-text">{errors.volunteer_contact}</span>}
              </div>

              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange}
                  className={errors.date ? "input-error" : ""} />
                {errors.date && <span className="error-text">{errors.date}</span>}
              </div>

              <div className="form-group">
                <label>Referral Slip Picture</label>
                {!imagePreview ? (
                  <div className={`file-upload-box ${errors.referral_slip_file ? "input-error" : ""}`}>
                    <input type="file" accept="image/*" onChange={handleFileChange} id="slip-upload" hidden />
                    <label htmlFor="slip-upload" className="upload-label">
                      <ImageIcon size={20} />
                      <span>Click to upload picture</span>
                    </label>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="slip-preview" />
                    <button type="button" className="remove-img-btn" onClick={removeImage}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                {errors.referral_slip_file && <span className="error-text">{errors.referral_slip_file}</span>}
              </div>

              <div className="modal-btn" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "15px" }}>
                <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-save">Create Record</button>
              </div>
            </form>
          </div>
        </div>
      </div>

{/* DUPLICATE MODAL */}
{dupModalOpen && existingRecord && (
  <div className="modal-overlay-add dup-modal-overlay">
    <div className="modal dup-modal">
      <div className="modal-header dup-modal-header">
        <h2 className="dup-modal-title">⚠ Duplicate Record Found</h2>
      </div>
      <div className="modal-body">
        <p className="dup-modal-subtitle">
          A record with the same name and address already exists. Review the differences and choose how to proceed.
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
            Cancel (Go back)
          </button>
          <button className="dup-btn-skip" onClick={() => { setDupModalOpen(false); onClose(); }}>
            Skip (Don't save)
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

export default ClientAddModalReferred;