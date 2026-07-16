import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import './client-view-modal.css';

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function ClientViewModal({ client, onClose }) {
  return (
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
              <div className="view-item"><span className="view-label">Civil Status Male</span><span className="view-value">{client.civil_status_male}</span></div>
              <div className="view-item"><span className="view-label">Civil Status Female</span><span className="view-value">{client.civil_status_female}</span></div>
              <div className="view-item"><span className="view-label">Address</span><span className="view-value">{client.address}</span></div>
              <div className="view-item"><span className="view-label">Barangay</span><span className="view-value">{client.barangay}</span></div>
              <div className="view-item"><span className="view-label">No. of Children</span><span className="view-value">{client.no_of_children}</span></div>
              <div className="view-item"><span className="view-label">Method Used</span><span className="view-value">{client.fp_method}</span></div>
              <div className="view-item"><span className="view-label">Intention to Shift</span><span className="view-value">{client.intention_to_shift}</span></div>
              <div className="view-item"><span className="view-label">Type</span><span className="view-value">{client.type}</span></div>
              <div className="view-item"><span className="view-label">Status</span><span className="view-value">{client.status}</span></div>
              <div className="view-item"><span className="view-label">Reason</span><span className="view-value">{client.reason}</span></div>
              
              {/* Geographic Coordinate Text Displays */}
              <div className="view-item"><span className="view-label">Latitude</span><span className="view-value">{client.latitude || "—"}</span></div>
              <div className="view-item"><span className="view-label">Longitude</span><span className="view-value">{client.longitude || "—"}</span></div>

              {/* Read-Only Visual Map Display Block */}
              {client.latitude && client.longitude ? (
                <div className="view-item full-width" style={{ height: "250px", marginTop: "15px", marginBottom: "15px" }}>
                  <span className="view-label" style={{ marginBottom: "5px", display: "block" }}>Location Map Pin</span>
                  <MapContainer 
                    center={[client.latitude, client.longitude]} 
                    zoom={15} 
                    dragging={false}       // Prevents dragging/panning the preview map
                    scrollWheelZoom={false} // Prevents scrolling to change zoom levels
                    zoomControl={false}     // Hides zoom dashboard buttons
                    style={{ height: "100%", width: "100%", borderRadius: "4px", zIndex: "1" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[client.latitude, client.longitude]} />
                  </MapContainer>
                </div>
              ) : (
                <div className="view-item full-width" style={{ marginTop: "15px", marginBottom: "15px" }}>
                  <span className="view-label">Location Map Pin</span>
                  <span className="view-value" style={{ color: "#ef4444" }}>No geographic coordinate metadata pinned for this client.</span>
                </div>
              )}

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
  );
}

export default ClientViewModal;