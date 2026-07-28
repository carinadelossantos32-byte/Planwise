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
    <div className="modal-overlay-edit">
      <div className="modal">
        <div className="modal-header-edit">
          <h2>Edit Public Client</h2>
        </div>
        <div className="modal-body-edit">
          <h3>Ensure all modified fields are correct and complete to maintain data integrity</h3>
          
          <form className="form-grid-edit" onSubmit={handleUpdate}>
            
            <div className="form-group-edit">
              <label>Male Partner</label>
              <input 
                name="name" 
                value={formData.name || ""} 
                onChange={handleInputChange} 
                className={errors.name ? "input-error" : ""} 
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Female Partner</label>
              <input 
                name="spouse_name" 
                value={formData.spouse_name || ""} 
                onChange={handleInputChange} 
                className={errors.spouse_name ? "input-error" : ""} 
              />
              {errors.spouse_name && <span className="error-text">{errors.spouse_name}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Birthdate Male</label>
              <input 
                type="date" 
                name="birthdate_male" 
                value={formData.birthdate_male || ""} 
                onChange={handleInputChange} 
                className={errors.birthdate_male ? "input-error" : ""} 
              />
              {errors.birthdate_male && <span className="error-text">{errors.birthdate_male}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Birthdate Female</label>
              <input 
                type="date" 
                name="birthdate_female" 
                value={formData.birthdate_female || ""} 
                onChange={handleInputChange} 
                className={errors.birthdate_female ? "input-error" : ""} 
              />
              {errors.birthdate_female && <span className="error-text">{errors.birthdate_female}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Educational Attainment Male</label>
              <select 
                name="educational_attainment_male" 
                value={formData.educational_attainment_male || ""} 
                onChange={handleInputChange} 
                className={errors.educational_attainment_male ? "input-error" : ""}
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
              {errors.educational_attainment_male && <span className="error-text">{errors.educational_attainment_male}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Educational Attainment Female</label>
              <select 
                name="educational_attainment_female" 
                value={formData.educational_attainment_female || ""} 
                onChange={handleInputChange} 
                className={errors.educational_attainment_female ? "input-error" : ""}
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
              {errors.educational_attainment_female && <span className="error-text">{errors.educational_attainment_female}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Civil Status Male</label>
              <select 
                name="civil_status_male" 
                value={formData.civil_status_male || ""} 
                onChange={handleInputChange} 
                className={errors.civil_status_male ? "input-error" : ""}
              >
                <option value="">Select</option>
                <option value="Single">1 - Single</option>
                <option value="Married">2 - Married</option>
                <option value="Widowed">3 - Widowed</option>
                <option value="Separated">4 - Separated</option>
                <option value="Live-In">5 - Live-In</option>
              </select>
              {errors.civil_status_male && <span className="error-text">{errors.civil_status_male}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Civil Status Female</label>
              <select 
                name="civil_status_female" 
                value={formData.civil_status_female || ""} 
                onChange={handleInputChange} 
                className={errors.civil_status_female ? "input-error" : ""}
              >
                <option value="">Select</option>
                <option value="Single">1 - Single</option>
                <option value="Married">2 - Married</option>
                <option value="Widowed">3 - Widowed</option>
                <option value="Separated">4 - Separated</option>
                <option value="Live-In">5 - Live-In</option>
              </select>
              {errors.civil_status_female && <span className="error-text">{errors.civil_status_female}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Address {isSearching && <span style={{ color: "#3b82f6", fontSize: "12px" }}>(Updating Map...)</span>}</label>
              <input 
                name="address" 
                value={formData.address || ""} 
                onChange={handleInputChange} 
                className={errors.address ? "input-error" : ""} 
              />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Barangay</label>
              <input 
                name="barangay" 
                value={formData.barangay || ""} 
                onChange={handleInputChange} 
                className={errors.barangay ? "input-error" : ""} 
              />
              {errors.barangay && <span className="error-text">{errors.barangay}</span>}
            </div>

            <div className="form-group-edit">
              <label>Latitude</label>
              <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleCoordinateChange}
                className={errors.latitude ? "input-error" : ""} />
              {errors.latitude && <span className="error-text">{errors.latitude}</span>}
            </div>

            <div className="form-group-edit">
              <label>Longitude</label>
              <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleCoordinateChange}
                className={errors.longitude ? "input-error" : ""} />
              {errors.longitude && <span className="error-text">{errors.longitude}</span>}
            </div>

            {/* Leaflet Verification and Adjustment Panel */}
            <div className="form-group-edit" style={{ gridColumn: "1 / -1", height: "250px", marginBottom: "15px" }}>
              <label style={{ marginBottom: "5px", display: "block" }}>Location Visual Verification</label>
              <MapContainer 
                center={[formData.latitude || 14.82, formData.longitude || 121.05]} 
                zoom={14} 
                style={{ height: "100%", width: "100%", borderRadius: "4px", zIndex: "1" }}
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
            
            <div className="form-group-edit">
              <label>No. of Children</label>
              <input 
                type="number" 
                name="no_of_children" 
                value={formData.no_of_children !== undefined ? formData.no_of_children : ""} 
                onChange={handleInputChange} 
                min="0" 
                className={errors.no_of_children ? "input-error" : ""} 
              />
              {errors.no_of_children && <span className="error-text">{errors.no_of_children}</span>}
            </div>
            
            <div className="form-group-edit">
              <label>Method Used</label>
              <select 
                name="fp_method" 
                value={formData.fp_method || ""} 
                onChange={handleInputChange} 
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
            
            <div className="form-group-edit">
              <label>Intention to Shift</label>
              <select 
                name="intention_to_shift" 
                value={formData.intention_to_shift || ""} 
                onChange={handleInputChange} 
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
            
            <div className="form-group-edit">
              <label>Type</label>
              <select 
                name="type" 
                value={formData.type || ""} 
                onChange={handleInputChange} 
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
            
            <div className="form-group-edit">
              <label>Status</label>
              <select 
                name="status" 
                value={formData.status || ""} 
                onChange={handleInputChange} 
              >
                <option value="">Select</option>
                <option value="Expressing Intention to Use Modern FP">A - Expressing Intention to Use Modern FP</option>
                <option value="Undecided">B - Undecided</option>
                <option value="Currently Pregnant">C - Currently Pregnant</option>
                <option value="No Intention to Use">D - No Intention to Use</option>
              </select>
            </div>
            
            <div className="form-group-edit">
              <label>Reason</label>
              <select 
                name="reason" 
                value={formData.reason || ""} 
                onChange={handleInputChange} 
              >
                <option value="">Select</option>
                <option value="Spacing">1 - Spacing</option>
                <option value="Limiting">2 - Limiting</option>
                <option value="Achieving">3 - Achieving</option>
              </select>
            </div>

            <div className="form-group-edit">
              <label>Classes Held</label>
              <select 
                name="classes_held" 
                value={formData.classes_held || ""} 
                onChange={handleInputChange} 
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
            </div>  

            <div className="modal-btn-edit" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "15px" }}>
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-edit">Update Record</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ClientEditModal;