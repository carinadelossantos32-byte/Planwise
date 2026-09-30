import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase-config";
import { ImageIcon, X } from "lucide-react";
import '../ClientEditModal/client-edit-modal.css';


function ClientEditModalReferred({ client, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ ...client });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(client.referral_slip_file || null);
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show temporary local preview while uploading to Firebase Storage
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setUploading(true);

    try {
      // 1. Create a reference in Firebase Storage
      const fileRef = ref(storage, `referral_slips/${Date.now()}_${file.name}`);

      // 2. Upload file bytes
      const snapshot = await uploadBytes(fileRef, file);

      // 3. Get public HTTPS download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 4. Save URL into form state
      setFormData((prev) => ({ ...prev, referral_slip_file: downloadURL }));
      if (errors.referral_slip_file) {
        setErrors((prev) => ({ ...prev, referral_slip_file: "" }));
      }
    } catch (err) {
      console.error("Firebase Storage Upload Error:", err);
      alert("Failed to upload new referral slip picture. Please try again.");
      removeImage();
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, referral_slip_file: "" }));
    setImagePreview(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (uploading) return; // Prevent submitting while image upload is running

    let newErrors = {};
    let isValid = true;

    const fieldsToValidate = [
      "name", "address", "barangay", "fp_method", "facility_name", "facility_address",
      "referred_by", "volunteer_contact", "date", "referral_slip_file"
    ];

    fieldsToValidate.forEach((key) => {
      if (formData[key] === undefined || formData[key] === null || String(formData[key]).trim() === "") {
        newErrors[key] = "This field is required";
        isValid = false;
      }
    });

    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    try {
      const docRef = doc(db, "clients_referred", client.id);
      const { id, created_at, ...updateData } = formData;

      await updateDoc(docRef, {
        ...updateData,
        updated_at: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating referral record:", error);
    }
  };

  return (
    <div className="efpr-overlay">
      <div className="efpr-modal" id="efpr-modal-root" role="dialog" aria-labelledby="efpr-title">
        <div className="efpr-header">
          <h2 id="efpr-title">Edit Referral Record</h2>
          <p className="efpr-subtitle">Ensure all modified fields are correct and complete to maintain data integrity</p>
        </div>

        {/* Form wraps both the scrollable body and fixed footer */}
        <form onSubmit={handleUpdate} className="efpr-form">
          <div className="efpr-body">
            <section className="efpr-section">
              <h3 className="efpr-section-title">Referred & Served Information</h3>

              <div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">Client Name</span>
                  <input
                    name="name"
                    value={formData.name || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.name ? "efpr-input-error" : ""}`}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
                <div className="efpr-group">
                  <span className="efpr-paired-label">Address</span>
                  <input
                    name="address"
                    value={formData.address || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.address ? "efpr-input-error" : ""}`}
                  />
                  {errors.address && <span className="error-text">{errors.address}</span>}
                </div>
              </div>
              
              <div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">Barangay</span>
                  <input
                    name="barangay"
                    value={formData.barangay || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.barangay ? "efpr-input-error" : ""}`}
                  />
                  {errors.barangay && <span className="error-text">{errors.barangay}</span>}
                </div>
                <div className="efpr-group">
                  <span className="efpr-paired-label">FP Method</span>
                  <select
                    name="fp_method"
                    value={formData.fp_method || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.fp_method ? "efpr-select-error" : ""}`}
                  >
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
              </div>

              <div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">With Intention to Shift</span>
                  <select
                    name="with_intention_to_shift"
                    value={formData.with_intention_to_shift || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.with_intention_to_shift ? "efpr-select-error" : ""}`}
                  >
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
                  {errors.with_intention_to_shift && <span className="error-text">{errors.with_intention_to_shift}</span>}
                </div>
                <div className="efpr-group">
                  <span className="efpr-paired-label">Health Service Facility</span>
                  <input
                    name="facility_name"
                    value={formData.facility_name || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.facility_name ? "efpr-input-error" : ""}`}
                  />
                  {errors.facility_name && <span className="efpr-error-text">{errors.facility_name}</span>}
                </div>
              </div>

              <div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">Facility Address</span>
                  <input
                    name="facility_address"
                    value={formData.facility_address || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.facility_address ? "efpr-input-error" : ""}`}
                  />
                  {errors.facility_address && <span className="efpr-error-text">{errors.facility_address}</span>}
                </div>
                <div className="efpr-group">
                  <span className="efpr-paired-label">Referred By</span>
                  <input
                    name="referred_by"
                    value={formData.referred_by || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.referred_by ? "efpr-input-error" : ""}`}
                  />
                  {errors.referred_by && <span className="efpr-error-text">{errors.referred_by}</span>}
                </div>
              </div>

              <div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">Volunteer Contact No.</span>
                  <input
                    name="volunteer_contact"
                    value={formData.volunteer_contact || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.volunteer_contact ? "efpr-input-error" : ""}`}
                  />
                  {errors.volunteer_contact && <span className="efpr-error-text">{errors.volunteer_contact}</span>}
                </div>
                <div className="efpr-group">
                  <span className="efpr-paired-label">Date</span>
                  <input
                    type="date"
                    name="date"
                    value={formData.date || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.date ? "efpr-input-error" : ""}`}
                  />
                  {errors.date && <span className="efpr-error-text">{errors.date}</span>}
                </div>
              </div>

              <div className="efpr-group">
                <span className="efpr-paired-label">Referral Slip Picture</span>
                {!imagePreview ? (
                  <div className={`file-upload-box ${errors.referral_slip_file ? "efpr-input-error" : ""}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      id="slip-edit-upload"
                      hidden
                    />
                    <label htmlFor="slip-edit-upload" className="upload-label">
                      <ImageIcon size={20} />
                      <span>Upload New Picture</span>
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
                {errors.referral_slip_file && <span className="efpr-error-text">{errors.referral_slip_file}</span>}
              </div>

            </section>
          </div>

          <div className="efpr-footer">
            <button type="button" className="efpr-btn efpr-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="efpr-btn efpr-btn-save" disabled={uploading}>
              {uploading ? "Uploading Image..." : "Update Record"}
            </button>
          </div>
        </form>
      </div >
    </div >
  );
}

export default ClientEditModalReferred;