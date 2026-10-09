import ReportSelect from "../ReportSelect/ReportSelect";
import { notify } from "../../utils/notify";
import { checkAddressBarangay } from "../../utils/geoHelper";
import { useState } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase-config";
import { findDuplicate } from "../../utils/checkDuplicates";
import "../ClientAddModal/client-add-modal.css";
import "./referral-slip.css";
import { ImageIcon, X } from "lucide-react";

function ClientAddModalReferred({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    barangay: "",
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
      const fileRef = ref(storage, `referral_slips/${Date.now()}_${file.name}`);

      const snapshot = await uploadBytes(fileRef, file);

      const downloadURL = await getDownloadURL(snapshot.ref);

      setFormData(prev => ({ ...prev, referral_slip_file: downloadURL }));
      if (errors.referral_slip_file) setErrors(prev => ({ ...prev, referral_slip_file: "" }));
    } catch (err) {
      console.error("Firebase Storage Upload Error:", err);
      notify("Failed to upload referral slip picture. Please try again.");
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

    const location = checkAddressBarangay(formData.address, formData.barangay);
    if (!location.ok) {
      setErrors({ address: location.message, barangay: location.message });
      notify(location.message);
      return;
    }

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
      notify("Error checking for duplicates: " + err.message);
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
    { label: "Barangay", key: "barangay" },
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
                    <label className="cfpr-label">Barangay</label>
                    <input
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleInputChange}
                      placeholder="Barangay"
                      className={`cfpr-input ${errors.barangay ? "cfpr-input-error" : ""}`}
                    />
                    {errors.barangay && <span className="cfpr-error-text">{errors.barangay}</span>}
                  </div>
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">FP Method</label>
                    <ReportSelect
                      className="form-select"
                      name="fp_method"
                      ariaLabel="fp method"
                      value={formData.fp_method || ""}
                      onChange={handleInputChange}
                      placeholder="Select FP Method"
                      hasError={Boolean(errors.fp_method)}
                      options={[
                        { value: "", label: "Select" },
                        { value: "Condom", label: "Condom" },
                        { value: "IUD", label: "IUD" },
                        { value: "Pills", label: "Pills" },
                        { value: "Injectable", label: "Injectable" },
                        { value: "Vasectomy", label: "Vasectomy" },
                        { value: "Tubal Ligation", label: "Tubal Ligation" },
                        { value: "Implant", label: "Implant" },
                        { value: "CMM/Billings", label: "CMM/Billings" },
                        { value: "BBT", label: "BBT" },
                        { value: "Symptothermal", label: "Symptothermal" },
                        { value: "SDM", label: "SDM" },
                        { value: "LAM", label: "LAM" },
                      ]}
                    />
                    {errors.fp_method && <span className="cfpr-error-text">{errors.fp_method}</span>}
                  </div>
                </div>

                <div className="cfpr-paired-cols">
                  <div className="cfpr-group-2">
                    <label className="cfpr-label">With Intention to Shift</label>
                    <ReportSelect
                      className="form-select"
                      name="with_intention_to_shift"
                      ariaLabel="with intention to shift"
                      value={formData.with_intention_to_shift}
                      onChange={handleInputChange}
                      hasError={Boolean(errors.with_intention_to_shift)}
                      options={[
                        { value: "", label: "Select" },
                        { value: "No Intention", label: "No Intention" },
                        { value: "Condom", label: "Condom" },
                        { value: "IUD", label: "IUD" },
                        { value: "Pills", label: "Pills" },
                        { value: "Injectable", label: "Injectable" },
                        { value: "Vasectomy", label: "Vasectomy" },
                        { value: "Tubal Ligation", label: "Tubal Ligation" },
                        { value: "Implant", label: "Implant" },
                        { value: "CMM/Billings", label: "CMM/Billings" },
                        { value: "BBT", label: "BBT" },
                        { value: "Symptothermal", label: "Symptothermal" },
                        { value: "SDM", label: "SDM" },
                        { value: "LAM", label: "LAM" },
                      ]}
                    />
                    {errors.with_intention_to_shift && <span className="cfpr-error-text">{errors.with_intention_to_shift}</span>}
                  </div>
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
                </div>

                <div className="cfpr-paired-cols">
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
                </div>

                <div className="cfpr-paired-cols">
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
        </div >
      </div >

      {/* DUPLICATE MODAL */}
      {
        dupModalOpen && existingRecord && (
          <div className="cfpr-dup-overlay">
            <div className="cfpr-dup-modal">
              <div className="cfpr-dup-header">
                <h2 className="cfpr-dup-title">⚠ Duplicate Record Found</h2>
              </div>
              <div className="cfpr-dup-body">
                <p className="cfpr-dup-subtitle">
                  A record with the same name and address already exists. Review the differences and choose how to proceed.
                </p>
                <div className="cfpr-dup-grid">
                  <div className="cfpr-dup-col">
                    <div className="cfpr-dup-col-header cfpr-dup-col-header-new">
                      ⬆ New Entry (yours)
                    </div>
                    {comparisonFields.map(({ label, key }) => (
                      <div key={key} className={`cfpr-dup-row ${formData[key] !== existingRecord[key] ? "cfpr-dup-row-diff" : ""}`}>
                        <span className="cfpr-dup-row-label">{label}</span>
                        <span>{formData[key] || "—"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cfpr-dup-col">
                    <div className="cfpr-dup-col-header cfpr-dup-col-header-existing">
                      📁 Existing (in database)
                    </div>
                    {comparisonFields.map(({ label, key }) => (
                      <div key={key} className={`cfpr-dup-row ${formData[key] !== existingRecord[key] ? "cfpr-dup-row-diff" : ""}`}>
                        <span className="cfpr-dup-row-label">{label}</span>
                        <span>{existingRecord[key] || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="cfpr-dup-legend">🟡 Highlighted fields have different values.</p>
                <div className="cfpr-dup-actions">
                  <button type="button" className="cfpr-dup-btn cfpr-dup-btn-cancel" onClick={() => { setDupModalOpen(false); setExistingRecord(null); }}>
                    Cancel (Go back)
                  </button>
                  <button type="button" className="cfpr-dup-btn cfpr-dup-btn-skip" onClick={() => { setDupModalOpen(false); onClose(); }}>
                    Skip (Don't save)
                  </button>
                  <button type="button" className="cfpr-dup-btn cfpr-dup-btn-overwrite" onClick={() => { setDupModalOpen(false); saveRecord(existingRecord.id); }}>
                    Overwrite Existing
                  </button>
                  <button type="button" className="cfpr-dup-btn cfpr-dup-btn-save" onClick={() => { setDupModalOpen(false); saveRecord(); }}>
                    Save as New
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}

export default ClientAddModalReferred;