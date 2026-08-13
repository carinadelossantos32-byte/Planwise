
import "../ClientViewModal/client-view-modal.css";

function ClientViewModalPrivate({ client, onClose }) {
  return(
    <div className="vfpr-overlay">
      <div className="vfpr-modal" id="vfpr-modal-root" role="dialog" aria-labelledby="vfpr-title">
        <div className="vfpr-header">
          <h2 id="vfpr-title" className="vfpr-title">Private Client Details</h2>
        </div>
        <div className="vfpr-body">
          <div className="vfpr-grid-2">
            <div className="vfpr-item">
              <span className="vfpr-label">Client Name</span>
              <span className="vfpr-value">{client.name || "—"}</span>
            </div>
            <div className="vfpr-item">
              <span className="vfpr-label">Age</span>
              <span className="vfpr-value">{client.age || "—"}</span>
            </div>
            <div className="vfpr-item">
              <span className="vfpr-label">Birthdate</span>
              <span className="vfpr-value">{client.birthdate || "—"}</span>
            </div>
            <div className="vfpr-item">
              <span className="vfpr-label">Address</span>
              <span className="vfpr-value">{client.address || "—"}</span>
            </div>
            <div className="vfpr-item">
              <span className="vfpr-label">Method Used</span>
              <span className="vfpr-value">{client.fp_method || "—"}</span>
            </div>
            <div className="vfpr-item">
              <span className="vfpr-label">FP Issued By</span>
              <span className="vfpr-value">{client.fp_issued_by || "—"}</span>
            </div>
            {client.signature_url && (
              <div className="vfpr-item vfpr-span-2">
                <span className="vfpr-label">Signature</span>
                <img src={client.signature_url} alt="Signature" className="vfpr-signature-image" />
              </div>
            )}
          </div>
        </div>
        <div className="vfpr-footer">
          <button className="vfpr-btn vfpr-btn-back" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClientViewModalPrivate;