import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { ImageIcon, X } from "lucide-react";

function ClientEditModalReferred({ client, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ ...client });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(client.referral_slip_file || null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.5);
          
          setFormData(prev => ({ ...prev, referral_slip_file: compressedBase64 }));
          setImagePreview(compressedBase64);
          
          if (errors.referral_slip_file) {
            setErrors(prev => ({ ...prev, referral_slip_file: "" }));
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, referral_slip_file: "" });
    setImagePreview(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    let newErrors = {};
    let isValid = true;

    const fieldsToValidate = [
      "name", "address", "FP_method", "facility_name", "facility_address", 
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
                <input 
                  name="FP_method" 
                  value={formData.FP_method || ""} 
                  onChange={handleInputChange} 
                  className={errors.FP_method ? "input-error" : ""} 
                />
                {errors.FP_method && <span className="error-text">{errors.FP_method}</span>}
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
                    <button type="button" className="remove-img-btn" onClick={removeImage}>
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
            <button type="submit" className="btn-edit">Update Record</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientEditModalReferred;