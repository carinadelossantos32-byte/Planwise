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
      <div className="vfpr-overlay">
        <div className="vfpr-modal" id="vfpr-modal-root" role="dialog" aria-labelledby="vfpr-title">

          <div className="vfpr-header">
            <h2 id="vfpr-title" className="vfpr-title">Client Details</h2>
          </div>

          <div className="vfpr-body">

            {/* ── Partner Information ───────────────────────── */}
            <section className="vfpr-section">
              <h3 className="vfpr-section-title">Partner Information</h3>

              <div className="vfpr-paired">
                <span className="vfpr-paired-label">Name</span>
                <div className="vfpr-paired-cols">
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-male">Male</span>
                    <span className="vfpr-value">{client.name || "—"}</span>
                  </div>
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-female">Female</span>
                    <span className="vfpr-value">{client.spouse_name || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="vfpr-paired">
                <span className="vfpr-paired-label">Birthdate</span>
                <div className="vfpr-paired-cols">
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-male">Male</span>
                    <span className="vfpr-value">{client.birthdate_male || "—"}</span>
                  </div>
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-female">Female</span>
                    <span className="vfpr-value">{client.birthdate_female || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="vfpr-paired">
                <span className="vfpr-paired-label">Educational Attainment</span>
                <div className="vfpr-paired-cols">
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-male">Male</span>
                    <span className="vfpr-value">{client.educational_attainment_male || "—"}</span>
                  </div>
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-female">Female</span>
                    <span className="vfpr-value">{client.educational_attainment_female || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="vfpr-paired">
                <span className="vfpr-paired-label">Civil Status</span>
                <div className="vfpr-paired-cols">
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-male">Male</span>
                    <span className="vfpr-value">{client.civil_status_male || "—"}</span>
                  </div>
                  <div className="vfpr-item">
                    <span className="vfpr-tag vfpr-tag-female">Female</span>
                    <span className="vfpr-value">{client.civil_status_female || "—"}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Location ──────────────────────────────────── */}
            <section className="vfpr-section">
              <h3 className="vfpr-section-title">Location</h3>

              <div className="vfpr-grid-2">
                <div className="vfpr-item">
                  <span className="vfpr-label">Address</span>
                  <span className="vfpr-value">{client.address || "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Barangay</span>
                  <span className="vfpr-value">{client.barangay || "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Latitude</span>
                  <span className="vfpr-value">{client.latitude || "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Longitude</span>
                  <span className="vfpr-value">{client.longitude || "—"}</span>
                </div>
              </div>

              {/* Read-Only Visual Map Display Block */}
              {client.latitude && client.longitude ? (
                <div className="vfpr-map-wrap" id="vfpr-map-wrap">
                  <span className="vfpr-label">Location Map Pin</span>
                  <div className="vfpr-map-frame">
                    <MapContainer
                      center={[client.latitude, client.longitude]}
                      zoom={15}
                      dragging={false}
                      scrollWheelZoom={false}
                      zoomControl={false}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[client.latitude, client.longitude]} />
                    </MapContainer>
                  </div>
                </div>
              ) : (
                <div className="vfpr-map-empty">
                  <span className="vfpr-label">Location Map Pin</span>
                  <span className="vfpr-value vfpr-value-warning">
                    No geographic coordinate metadata pinned for this client.
                  </span>
                </div>
              )}
            </section>

            {/* ── Family Planning Details ──────────────────── */}
            <section className="vfpr-section">
              <h3 className="vfpr-section-title">Family Planning Details</h3>

              <div className="vfpr-grid-2">
                <div className="vfpr-item">
                  <span className="vfpr-label">No. of Children</span>
                  <span className="vfpr-value">{client.no_of_children ?? "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Method Used</span>
                  <span className="vfpr-value">{client.fp_method || "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Intention to Shift</span>
                  <span className="vfpr-value">{client.intention_to_shift || "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Type</span>
                  <span className="vfpr-value">{client.type || "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Status</span>
                  <span className="vfpr-value">{client.status || "—"}</span>
                </div>
                <div className="vfpr-item">
                  <span className="vfpr-label">Reason</span>
                  <span className="vfpr-value">{client.reason || "—"}</span>
                </div>
                <div className="vfpr-item vfpr-span-2">
                  <span className="vfpr-label">Classes Held</span>
                  <span className="vfpr-value">{client.classes_held || "—"}</span>
                </div>
              </div>

              {client.signature_url && (
                <div className="vfpr-signature-wrap">
                  <span className="vfpr-label">Signature</span>
                  <img src={client.signature_url} alt="Signature" className="vfpr-signature-image" />
                </div>
              )}
            </section>

          </div>

          <div className="vfpr-footer">
            <button className="vfpr-btn vfpr-btn-back" onClick={onClose}>
              Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ClientViewModal;