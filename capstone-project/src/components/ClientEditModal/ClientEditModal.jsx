import ReportSelect from "../ReportSelect/ReportSelect";
import { notify } from "../../utils/notify";
import { useState, useEffect } from "react";
import { checkAddressBarangay } from "../../utils/geoHelper";
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

    const location = checkAddressBarangay(formData.address, formData.barangay);
    if (!location.ok) {
      setErrors({ address: location.message, barangay: location.message });
      notify(location.message);
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
                    <ReportSelect
                      className="form-select"
                      name="educational_attainment_male"
                      ariaLabel="educational attainment male"
                      value={formData.educational_attainment_male || ""}
                      onChange={handleInputChange}
                      hasError={Boolean(errors.educational_attainment_male)}
                      options={[
                        { value: "", label: "Select" },
                        { value: "No Education", label: "1 - No Education" },
                        { value: "Elementary Level", label: "2 - Elementary Level" },
                        { value: "Elementary Graduate", label: "3 - Elementary Graduate" },
                        { value: "High School Level", label: "4 - High School Level" },
                        { value: "High School Graduate", label: "5 - High School Graduate" },
                        { value: "Vocational", label: "6 - Vocational" },
                        { value: "College Level", label: "7 - College Level" },
                        { value: "College Graduate", label: "8 - College Graduate" },
                        { value: "Post Graduate", label: "9 - Post Graduate" },
                      ]}
                    />
                    {errors.educational_attainment_male && (
                      <span className="efpr-error-text">{errors.educational_attainment_male}</span>
                    )}
                  </div>
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-female">Female</span>
                    <ReportSelect
                      className="form-select"
                      name="educational_attainment_female"
                      ariaLabel="educational attainment female"
                      value={formData.educational_attainment_female || ""}
                      onChange={handleInputChange}
                      hasError={Boolean(errors.educational_attainment_female)}
                      options={[
                        { value: "", label: "Select" },
                        { value: "No Education", label: "1 - No Education" },
                        { value: "Elementary Level", label: "2 - Elementary Level" },
                        { value: "Elementary Graduate", label: "3 - Elementary Graduate" },
                        { value: "High School Level", label: "4 - High School Level" },
                        { value: "High School Graduate", label: "5 - High School Graduate" },
                        { value: "Vocational", label: "6 - Vocational" },
                        { value: "College Level", label: "7 - College Level" },
                        { value: "College Graduate", label: "8 - College Graduate" },
                        { value: "Post Graduate", label: "9 - Post Graduate" },
                      ]}
                    />
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
                    <ReportSelect
                      className="form-select"
                      name="civil_status_male"
                      ariaLabel="civil status male"
                      value={formData.civil_status_male || ""}
                      onChange={handleInputChange}
                      hasError={Boolean(errors.civil_status_male)}
                      options={[
                        { value: "", label: "Select" },
                        { value: "Single", label: "1 - Single" },
                        { value: "Married", label: "2 - Married" },
                        { value: "Widowed", label: "3 - Widowed" },
                        { value: "Separated", label: "4 - Separated" },
                        { value: "Live-In", label: "5 - Live-In" },
                      ]}
                    />
                    {errors.civil_status_male && <span className="efpr-error-text">{errors.civil_status_male}</span>}
                  </div>
                  <div className="efpr-group-public">
                    <span className="efpr-tag efpr-tag-female">Female</span>
                    <ReportSelect
                      className="form-select"
                      name="civil_status_female"
                      ariaLabel="civil status female"
                      value={formData.civil_status_female || ""}
                      onChange={handleInputChange}
                      hasError={Boolean(errors.civil_status_female)}
                      options={[
                        { value: "", label: "Select" },
                        { value: "Single", label: "1 - Single" },
                        { value: "Married", label: "2 - Married" },
                        { value: "Widowed", label: "3 - Widowed" },
                        { value: "Separated", label: "4 - Separated" },
                        { value: "Live-In", label: "5 - Live-In" },
                      ]}
                    />
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
                  <ReportSelect
                    className="form-select"
                    name="fp_method"
                    ariaLabel="fp method"
                    value={formData.fp_method || ""}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Condom", label: "1 - Condom" },
                      { value: "IUD", label: "2 - IUD" },
                      { value: "Pills", label: "3 - Pills" },
                      { value: "Injectable", label: "4 - Injectable" },
                      { value: "Vasectomy", label: "5 - Vasectomy" },
                      { value: "Tubal Ligation", label: "6 - Tubal Ligation" },
                      { value: "Implant", label: "7 - Implant" },
                      { value: "CMM/Billings", label: "8 - CMM/Billings" },
                      { value: "BBT", label: "9 - BBT" },
                      { value: "Symptothermal", label: "10 - Symptothermal" },
                      { value: "SDM", label: "11 - SDM" },
                      { value: "LAM", label: "12 - LAM" },
                    ]}
                  />
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Intention to Shift</label>
                  <ReportSelect
                    className="form-select"
                    name="intention_to_shift"
                    ariaLabel="intention to shift"
                    value={formData.intention_to_shift || ""}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Condom", label: "1 - Condom" },
                      { value: "IUD", label: "2 - IUD" },
                      { value: "Pills", label: "3 - Pills" },
                      { value: "Injectable", label: "4 - Injectable" },
                      { value: "Vasectomy", label: "5 - Vasectomy" },
                      { value: "Tubal Ligation", label: "6 - Tubal Ligation" },
                      { value: "Implant", label: "7 - Implant" },
                      { value: "CMM/Billings", label: "8 - CMM/Billings" },
                      { value: "BBT", label: "9 - BBT" },
                      { value: "Symptothermal", label: "10 - Symptothermal" },
                      { value: "SDM", label: "11 - SDM" },
                      { value: "LAM", label: "12 - LAM" },
                    ]}
                  />
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Traditional FP User: Type</label>
                  <ReportSelect
                    className="form-select"
                    name="type"
                    ariaLabel="type"
                    value={formData.type || ""}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Withdrawal", label: "1 - Withdrawal" },
                      { value: "Rhythm", label: "2 - Rhythm" },
                      { value: "Calendar", label: "3 - Calendar" },
                      { value: "Abstinence", label: "4 - Abstinence" },
                      { value: "Herbal", label: "5 - Herbal" },
                      { value: "No Method", label: "6 - No Method" },
                    ]}
                  />
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Traditional FP User: Status</label>
                  <ReportSelect
                    className="form-select"
                    name="status"
                    ariaLabel="status"
                    value={formData.status || ""}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Expressing Intention to Use Modern FP", label: "A - Expressing Intention to Use Modern FP" },
                      { value: "Undecided", label: "B - Undecided" },
                      { value: "Currently Pregnant", label: "C - Currently Pregnant" },
                      { value: "No Intention to Use", label: "D - No Intention to Use" },
                    ]}
                  />
                </div>

                <div className="efpr-group-public">
                  <label className="efpr-label">Reason</label>
                  <ReportSelect
                    className="form-select"
                    name="reason"
                    ariaLabel="reason"
                    value={formData.reason || ""}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Spacing", label: "1 - Spacing" },
                      { value: "Limiting", label: "2 - Limiting" },
                      { value: "Achieving", label: "3 - Achieving" },
                    ]}
                  />
                </div>

                <div className="efpr-group-public efpr-span-2">
                  <label className="efpr-label">Classes Held</label>
                  <ReportSelect
                    className="form-select"
                    name="classes_held"
                    ariaLabel="classes held"
                    value={formData.classes_held || ""}
                    onChange={handleInputChange}
                    hasError={Boolean(errors.classes_held)}
                    options={[
                      { value: "", label: "Select" },
                      { value: "4Ps", label: "4Ps" },
                      { value: "Non-4Ps", label: "Non-4Ps" },
                      { value: "Faith-Based Organization", label: "Faith-Based Organization" },
                      { value: "USAPAN", label: "USAPAN" },
                      { value: "PMOC", label: "PMOC" },
                      { value: "House to House", label: "House to House" },
                      { value: "Profiled Only", label: "Profiled Only" },
                      { value: "Others", label: "Others" },
                    ]}
                  />
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