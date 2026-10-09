import ReportSelect from "../ReportSelect/ReportSelect";
import { notify } from "../../utils/notify";
import { useState } from "react";
import { checkAddressBarangay } from "../../utils/geoHelper";
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
      "name", "age", "birthdate", "address", "barangay", "fp_method", "fp_issued_by"
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

    const location = checkAddressBarangay(formData.address, formData.barangay);
    if (!location.ok) {
      setErrors({ address: location.message, barangay: location.message });
      notify(location.message);
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
    <div className="efpr-overlay">
      <div className="efpr-modal" id="efpr-modal-root" role="dialog" aria-labelledby="efpr-title">
        <div className="efpr-header">
          <h2 id="efpr-title" className="efpr-title">Edit Private Client</h2>
          <p className="efpr-subtitle">Ensure all modified fields are correct and complete to maintain data integrity</p>
        </div>

        <form onSubmit={handleUpdate} className="efpr-form">
          <div className="efpr-body">

            <section className="efpr-section">
              <h3 className="efpr-section-title">Private Client Information</h3>

              <div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">Client Name</span>
                  <input
                    name="name"
                    value={formData.name || ""}
                    onChange={handleInputChange}
                    className={`efpr-input   ${errors.name ? "efpr-input-error" : ""}`}
                  />
                  {errors.name && <span className="efpr-error-text">{errors.name}</span>}
                </div>
                <div className="efpr-group">
                  <span className="efpr-paired-label">Age</span>
                  <input
                    type="number"
                    name="age"
                    value={formData.age !== undefined ? formData.age : ""}
                    onChange={handleInputChange}
                    min="0"
                    className={`efpr-input ${errors.age ? "efpr-input-error" : ""}`}
                  />
                  {errors.age && <span className="efpr-error-text">{errors.age}</span>}
                </div>
              </div>

              <div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">Birthdate</span>
                  <input
                    type="date"
                    name="birthdate"
                    value={formData.birthdate || ""}
                    onChange={handleInputChange}
                    className={`efpr-input ${errors.birthdate ? "efpr-input-error" : ""}`}
                  />
                  {errors.birthdate && <span className="efpr-error-text">{errors.birthdate}</span>}

                </div>

                <div className="efpr-group">
                  <span className="efpr-paired-label">Address</span>
                  <input
                    name="address"
                    value={formData.address || ""}
                    onChange={handleInputChange}
                    className={`efpr-input ${errors.address ? "efpr-input-error" : ""}`}
                  />
                  {errors.address && <span className="efpr-error-text">{errors.address}</span>}
                </div>
</div>
<div className="efpr-paired-cols">
                <div className="efpr-group">
                  <span className="efpr-paired-label">Barangay</span>
                  <input
                    name="barangay"
                    value={formData.barangay || ""}
                    onChange={handleInputChange}
                    className={`efpr-input ${errors.barangay ? "efpr-input-error" : ""}`}
                  />
                  {errors.barangay && <span className="efpr-error-text">{errors.barangay}</span>}
                </div>
              

              
                <div className="efpr-group">
                  <span className="efpr-paired-label">Method Used</span>
                  <ReportSelect
                    className="form-select"
                    name="fp_method"
                    ariaLabel="fp method"
                    value={formData.fp_method || ""}
                    onChange={handleInputChange}
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
                  {errors.fp_method && <span className="efpr-error-text">{errors.fp_method}</span>}
                </div>
                </div>
                <div className="efpr-group">
                  <span className="efpr-paired-label">FP Issued By</span>
                  <input
                    name="fp_issued_by"
                    value={formData.fp_issued_by || ""}
                    onChange={handleInputChange}
                    placeholder="Clinic, Hospital, Lying-In"
                    className={`efpr-input ${errors.fp_issued_by ? "efpr-input-error" : ""}`}
                  />
                  {errors.fp_issued_by && <span className="efpr-error-text">{errors.fp_issued_by}</span>}
                </div>

              
            </section>
          </div>


          <div className="efpr-footer">
            <button type="button" className="efpr-btn efpr-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="efpr-btn efpr-btn-save">Update Record</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientEditModalPrivate;