import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import "./client-add-modal.css"; 

function ClientAddModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    spouse_name: "",
    birthdate_male: "",
    birthdate_female: "",
    educational_attainment_male: "",
    educational_attainment_female: "",
    civil_status: "",
    address: "",
    barangay: "",
    no_of_children: "",
    fp_method: "",
    intention_to_shift: "",
    type: "",
    status: "",
    reason: ""
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "clients_public"), {
        ...formData,
        is_archived: false,
        created_at: serverTimestamp()
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding public client:", error);
    }
  };

  return (
    <div className="modal-overlay-add">
      <div className="modal">
        <div className="modal-header">
          <h2>Create New Public Record</h2>
        </div>

        <div className="modal-body">
          <h3>Please verify that all entries are correct and no fields remain empty for secure processing.</h3>
          
          <form className="form-grid" onSubmit={handleAdd}>
            <div className="form-group">
              <label>Male Partner</label>
              <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Male Partner" required />
            </div>
            <div className="form-group">
              <label>Female Partner</label>
              <input name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} placeholder="Female Partner" />
            </div>
            <div className="form-group">
              <label>Birthdate Male</label>
              <input type="date" name="birthdate_male" value={formData.birthdate_male} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Birthdate Female</label>
              <input type="date" name="birthdate_female" value={formData.birthdate_female} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Educational Attainment Male</label>
              <select name="educational_attainment_male" value={formData.educational_attainment_male} onChange={handleInputChange}>
                <option value="">Select</option>
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
            <div className="form-group">
              <label>Educational Attainment Female</label>
              <select name="educational_attainment_female" value={formData.educational_attainment_female} onChange={handleInputChange}>
                <option value="">Select</option>
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
            <div className="form-group">
              <label>Civil Status</label>
              <select name="civil_status" value={formData.civil_status} onChange={handleInputChange}>
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Live-In">Live-In</option>
              </select>
            </div>
            <div className="form-group">
              <label>Address</label>
              <input name="address" value={formData.address} onChange={handleInputChange} placeholder="Address" />
            </div>
            <div className="form-group">
              <label>Barangay</label>
              <input name="barangay" value={formData.barangay} onChange={handleInputChange} placeholder="Barangay" />
            </div>
            <div className="form-group">
              <label>No. of Children</label>
              <input type="number" name="no_of_children" value={formData.no_of_children} onChange={handleInputChange} min="0" />
            </div>
            <div className="form-group">
              <label>Method Used</label>
              <select name="fp_method" value={formData.fp_method} onChange={handleInputChange}>
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
            </div>
            <div className="form-group">
              <label>Intention to Shift</label>
              <select name="intention_to_shift" value={formData.intention_to_shift} onChange={handleInputChange}>
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
            </div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="">Select</option>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Rhythm">Rhythm</option>
                <option value="Calendar">Calendar</option>
                <option value="Abstinence">Abstinence</option>
                <option value="Herbal">Herbal</option>
                <option value="No Method">No Method</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="">Select</option>
                <option value="Expressing Intention to Use Modern FP">Expressing Intention to Use Modern FP</option>
                <option value="Undecided">Undecided</option>
                <option value="Currently Pregnant">Currently Pregnant</option>
                <option value="No Intention to Use">No Intention to Use</option>
              </select>
            </div>
            <div className="form-group">
              <label>Reason</label>
              <select name="reason" value={formData.reason} onChange={handleInputChange}>
                <option value="">Select</option>
                <option value="Spacing">Spacing</option>
                <option value="Limiting">Limiting</option>
                <option value="Achieving">Achieving</option>
              </select>
            </div>
            
            {/* Action Buttons inside the form */}
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

export default ClientAddModal;