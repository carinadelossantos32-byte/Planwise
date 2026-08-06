import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase-config";
import { ImageIcon, X } from "lucide-react";

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
      "name", "address", "fp_method", "facility_name", "facility_address", 
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
    <div className="modal-overlay-edit">
      <div className="modal">
        <div className="modal-header-edit">
          <h2>Edit Referral Record</h2>
        </div>

        {/* Form wraps both the scrollable body and fixed footer */}
        <form onSubmit={handleUpdate}>
          <div className="modal-body-edit">
            <div className="form-grid-edit">
              
              <div className="form-group-edit">
                <label>Client Name</label>
                <input 
                  name="name" 
                  value={formData.name || ""} 
                  onChange={handleInputChange} 
                  className={errors.name ? "input-error" : ""} 
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group-edit">
                <label>Address</label>
                <input 
                  name="address" 
                  value={formData.address || ""} 
                  onChange={handleInputChange} 
                  className={errors.address ? "input-error" : ""} 
                />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>

              <div className="form-group-edit">
                <label>FP Method</label>
                <select 
                  name="fp_method" 
                  value={formData.fp_method || ""} 
                  onChange={handleInputChange} 
                  className={errors.fp_method ? "input-error" : ""} 
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

              <div className="form-group-edit">
                <label>With Intention to Shift</label>
                <select 
                  name="with_intention_to_shift" 
                  value={formData.with_intention_to_shift || ""} 
                  onChange={handleInputChange}
                  className={errors.with_intention_to_shift ? "input-error" : ""}
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

              <div className="form-group-edit">
                <label>Health Service Facility</label>
                <input 
                  name="facility_name" 
                  value={formData.facility_name || ""} 
                  onChange={handleInputChange} 
                  className={errors.facility_name ? "input-error" : ""} 
                />
                {errors.facility_name && <span className="error-text">{errors.facility_name}</span>}
              </div>

              <div className="form-group-edit">
                <label>Facility Address</label>
                <input 
                  name="facility_address" 
                  value={formData.facility_address || ""} 
                  onChange={handleInputChange} 
                  className={errors.facility_address ? "input-error" : ""} 
                />
                {errors.facility_address && <span className="error-text">{errors.facility_address}</span>}
              </div>

              <div className="form-group-edit">
                <label>Referred By</label>
                <input 
                  name="referred_by" 
                  value={formData.referred_by || ""} 
                  onChange={handleInputChange} 
                  className={errors.referred_by ? "input-error" : ""} 
                />
                {errors.referred_by && <span className="error-text">{errors.referred_by}</span>}
              </div>

              <div className="form-group-edit">
                <label>Volunteer Contact No.</label>
                <input 
                  name="volunteer_contact" 
                  value={formData.volunteer_contact || ""} 
                  onChange={handleInputChange} 
                  className={errors.volunteer_contact ? "input-error" : ""} 
                />
                {errors.volunteer_contact && <span className="error-text">{errors.volunteer_contact}</span>}
              </div>

              <div className="form-group-edit">
                <label>Date</label>
                <input 
                  type="date" 
                  name="date" 
                  value={formData.date || ""} 
                  onChange={handleInputChange} 
                  className={errors.date ? "input-error" : ""} 
                />
                {errors.date && <span className="error-text">{errors.date}</span>}
              </div>

              <div className="form-group-edit">
                <label>Referral Slip Picture</label>
                {!imagePreview ? (
                  <div className={`file-upload-box ${errors.referral_slip_file ? "input-error" : ""}`}>
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
                {errors.referral_slip_file && <span className="error-text">{errors.referral_slip_file}</span>}
              </div>

            </div>
          </div>

          <div className="modal-btn-edit">
            <button type="button" className="btn-cancel-cr" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-edit" disabled={uploading}>
              {uploading ? "Uploading Image..." : "Update Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientEditModalReferred;