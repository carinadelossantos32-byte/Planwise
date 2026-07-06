import "../ClientViewModal/client-view-modal.css";

function ClientViewModalReferred({ client, onClose }) {
  return (
    <div className="modal-overlay-view">
      <div className="modal-view">
        <div className="modal-header-view">
          <h2>Referral Record Details</h2>
        </div>

        <div className="modal-body-view">
          <div className="view-grid">
            <div className="view-item">
              <span className="view-label">Client Name</span>
              <p className="view-value">{client.name || "—"}</p>
            </div>

            <div className="view-item">
              <span className="view-label">Address</span>
              <p className="view-value">{client.address || "—"}</p>
            </div>

            <div className="view-item">
              <span className="view-label">Health Service Facility</span>
              <p className="view-value">{client.facility_name || "—"}</p>
            </div>

            <div className="view-item">
              <span className="view-label">Facility Address</span>
              <p className="view-value">{client.facility_address || "—"}</p>
            </div>

            <div className="view-item">
              <span className="view-label">Who Referred the Client</span>
              <p className="view-value">{client.referred_by || "—"}</p>
            </div>

            <div className="view-item">
              <span className="view-label">Volunteer Contact No.</span>
              <p className="view-value">{client.volunteer_contact || "—"}</p>
            </div>

            <div className="view-item">
              <span className="view-label">Date</span>
              <p className="view-value">{client.date || "—"}</p>
            </div>


              {client.referral_slip_file ? (
                <div className="view-item">
                  <span className="view-label">Referral Slip Attachment</span>
                  <img className="slip-preview"
                    src={client.referral_slip_file}
                    alt="Referral Slip Document"
                  />
                </div>
              ) : (
                <p className="view-value" style={{ color: "#9ca3af", fontStyle: "italic" }}>No image attached to this record.</p>
              )}
          </div>
        </div>
        <div className="modal-btn-view">
          <button className="btn-back" onClick={onClose}>Back</button>
        </div>
      </div>
    </div>
  );
}

export default ClientViewModalReferred;