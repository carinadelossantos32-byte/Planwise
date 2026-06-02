import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import "../ClientAddModal/client-add-modal.css"; 

function ClientAddModalPrivate({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    birthdate: "", 
    address: "",
    fp_method: "",
    fp_issued_by: "" 
  });

  const [errors, setErrors] = useState({});

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

    Object.keys(formData).forEach((key) => {
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
      await addDoc(collection(db, "clients_private"), {
        ...formData,
        is_archived: false,
        created_at: serverTimestamp()
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding private client:", error);
    }
  };

  return (
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
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                placeholder="Client Name" 
                className={errors.name ? "input-error" : ""}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Age</label>
              <input 
                type="number" 
                name="age" 
                value={formData.age} 
                onChange={handleInputChange} 
                placeholder="Age" 
                min="0" 
                className={errors.age ? "input-error" : ""}
              />
              {errors.age && <span className="error-text">{errors.age}</span>}
            </div>

            <div className="form-group">
              <label>Birthdate</label>
              <input 
                type="date" 
                name="birthdate" 
                value={formData.birthdate} 
                onChange={handleInputChange} 
                className={errors.birthdate ? "input-error" : ""}
              />
              {errors.birthdate && <span className="error-text">{errors.birthdate}</span>}
            </div>

            <div className="form-group">
              <label>Address</label>
              <input 
                name="address" 
                value={formData.address} 
                onChange={handleInputChange} 
                placeholder="Address" 
                className={errors.address ? "input-error" : ""}
              />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>

            <div className="form-group">
              <label>Method Used</label>
              <select 
                name="fp_method" 
                value={formData.fp_method} 
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

            <div className="form-group">
              <label>FP Issued By</label>
              <input 
                name="fp_issued_by" 
                value={formData.fp_issued_by} 
                onChange={handleInputChange} 
                placeholder="Clinic, Hospital, Lying-In" 
                className={errors.fp_issued_by ? "input-error" : ""}
              />
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
  );
}

export default ClientAddModalPrivate;