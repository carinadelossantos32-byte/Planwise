import "../ClientViewModal/client-view-modal.css";

function ClientViewModalReferred({ client, onClose }) {
  return (
    <div className="vfpr-overlay">
      <div className="vfpr-modal" id="vfpr-modal-root" role="dialog" aria-labelledby="vfpr-title">
        <div className="vfpr-header">
          <h2 id="vfpr-title" className="vfpr-title">Referral Record Details</h2>
        </div>

        <div className="vfpr-body">
          <div className="vfpr-grid-2">
            <div className="vfpr-item">
              <span className="vfpr-label">Client Name</span>
              <span className="vfpr-value">{client.name || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">FP Method</span>
              <span className="vfpr-value">{client.fp_method || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">With Intention to Shift</span>
              <span className="vfpr-value">{client.with_intention_to_shift || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">Address</span>
              <span className="vfpr-value">{client.address || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">Health Service Facility</span>
              <span className="vfpr-value">{client.facility_name || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">Facility Address</span>
              <span className="vfpr-value">{client.facility_address || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">Who Referred the Client</span>
              <span className="vfpr-value">{client.referred_by || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">Volunteer Contact No.</span>
              <span className="vfpr-value">{client.volunteer_contact || "—"}</span>
            </div>

            <div className="vfpr-item">
              <span className="vfpr-label">Date</span>
              <span className="vfpr-value">{client.date || "—"}</span>
            </div>

            <div className="vfpr-item" style={{ gridColumn: "1 / -1" }}>
              <span className="vfpr-label">Referral Slip Attachment</span>
              {client.referral_slip_file ? (
                <div style={{ marginTop: "8px" }}>
                  <img
                    className="slip-preview"
                    src={client.referral_slip_file}
                    alt="Referral Slip Document"
                    style={{ maxWidth: "100%", borderRadius: "6px" }}
                  />
                </div>
              ) : (
                <p className="vfpr-value" style={{ color: "#9ca3af", fontStyle: "italic" }}>
                  No image attached to this record.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="vfpr-footer">
          <button className="vfpr-btn vfpr-btn-back" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientViewModalReferred;