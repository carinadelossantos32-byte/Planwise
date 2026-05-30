import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import '../ClientEditModal/client-edit-modal.css';

function ClientEditModalPrivate({ client, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ ...client });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
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
        <div className="modal-body-edit">
          <h3>Ensure all modified fields are correct and complete to maintain data integrity</h3>
          
          <form className="form-grid-edit" onSubmit={handleUpdate}>
            <div className="form-group-edit">
              <label>Client Name</label>
              <input name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="form-group-edit">
              <label>Age</label>
              <input type="number" name="age" value={formData.age} onChange={handleInputChange} min="0" />
            </div>
            <div className="form-group-edit">
              <label>Birthdate</label>
              <input type="date" name="birthdate" value={formData.birthdate || ""} onChange={handleInputChange} />
            </div>
            <div className="form-group-edit">
              <label>Address</label>
              <input name="address" value={formData.address} onChange={handleInputChange} />
            </div>
            <div className="form-group-edit">
              <label>Method Used</label>
              <select name="fp_method" value={formData.fp_method} onChange={handleInputChange}>
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
            </div>
            <div className="form-group-edit">
              <label>FP Issued By</label>
              <input name="fp_issued_by" value={formData.fp_issued_by} onChange={handleInputChange} placeholder="Clinic, Hospital, Lying-In" />
            </div>

            <div className="modal-btn-edit" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "15px" }}>
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-edit">Update Record</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ClientEditModalPrivate;