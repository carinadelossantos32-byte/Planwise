import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import './client-edit-modal.css';

function ClientEditModal({ client, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ ...client });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(db, "clients_public", client.id);
      
      const { id, created_at, ...updateData } = formData;

      await updateDoc(docRef, {
        ...updateData,
        updated_at: serverTimestamp()
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating public client:", error);
    }
  };

  return (
    <div className="modal-overlay-edit">
      <div className="modal">
        <div className="modal-header-edit">
          <h2>Edit Public Client</h2>
        </div>
        <div className="modal-body-edit">
          <h3>Ensure all modified fields are correct and complete to maintain data integrity</h3>
          
          <form className="form-grid-edit" onSubmit={handleUpdate}>
            <div className="form-group-edit">
              <label>Male Partner</label>
              <input name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="form-group-edit">
              <label>Female Partner</label>
              <input name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} />
            </div>
            <div className="form-group-edit">
              <label>Birthdate Male</label>
              <input type="date" name="birthdate_male" value={formData.birthdate_male} onChange={handleInputChange} />
            </div>
            <div className="form-group-edit">
              <label>Birthdate Female</label>
              <input type="date" name="birthdate_female" value={formData.birthdate_female} onChange={handleInputChange} />
            </div>
            <div className="form-group-edit">
              <label>Educational Attainment Male</label>
              <select name="educational_attainment_male" value={formData.educational_attainment_male} onChange={handleInputChange}>
                <option value="No Education">No Education</option>
                <option value="Elementary Level">Elementary Level</option>
                <option value="Elementary Graduate">Elementary Graduate</option>
                <option value="High School Level">High School Level</option>
                <option value="High School Graduate">High School Graduate</option>
                <option value="Vocational">Vocational</option>
                <option value="College Level">College Level</option>
                <option value="College Graduate">College Graduate</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>
            <div className="form-group-edit">
              <label>Educational Attainment Female</label>
              <select name="educational_attainment_female" value={formData.educational_attainment_female} onChange={handleInputChange}>
                <option value="No Education">No Education</option>
                <option value="Elementary Level">Elementary Level</option>
                <option value="Elementary Graduate">Elementary Graduate</option>
                <option value="High School Level">High School Level</option>
                <option value="High School Graduate">High School Graduate</option>
                <option value="Vocational">Vocational</option>
                <option value="College Level">College Level</option>
                <option value="College Graduate">College Graduate</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>
            <div className="form-group-edit">
              <label>Civil Status</label>
              <select name="civil_status" value={formData.civil_status} onChange={handleInputChange}>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Live-In">Live-In</option>
              </select>
            </div>
            
            <div className="form-group-edit">
              <label>Address</label>
              <input name="address" value={formData.address} onChange={handleInputChange} />
            </div>
            <div className="form-group-edit">
              <label>Barangay</label>
              <input name="barangay" value={formData.barangay} onChange={handleInputChange} />
            </div>
            
            <div className="form-group-edit">
              <label>No. of Children</label>
              <input type="number" name="no_of_children" value={formData.no_of_children} onChange={handleInputChange} min="0" />
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
              <label>Intention to Shift</label>
              <select name="intention_to_shift" value={formData.intention_to_shift} onChange={handleInputChange}>
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
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Rhythm">Rhythm</option>
                <option value="Calendar">Calendar</option>
                <option value="Abstinence">Abstinence</option>
                <option value="Herbal">Herbal</option>
                <option value="No Method">No Method</option>
              </select>
            </div>
            <div className="form-group-edit">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="Expressing Intention to Use Modern FP">Expressing Intention to Use Modern FP</option>
                <option value="Undecided">Undecided</option>
                <option value="Currently Pregnant">Currently Pregnant</option>
                <option value="No Intention to Use">No Intention to Use</option>
              </select>
            </div>
            <div className="form-group-edit">
              <label>Reason</label>
              <select name="reason" value={formData.reason} onChange={handleInputChange}>
                <option value="Spacing">Spacing</option>
                <option value="Limiting">Limiting</option>
                <option value="Achieving">Achieving</option>
              </select>
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
export default ClientEditModal;