import React from 'react';
import './map-pop-up.css'; 

export default function MapPopUp({ family, onClose }) {
  if (!family) return null;
  
  const fpMethod = family.fp_method || family.fpMethod || family.type || "No Method";
  const methodCleaned = fpMethod.toString().toLowerCase().trim();
  
  const isModern = ['pills', 'condom', 'injectable', 'implant', 'iud', 'vasectomy', 'tubal ligation', 'btl', 'modern'].some(m => methodCleaned.includes(m));
  const isTraditional = ['withdrawal', 'rhythm', 'calendar', 'abstinence', 'herbal', 'traditional'].some(m => methodCleaned.includes(m));
      
  return (
    <div className="modal-overlay" onClick={onClose} title="Close">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Submission Record</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <table className="summary-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Type</th>
                <th style={{ width: '45%' }}>Question</th>
                <th style={{ width: '45%' }}>Response</th>
              </tr>
            </thead>
            
            <tbody>

              {/* SECTION 1: ADDRESS */}
              <tr className="section-title-row">
                <td colSpan="3">ADDRESS</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-font"></i></td>
                <td>Full Address</td>
                <td className="response-text">{family.address || family.fullAddress || "N/A"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Barangay</td>
                <td className="response-text">{family.barangay || "N/A"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-location-crosshairs"></i></td>
                <td>Longitude</td>
                <td className="response-text">{family.lng ?? family.longitude ?? "—"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-location-crosshairs"></i></td>
                <td>Latitude</td>
                <td className="response-text">{family.lat ?? family.latitude ?? "—"}</td>
              </tr>

              {/* SECTION 2: RESPONDENT */}
              <tr className="section-title-row">
                <td colSpan="3">RESPONDENT</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-font"></i></td>
                <td>Name of Male Partner</td>
                <td className="response-text">{family.maleName || family.name || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-font"></i></td>
                <td>Name of Female Partner</td>
                <td className="response-text">{family.femaleName || family.spouse_name || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-calendar"></i></td>
                <td>Birthdate of Male Partner</td>
                <td className="response-text">{family.maleBirthdate || family.birthdate_male || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-calendar"></i></td>
                <td>Birthdate of Female Partner</td>
                <td className="response-text">{family.femaleBirthdate || family.birthdate_female || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Highest Educational Attainment of Male Partner</td>
                <td className="response-text">{family.educationMale || family.maleEducation || family.educational_attainment_male || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Highest Educational Attainment of Female Partner</td>
                <td className="response-text">{family.educationFemale || family.femaleEducation || family.educational_attainment_female || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Civil Status of Male Partner</td>
                <td className="response-text">{family.civilStatusMale || family.maleCivilStatus || family.civil_status_male || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Civil Status of Female Partner</td>
                <td className="response-text">{family.civilStatusFemale || family.femaleCivilStatus || family.civil_status_female || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-1"></i></td>
                <td>No. of Children</td>
                <td className="response-text">{family.noOfChildren ?? family.numberOfChildren ?? family.no_of_children ?? "Unknown"}</td>
              </tr>

              {/* SECTION 3: METHOD STATUS */}
              <tr className="section-title-row">
                <td colSpan="3">FAMILY PLANNING STATUS</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Type of FP Method</td>
                <td className="response-text">{fpMethod}</td>
              </tr>

              {isModern && (
                <>
                  <tr className="section-title-row modern-section">
                    <td colSpan="3">MODERN FP METHOD TRACKING</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Method Used</td>
                    <td className="response-text">{family.methodUsed || fpMethod}</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Intention to Shift Methods</td>
                    <td className="response-text">{family.intentionToShift || family.intention_to_shift || "None"}</td>
                  </tr>
                </>
              )}

              {isTraditional && (
                <>
                  <tr className="section-title-row traditional-section">
                    <td colSpan="3">TRADITIONAL FP METHOD TRACKING</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Type</td>
                    <td className="response-text">{family.traditionalType || fpMethod}</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Status</td>
                    <td className="response-text">{family.traditionalStatus || family.status || "Unknown"}</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Reason</td>
                    <td className="response-text">{family.traditionalReason || family.reason || "Unknown"}</td>
                  </tr>
                </>
              )}

              <tr className="section-title-row">
                <td colSpan="3">SIGNATURE</td>
              </tr>
              <tr>
                <td colSpan="3" id="signature">
                  {family.signatureUrl ? (
                    <img src={family.signatureUrl} alt="Signature" style={{ maxHeight: '60px' }} />
                  ) : (
                    "Signature Verified"
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}