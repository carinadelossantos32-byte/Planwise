import { X, Archive } from 'lucide-react';
import './client-delete-modal.css';

function ClientDeleteModal({ selectedClient, onClose, handleDelete }) {
  return (
    <div className="modal-overlay-delete">
      <div className="modal-delete">

        <button className="modal-close-delete" onClick={onClose}>
          <X size={16} />
        </button>

        <div className="archive-icon-circle">
          <Archive size={28} color="#fff" />
        </div>

        <h2 className="archive-title">Archive client record?</h2>

        <p className="archive-message">
          The client record of <span className="archive-name">{selectedClient.name}</span> 
          
          {/* Only render the & Spouse Name if it actually exists (Public records) */}
          {selectedClient.spouse_name && (
             <> & <span className="archive-name">{selectedClient.spouse_name}</span></>
          )} 
          
          {" "}will be moved to the archive. You can restore it later if needed.
        </p>

        <div className="modal-btn-delete">
          <button className="btn-cancel-d" onClick={onClose}>Cancel</button>
          <button className="btn-archive" onClick={handleDelete}>
            <Archive size={15} /> Archive
          </button>
        </div>

        <div className="archive-note">
          <span className="archive-note-icon">ℹ</span>
          <span>Archived records can be restored from the Archive section at any time.</span>
        </div>

      </div>
    </div>
  );
}

export default ClientDeleteModal;