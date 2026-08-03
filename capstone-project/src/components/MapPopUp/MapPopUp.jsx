import React from 'react';
import './map-pop-up.css'; // We will style this below

export default function MapPopUp({ family, onClose }) {
  // If no family is selected, don't render anything
  if (!family) return null;
  
  const methodCleaned = family.fpMethod?.toLowerCase().trim() || "";
  const isModern = methodCleaned === 'modern';
  const isTraditional = methodCleaned === 'traditional';
      
  return (
    <div className="modal-overlay" onClick={onClose} title="Close">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Submission Record</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Modal Body styled as a structured table form */}
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
                <td className="response-text">{family.fullAddress || "N/A"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Barangay</td>
                <td className="response-text">{family.barangay || "N/A"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-location-crosshairs"></i></td>
                <td>Longitude</td>
                <td className="response-text">{family.lng || "—"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-location-crosshairs"></i></td>
                <td>Latitude</td>
                <td className="response-text">{family.lat || "—"}</td>
              </tr>

              {/* SECTION 3: RESPONDENT */}
              <tr className="section-title-row">
                <td colSpan="3">RESPONDENT</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-font"></i></td>
                <td>Name of Male Partner</td>
                <td className="response-text">{family.maleName || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-font"></i></td>
                <td>Name of Female Partner</td>
                <td className="response-text">{family.femaleName || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-calendar"></i></td>
                <td>Birthdate of Male Partner</td>
                <td className="response-text">{family.maleBirthdate || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-calendar"></i></td>
                <td>Birthdate of Female Partner</td>
                <td className="response-text">{family.femaleBirthdate || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Highest Educational Attainment of Male Partner</td>
                <td className="response-text">{family.maleEducation || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Highest Educational Attainment of Female Partner</td>
                <td className="response-text">{family.femaleEducation || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Civil Status of Male Partner</td>
                <td className="response-text">{family.maleCivilStatus || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Civil Status of Female Partner</td>
                <td className="response-text">{family.femaleCivilStatus || "Unknown"}</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-solid fa-1"></i></td>
                <td>No. of Children</td>
                <td className="response-text">{family.numberOfChildren || "Unknown"}</td>
              </tr>

              {/* SECTION 1: METHOD STATUS */}
              <tr className="section-title-row">
                <td colSpan="3">FAMILY PLANNING STATUS</td>
              </tr>
              <tr>
                <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                <td>Type of FP Method</td>
                <td className="response-text">{family.fpMethod || "No Method"}</td>
              </tr>

                {isModern && (
                <>
                  <tr className="section-title-row modern-section">
                    <td colSpan="3">MODERN FP METHOD TRACKING</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Method Used</td>
                    <td className="response-text">{family.methodUsed || "Unknown"}</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Intention to Shift Methods</td>
                    <td className="response-text">{family.intentionToShift || "Unknown"}</td>
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
                    <td className="response-text">{family.traditionalType || "Unknown"}</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Status</td>
                    <td className="response-text">{family.traditionalStatus || "Unknown"}</td>
                  </tr>
                  <tr>
                    <td className="center-icon"><i className="fa-regular fa-circle-dot"></i></td>
                    <td>Reason</td>
                    <td className="response-text">{family.traditionalReason || "Unknown"}</td>
                  </tr>
                </>
              )}

              <tr className="section-title-row">
                <td colSpan="3">SIGNATURE</td>
              </tr>
              <tr>
                <td colSpan="3" id="signature">Signature Here</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}