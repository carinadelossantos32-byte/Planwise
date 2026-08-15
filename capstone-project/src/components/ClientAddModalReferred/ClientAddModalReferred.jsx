import { useState } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase-config";
import { findDuplicate } from "../../utils/checkDuplicates";
import "../ClientAddModal/client-add-modal.css";
import { ImageIcon, X } from "lucide-react";

function ClientAddModalReferred({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    fp_method: "",
    with_intention_to_shift: "",
    facility_name: "",
    facility_address: "",
    referred_by: "",
    volunteer_contact: "",
    date: "",
    referral_slip_file: "" // Stores the Firebase Storage HTTPS URL
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show instant local preview while uploading to cloud
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setUploading(true);

    try {
      // 1. Create a reference path in Firebase Storage
      const fileRef = ref(storage, `referral_slips/${Date.now()}_${file.name}`);

      // 2. Upload raw file bytes
      const snapshot = await uploadBytes(fileRef, file);

      // 3. Retrieve public HTTPS URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 4. Update state with URL string
      setFormData(prev => ({ ...prev, referral_slip_file: downloadURL }));
      if (errors.referral_slip_file) setErrors(prev => ({ ...prev, referral_slip_file: "" }));
    } catch (err) {
      console.error("Firebase Storage Upload Error:", err);
      alert("Failed to upload referral slip picture. Please try again.");
      removeImage();
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, referral_slip_file: "" }));
    setImagePreview(null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (uploading) return; // Prevent submission while upload is running

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
    { label: "Client Name", key: "name" },
    { label: "Address", key: "address" },
    { label: "FP Method", key: "fp_method" },
    { label: "With Intention to Shift", key: "with_intention_to_shift" },
    { label: "Facility Name", key: "facility_name" },
    { label: "Facility Address", key: "facility_address" },
    { label: "Referred By", key: "referred_by" },
    { label: "Volunteer Contact", key: "volunteer_contact" },
    { label: "Date", key: "date" },
  ];

  return (
    <>
      <div className="cfpr-overlay">
        <div className="cfpr-modal" id="cfpr-modal-root" role="dialog" aria-labelledby="cfpr-title">
          <div className="cfpr-header">
            <h2 id="cfpr-title" className="cfpr-title">Create New Referral Record</h2>
            <p className="cfpr-subtitle">Please verify that all entries are correct and no fields remain empty for secure processing.</p>
          </div>

          {/* Form wraps modal-body and modal-btn for clean flex height and scrolling */}
          <form onSubmit={handleAdd} className="cfpr-form">
            <div className="cfpr-body">
              <section className="cfpr-section">
                <h3 className="cfpr-section-title">Referred & Served Information</h3>

                <div className="cfpr-paired-cols">
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">Client Name</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Client Name"
                      className={`cfpr-input ${errors.name ? "cfpr-input-error" : ""}`}
                    />
                    {errors.name && <span className="cfpr-error-text">{errors.name}</span>}
                  </div>
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">Address</label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Address"
                      className={`cfpr-input ${errors.address ? "cfpr-input-error" : ""}`}
                    />
                    {errors.address && <span className="cfpr-error-text">{errors.address}</span>}
                  </div>
                </div>
                <div className="cfpr-paired-cols">
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">FP Method</label>
                    <select
                      name="fp_method"
                      value={formData.fp_method || ""}
                      onChange={handleInputChange}
                      placeholder="Select FP Method"
                      className={`cfpr-input ${errors.fp_method ? "cfpr-input-error" : ""}`}
                    >
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
                    {errors.fp_method && <span className="cfpr-error-text">{errors.fp_method}</span>}
                  </div>
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">With Intention to Shift</label>
                    <select
                      name="with_intention_to_shift"
                      value={formData.with_intention_to_shift}
                      onChange={handleInputChange}
                      className={`cfpr-input ${errors.with_intention_to_shift ? "cfpr-input-error" : ""}`}
                    >
                      <option value="">Select</option>
                      <option value="No Intention">No Intention</option>
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
                    {errors.with_intention_to_shift && <span className="cfpr-error-text">{errors.with_intention_to_shift}</span>}
                  </div>
                </div>
                <div className="cfpr-paired-cols">
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">Health Service Facility</label>
                    <input
                      name="facility_name"
                      value={formData.facility_name}
                      onChange={handleInputChange}
                      placeholder="Health Service Facility"
                      className={`cfpr-input ${errors.facility_name ? "cfpr-input-error" : ""}`}
                    />
                    {errors.facility_name && <span className="cfpr-error-text">{errors.facility_name}</span>}
                  </div>
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">Facility Address</label>
                    <input
                      name="facility_address"
                      value={formData.facility_address}
                      onChange={handleInputChange}
                      placeholder="Facility Address"
                      className={`cfpr-input ${errors.facility_address ? "cfpr-input-error" : ""}`}
                    />
                    {errors.facility_address && <span className="cfpr-error-text">{errors.facility_address}</span>}
                  </div>
                </div>
                <div className="cfpr-paired-cols">
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">Referred By</label>
                    <input
                      name="referred_by"
                      value={formData.referred_by}
                      onChange={handleInputChange}
                      placeholder="Referred By"
                      className={`cfpr-input ${errors.referred_by ? "cfpr-input-error" : ""}`}
                    />
                    {errors.referred_by && <span className="cfpr-error-text">{errors.referred_by}</span>}
                  </div>
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">Volunteer Contact No.</label>
                    <input
                      name="volunteer_contact"
                      value={formData.volunteer_contact}
                      onChange={handleInputChange}
                      placeholder="Volunteer Contact No."
                      className={`cfpr-input ${errors.volunteer_contact ? "cfpr-input-error" : ""}`}
                    />
                    {errors.volunteer_contact && <span className="cfpr-error-text">{errors.volunteer_contact}</span>}
                  </div>
                </div>

                <div className="cfpr-group-2">
                  <label className="cfpr-label">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    placeholder="Select Date"
                    className={`cfpr-input ${errors.date ? "cfpr-input-error" : ""}`}
                  />
                  {errors.date && <span className="cfpr-error-text">{errors.date}</span>}
                </div>
                <div className="cfpr-group-2">
                  <label className="cfpr-label">Referral Slip Picture</label>
                  {!imagePreview ? (
                    <div className={`file-upload-box ${errors.referral_slip_file ? "cfpr-input-error" : ""}`}>
                      <input type="file" accept="image/*" onChange={handleFileChange} placeholder="Upload Referral Slip" id="slip-upload" hidden />
                      <label htmlFor="slip-upload" className="upload-label">
                        <ImageIcon size={20} />
                        <span>Click to upload picture</span>
                      </label>
                    </div>
                  ) : (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="slip-preview" />
                      {uploading && (
                        <span style={{ fontSize: "12px", color: "#3b82f6", marginTop: "4px" }}>
                          Uploading...
                        </span>
                      )}
                      <button type="button" className="remove-img-btn" onClick={removeImage} disabled={uploading}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {errors.referral_slip_file && <span className="cfpr-error-text">{errors.referral_slip_file}</span>}
                </div>

              </section>
            </div>

            {/* Fixed footer action bar */}
            <div className="cfpr-footer">
              <button type="button" className="cfpr-btn cfpr-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="cfpr-btn cfpr-btn-save" disabled={uploading}>
                {uploading ? "Uploading Image..." : "Create Record"}
              </button>
            </div>
          </form>
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
                <button type="button" className="dup-btn-cancel" onClick={() => { setDupModalOpen(false); setExistingRecord(null); }}>
                  Cancel (Go back)
                </button>
                <button type="button" className="dup-btn-skip" onClick={() => { setDupModalOpen(false); onClose(); }}>
                  Skip (Don't save)
                </button>
                <button type="button" className="dup-btn-overwrite" onClick={() => { setDupModalOpen(false); saveRecord(existingRecord.id); }}>
                  Overwrite Existing
                </button>
                <button type="button" className="dup-btn-save" onClick={() => { setDupModalOpen(false); saveRecord(); }}>
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