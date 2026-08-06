import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import '../ClientEditModal/client-edit-modal.css';

function ClientEditModalPrivate({ client, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ ...client });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    let newErrors = {};
    let isValid = true;

    const fieldsToValidate = [
      "name", "age", "birthdate", "address", "fp_method", "fp_issued_by"
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
      const docRef = doc(db, "clients_private", client.id);
      
      const { id, created_at, ...updateData } = formData;

      await updateDoc(docRef, {
        ...updateData,
        updated_at: serverTimestamp()
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating private client:", error);
    }
  };

return (
    <div className="modal-overlay-edit">
      <div className="modal">
        <div className="modal-header-edit">
          <h2>Edit Private Client</h2>
        </div>

        {/* Form wraps both the scrollable body and fixed footer */}
        <form onSubmit={handleUpdate}>
          <div className="modal-body-edit">
            <h3>Ensure all modified fields are correct and complete to maintain data integrity</h3>
            
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
                <label>Age</label>
                <input 
                  type="number" 
                  name="age" 
                  value={formData.age !== undefined ? formData.age : ""} 
                  onChange={handleInputChange} 
                  min="0" 
                  className={errors.age ? "input-error" : ""} 
                />
                {errors.age && <span className="error-text">{errors.age}</span>}
              </div>
              
              <div className="form-group-edit">
                <label>Birthdate</label>
                <input 
                  type="date" 
                  name="birthdate" 
                  value={formData.birthdate || ""} 
                  onChange={handleInputChange} 
                  className={errors.birthdate ? "input-error" : ""} 
                />
                {errors.birthdate && <span className="error-text">{errors.birthdate}</span>}
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
                <label>Method Used</label>
                <select 
                  name="fp_method" 
                  value={formData.fp_method || ""} 
                  onChange={handleInputChange}
                  className={errors.fp_method ? "input-error" : ""} 
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
                {errors.fp_method && <span className="error-text">{errors.fp_method}</span>}
              </div>
              
              <div className="form-group-edit">
                <label>FP Issued By</label>
                <input 
                  name="fp_issued_by" 
                  value={formData.fp_issued_by || ""} 
                  onChange={handleInputChange} 
                  placeholder="Clinic, Hospital, Lying-In" 
                  className={errors.fp_issued_by ? "input-error" : ""} 
                />
                {errors.fp_issued_by && <span className="error-text">{errors.fp_issued_by}</span>}
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

export default ClientEditModalPrivate;