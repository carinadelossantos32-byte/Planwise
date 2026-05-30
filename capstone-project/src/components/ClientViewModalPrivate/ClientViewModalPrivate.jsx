
import "../ClientViewModal/client-view-modal.css";

function ClientViewModalPrivate({ client, onClose }) {
  return(
    <div className="modal-overlay-view">
      <div className="modal-view">
        <div className="modal-header-view">
          <h2>Private Client Details</h2>
        </div>
        <div className="modal-body-view">
          <div className="view-grid">
            <div className="view-item"><span className="view-label">Client Name</span><span className="view-value">{client.name || "—"}</span></div>
            <div className="view-item"><span className="view-label">Age</span><span className="view-value">{client.age || "—"}</span></div>
            <div className="view-item"><span className="view-label">Birthdate</span><span className="view-value">{client.birthdate || "—"}</span></div>
            <div className="view-item"><span className="view-label">Address</span><span className="view-value">{client.address || "—"}</span></div>
            <div className="view-item"><span className="view-label">Method Used</span><span className="view-value">{client.fp_method || "—"}</span></div>
            <div className="view-item"><span className="view-label">FP Issued By</span><span className="view-value">{client.fp_issued_by || "—"}</span></div>
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
  )
}

export default ClientViewModalPrivate;