import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import './client-edit-modal.css';

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

function ClientEditModal({ client, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    ...client,
    latitude: client.latitude !== undefined ? client.latitude : 14.82,
    longitude: client.longitude !== undefined ? client.longitude : 121.05
  });
  
  const [errors, setErrors] = useState({});
  const [isSearching, setIsSearching] = useState(false);


  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }
    if (!formData.address?.trim() && !formData.barangay?.trim()) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      const combinedAddress = `${formData.address}, ${formData.barangay}`;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(combinedAddress)}&limit=1`,
          { headers: { "User-Agent": "Planwise-Capstone" } }
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setFormData((prev) => ({
            ...prev,
            latitude: parseFloat(parseFloat(lat).toFixed(6)),
            longitude: parseFloat(parseFloat(lon).toFixed(6))
          }));
          if (errors.latitude || errors.longitude) {
            setErrors((prev) => ({ ...prev, latitude: "", longitude: "" }));
          }
        }
      } catch (err) {
        console.error("Auto-geocoding failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.address, formData.barangay]);

  function ChangeMapView({ coords }) {
    const map = useMapEvents({});
    useEffect(() => {
      if (coords[0] && coords[1]) {
        map.setView(coords, 14);
      }
    }, [coords, map]);
    return null;
  }

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setFormData((prev) => ({
          ...prev,
          latitude: parseFloat(e.latlng.lat.toFixed(6)),
          longitude: parseFloat(e.latlng.lng.toFixed(6))
        }));
      }
    });
    return null;
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleCoordinateChange = (e) => {
    const val = e.target.value === "" ? "" : parseFloat(e.target.value);
    setFormData({ ...formData, [e.target.name]: val });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    let newErrors = {};
    let isValid = true;

    const fieldsToValidate = [
      "name", "spouse_name", "birthdate_male", "birthdate_female",
      "educational_attainment_male", "educational_attainment_female",
      "civil_status_male", "civil_status_female", "address", "barangay",
      "no_of_children", "latitude", "longitude", "classes_held"
    ];

    fieldsToValidate.forEach((key) => {
      if (formData[key] === undefined || formData[key] === null || String(formData[key]).trim() === "") {
        newErrors[key] = "This field is required";
        isValid = false;
      }
    });

    if (!isValid) {
      setErrors(newErrors);
      return; 
    }

    try {
      const docRef = doc(db, "clients_public", client.id);
      
      const { id, created_at, ...updateData } = formData;

      await updateDoc(docRef, {
        ...updateData,
        updated_at: serverTimestamp()
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating public client:", error);
    }
  };

  return (
    <div className="efpr-overlay">
      <div className="efpr-modal" id="efpr-modal-root" role="dialog" aria-labelledby="efpr-title">

        <div className="efpr-header">
          <h2 id="efpr-title" className="efpr-title">Edit Public Client</h2>
          <p className="efpr-subtitle">
            Ensure all modified fields are correct and complete to maintain data integrity.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="efpr-form">
          <div className="efpr-body">

            {/* ── Partner Information ───────────────────────── */}
            <section className="efpr-section">
              <h3 className="efpr-section-title">Partner Information</h3>

              <div className="efpr-paired">
                <span className="efpr-paired-label">Name</span>
                <div className="efpr-paired-cols">
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-male">Male</span>
                    <input
                      name="name"
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      className={`efpr-input ${errors.name ? "efpr-input-error" : ""}`}
                    />
                    {errors.name && <span className="efpr-error-text">{errors.name}</span>}
                  </div>
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-female">Female</span>
                    <input
                      name="spouse_name"
                      value={formData.spouse_name || ""}
                      onChange={handleInputChange}
                      className={`efpr-input ${errors.spouse_name ? "efpr-input-error" : ""}`}
                    />
                    {errors.spouse_name && <span className="efpr-error-text">{errors.spouse_name}</span>}
                  </div>
                </div>
              </div>

              <div className="efpr-paired">
                <span className="efpr-paired-label">Birthdate</span>
                <div className="efpr-paired-cols">
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-male">Male</span>
                    <input
                      type="date"
                      name="birthdate_male"
                      value={formData.birthdate_male || ""}
                      onChange={handleInputChange}
                      className={`efpr-input ${errors.birthdate_male ? "efpr-input-error" : ""}`}
                    />
                    {errors.birthdate_male && <span className="efpr-error-text">{errors.birthdate_male}</span>}
                  </div>
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-female">Female</span>
                    <input
                      type="date"
                      name="birthdate_female"
                      value={formData.birthdate_female || ""}
                      onChange={handleInputChange}
                      className={`efpr-input ${errors.birthdate_female ? "efpr-input-error" : ""}`}
                    />
                    {errors.birthdate_female && <span className="efpr-error-text">{errors.birthdate_female}</span>}
                  </div>
                </div>
              </div>

              <div className="efpr-paired">
                <span className="efpr-paired-label">Educational Attainment</span>
                <div className="efpr-paired-cols">
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-male">Male</span>
                    <select
                      name="educational_attainment_male"
                      value={formData.educational_attainment_male || ""}
                      onChange={handleInputChange}
                      className={`efpr-select ${errors.educational_attainment_male ? "efpr-input-error" : ""}`}
                    >
                      <option value="">Select</option>
                      <option value="No Education">1 - No Education</option>
                      <option value="Elementary Level">2 - Elementary Level</option>
                      <option value="Elementary Graduate">3 - Elementary Graduate</option>
                      <option value="High School Level">4 - High School Level</option>
                      <option value="High School Graduate">5 - High School Graduate</option>
                      <option value="Vocational">6 - Vocational</option>
                      <option value="College Level">7 - College Level</option>
                      <option value="College Graduate">8 - College Graduate</option>
                      <option value="Post Graduate">9 - Post Graduate</option>
                    </select>
                    {errors.educational_attainment_male && (
                      <span className="efpr-error-text">{errors.educational_attainment_male}</span>
                    )}
                  </div>
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-female">Female</span>
                    <select
                      name="educational_attainment_female"
                      value={formData.educational_attainment_female || ""}
                      onChange={handleInputChange}
                      className={`efpr-select ${errors.educational_attainment_female ? "efpr-input-error" : ""}`}
                    >
                      <option value="">Select</option>
                      <option value="No Education">1 - No Education</option>
                      <option value="Elementary Level">2 - Elementary Level</option>
                      <option value="Elementary Graduate">3 - Elementary Graduate</option>
                      <option value="High School Level">4 - High School Level</option>
                      <option value="High School Graduate">5 - High School Graduate</option>
                      <option value="Vocational">6 - Vocational</option>
                      <option value="College Level">7 - College Level</option>
                      <option value="College Graduate">8 - College Graduate</option>
                      <option value="Post Graduate">9 - Post Graduate</option>
                    </select>
                    {errors.educational_attainment_female && (
                      <span className="efpr-error-text">{errors.educational_attainment_female}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="efpr-paired">
                <span className="efpr-paired-label">Civil Status</span>
                <div className="efpr-paired-cols">
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-male">Male</span>
                    <select
                      name="civil_status_male"
                      value={formData.civil_status_male || ""}
                      onChange={handleInputChange}
                      className={`efpr-select ${errors.civil_status_male ? "efpr-input-error" : ""}`}
                    >
                      <option value="">Select</option>
                      <option value="Single">1 - Single</option>
                      <option value="Married">2 - Married</option>
                      <option value="Widowed">3 - Widowed</option>
                      <option value="Separated">4 - Separated</option>
                      <option value="Live-In">5 - Live-In</option>
                    </select>
                    {errors.civil_status_male && <span className="efpr-error-text">{errors.civil_status_male}</span>}
                  </div>
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-female">Female</span>
                    <select
                      name="civil_status_female"
                      value={formData.civil_status_female || ""}
                      onChange={handleInputChange}
                      className={`efpr-select ${errors.civil_status_female ? "efpr-input-error" : ""}`}
                    >
                      <option value="">Select</option>
                      <option value="Single">1 - Single</option>
                      <option value="Married">2 - Married</option>
                      <option value="Widowed">3 - Widowed</option>
                      <option value="Separated">4 - Separated</option>
                      <option value="Live-In">5 - Live-In</option>
                    </select>
                    {errors.civil_status_female && <span className="efpr-error-text">{errors.civil_status_female}</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Location ──────────────────────────────────── */}
            <section className="efpr-section">
              <h3 className="efpr-section-title">Location</h3>

              <div className="efpr-grid-2">
                <div className="efpr-group-public">
                  <label className="efpr-label">
                    Address{" "}
                    {isSearching && <span className="efpr-searching">(Updating Map...)</span>}
                  </label>
                  <input
                    name="address"
                    value={formData.address || ""}
                    onChange={handleInputChange}
                    className={`efpr-input ${errors.address ? "efpr-input-error" : ""}`}
                  />
                  {errors.address && <span className="efpr-error-text">{errors.address}</span>}
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Barangay</label>
                  <input
                    name="barangay"
                    value={formData.barangay || ""}
                    onChange={handleInputChange}
                    className={`efpr-input ${errors.barangay ? "efpr-input-error" : ""}`}
                  />
                  {errors.barangay && <span className="efpr-error-text">{errors.barangay}</span>}
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude !== undefined ? formData.latitude : ""}
                    onChange={handleCoordinateChange}
                    className={`efpr-input ${errors.latitude ? "efpr-input-error" : ""}`}
                  />
                  {errors.latitude && <span className="efpr-error-text">{errors.latitude}</span>}
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude !== undefined ? formData.longitude : ""}
                    onChange={handleCoordinateChange}
                    className={`efpr-input ${errors.longitude ? "efpr-input-error" : ""}`}
                  />
                  {errors.longitude && <span className="efpr-error-text">{errors.longitude}</span>}
                </div>
              </div>

              <div className="efpr-map-wrap" id="efpr-map-wrap">
                <label className="efpr-label">Location Visual Verification</label>
                <div className="efpr-map-frame">
                  <MapContainer
                    center={[formData.latitude || 14.8436, formData.longitude || 120.8114]}
                    zoom={14}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler />
                    <ChangeMapView coords={[formData.latitude, formData.longitude]} />
                    {formData.latitude && formData.longitude && (
                      <Marker position={[formData.latitude, formData.longitude]} />
                    )}
                  </MapContainer>
                </div>
              </div>
            </section>

            {/* ── Family Planning Details ──────────────────── */}
            <section className="efpr-section">
              <h3 className="efpr-section-title">Family Planning Details</h3>

              <div className="efpr-grid-2">
                <div className="efpr-group-public">
                  <label className="efpr-label">No. of Children</label>
                  <input
                    type="number"
                    name="no_of_children"
                    value={formData.no_of_children !== undefined ? formData.no_of_children : ""}
                    onChange={handleInputChange}
                    min="0"
                    className={`efpr-input ${errors.no_of_children ? "efpr-input-error" : ""}`}
                  />
                  {errors.no_of_children && <span className="efpr-error-text">{errors.no_of_children}</span>}
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Method Used</label>
                  <select
                    name="fp_method"
                    value={formData.fp_method || ""}
                    onChange={handleInputChange}
                    className="efpr-select"
                  >
                    <option value="">Select</option>
                    <option value="Condom">1 - Condom</option>
                    <option value="IUD">2 - IUD</option>
                    <option value="Pills">3 - Pills</option>
                    <option value="Injectable">4 - Injectable</option>
                    <option value="Vasectomy">5 - Vasectomy</option>
                    <option value="Tubal Ligation">6 - Tubal Ligation</option>
                    <option value="Implant">7 - Implant</option>
                    <option value="CMM/Billings">8 - CMM/Billings</option>
                    <option value="BBT">9 - BBT</option>
                    <option value="Symptothermal">10 - Symptothermal</option>
                    <option value="SDM">11 - SDM</option>
                    <option value="LAM">12 - LAM</option>
                  </select>
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Intention to Shift</label>
                  <select
                    name="intention_to_shift"
                    value={formData.intention_to_shift || ""}
                    onChange={handleInputChange}
                    className="efpr-select"
                  >
                    <option value="">Select</option>
                    <option value="Condom">1 - Condom</option>
                    <option value="IUD">2 - IUD</option>
                    <option value="Pills">3 - Pills</option>
                    <option value="Injectable">4 - Injectable</option>
                    <option value="Vasectomy">5 - Vasectomy</option>
                    <option value="Tubal Ligation">6 - Tubal Ligation</option>
                    <option value="Implant">7 - Implant</option>
                    <option value="CMM/Billings">8 - CMM/Billings</option>
                    <option value="BBT">9 - BBT</option>
                    <option value="Symptothermal">10 - Symptothermal</option>
                    <option value="SDM">11 - SDM</option>
                    <option value="LAM">12 - LAM</option>
                  </select>
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Traditional FP User: Type</label>
                  <select
                    name="type"
                    value={formData.type || ""}
                    onChange={handleInputChange}
                    className="efpr-select"
                  >
                    <option value="">Select</option>
                    <option value="Withdrawal">1 - Withdrawal</option>
                    <option value="Rhythm">2 - Rhythm</option>
                    <option value="Calendar">3 - Calendar</option>
                    <option value="Abstinence">4 - Abstinence</option>
                    <option value="Herbal">5 - Herbal</option>
                    <option value="No Method">6 - No Method</option>
                  </select>
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Traditional FP User: Status</label>
                  <select
                    name="status"
                    value={formData.status || ""}
                    onChange={handleInputChange}
                    className="efpr-select"
                  >
                    <option value="">Select</option>
                    <option value="Expressing Intention to Use Modern FP">A - Expressing Intention to Use Modern FP</option>
                    <option value="Undecided">B - Undecided</option>
                    <option value="Currently Pregnant">C - Currently Pregnant</option>
                    <option value="No Intention to Use">D - No Intention to Use</option>
                  </select>
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Reason</label>
                  <select
                    name="reason"
                    value={formData.reason || ""}
                    onChange={handleInputChange}
                    className="efpr-select"
                  >
                    <option value="">Select</option>
                    <option value="Spacing">1 - Spacing</option>
                    <option value="Limiting">2 - Limiting</option>
                    <option value="Achieving">3 - Achieving</option>
                  </select>
                </div>

                <div className="efpr-group-public efpr-span-2">
                  <label className="efpr-label">Classes Held</label>
                  <select
                    name="classes_held"
                    value={formData.classes_held || ""}
                    onChange={handleInputChange}
                    className={`efpr-select ${errors.classes_held ? "efpr-input-error" : ""}`}
                  >
                    <option value="">Select</option>
                    <option value="4Ps">4Ps</option>
                    <option value="Non-4Ps">Non-4Ps</option>
                    <option value="Faith-Based Organization">Faith-Based Organization</option>
                    <option value="USAPAN">USAPAN</option>
                    <option value="PMOC">PMOC</option>
                    <option value="House to House">House to House</option>
                    <option value="Profiled Only">Profiled Only</option>
                    <option value="Others">Others</option>
                  </select>
                  {errors.classes_held && <span className="efpr-error-text">{errors.classes_held}</span>}
                </div>
              </div>
            </section>

          </div>

          <div className="efpr-footer">
            <button type="button" className="efpr-btn efpr-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="efpr-btn efpr-btn-save">
              Update Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientEditModal;