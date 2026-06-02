import './client-view-modal.css';

function ClientViewModal({ client, onClose }) {
    return(
        <>
        <div className="modal-overlay-view">
          <div className="modal-view">
            <div className="modal-header-view">
              <h2>Client Details</h2>
            </div>
            <div className="modal-body-view">
              <div className="view-grid">
                <div className="view-item"><span className="view-label">Male Partner</span><span className="view-value">{client.name}</span></div>
                <div className="view-item"><span className="view-label">Female Partner</span><span className="view-value">{client.spouse_name}</span></div>
                <div className="view-item"><span className="view-label">Birthdate Male</span><span className="view-value">{client.birthdate_male}</span></div>
                <div className="view-item"><span className="view-label">Birthdate Female</span><span className="view-value">{client.birthdate_female}</span></div>
                <div className="view-item"><span className="view-label">Educational Attainment Male</span><span className="view-value">{client.educational_attainment_male}</span></div>
                <div className="view-item"><span className="view-label">Educational Attainment Female</span><span className="view-value">{client.educational_attainment_female}</span></div>
<<<<<<< HEAD
                <div className="view-item"><span className="view-label">Civil Status Male</span><span className="view-value">{client.civil_status_male}</span></div>
                <div className="view-item"><span className="view-label">Civil Status Female</span><span className="view-value">{client.civil_status_female}</span></div>
=======
                <div className="view-item"><span className="view-label">Civil Status</span><span className="view-value">{client.civil_status}</span></div>
>>>>>>> main
                <div className="view-item"><span className="view-label">Address</span><span className="view-value">{client.address}</span></div>
                <div className="view-item"><span className="view-label">Barangay</span><span className="view-value">{client.barangay}</span></div>
                <div className="view-item"><span className="view-label">No. of Children</span><span className="view-value">{client.no_of_children}</span></div>
                <div className="view-item"><span className="view-label">Method Used</span><span className="view-value">{client.fp_method}</span></div>
                <div className="view-item"><span className="view-label">Intention to Shift</span><span className="view-value">{client.intention_to_shift}</span></div>
                <div className="view-item"><span className="view-label">Type</span><span className="view-value">{client.type}</span></div>
                <div className="view-item"><span className="view-label">Status</span><span className="view-value">{client.status}</span></div>
                <div className="view-item"><span className="view-label">Reason</span><span className="view-value">{client.reason}</span></div>
                {client.signature_url && (
                  <div className="view-item full-width">
                    <span className="view-label">Signature</span>
                    <img src={client.signature_url} alt="Signature" className="signature-image" />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-btn-view">
              <button className="btn-back" onClick={onClose}>Back</button>
            </div>
          </div>
        </div>
        </>
    )
}

export default ClientViewModal;