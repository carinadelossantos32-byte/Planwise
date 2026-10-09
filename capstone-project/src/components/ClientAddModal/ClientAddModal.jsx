import ReportSelect from "../ReportSelect/ReportSelect";
import { notify } from "../../utils/notify";
import { checkAddressBarangay } from "../../utils/geoHelper";
import { useState, useEffect } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import { findDuplicate } from "../../utils/checkDuplicates";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./client-add-modal.css";

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

function ClientAddModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    spouse_name: "",
    birthdate_male: "",
    birthdate_female: "",
    educational_attainment_male: "",
    educational_attainment_female: "",
    civil_status_male: "",
    civil_status_female: "",
    address: "",
    barangay: "",
    no_of_children: "",
    fp_method: "",
    intention_to_shift: "",
    type: "",
    status: "",
    reason: "",
    latitude: 14.8436,
    longitude: 120.8114,
    classes_held: ""
  });

  const [errors, setErrors] = useState({});
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-geocode based on Address + Barangay
  useEffect(() => {
    if (!formData.address.trim() && !formData.barangay.trim()) return;

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
    }, 1000);

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
        if (errors.latitude || errors.longitude) {
          setErrors((prev) => ({ ...prev, latitude: "", longitude: "" }));
        }
      }
    });
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCoordinateChange = (e) => {
    const { name, value } = e.target;
    const val = value === "" ? "" : parseFloat(value);
    setFormData((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    let newErrors = {};
    let isValid = true;

    const mandatoryFields = [
      "name",
      "spouse_name",
      "birthdate_male",
      "birthdate_female",
      "educational_attainment_male",
      "educational_attainment_female",
      "civil_status_male",
      "civil_status_female",
      "address",
      "barangay",
      "no_of_children",
      "fp_method",
      "latitude",
      "longitude",
      "classes_held"
    ];

    mandatoryFields.forEach((key) => {
      const val = formData[key];
      if (
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "") ||
        (typeof val === "number" && isNaN(val))
      ) {
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
      const cleanedData = {
        ...formData,
        name: formData.name.trim(),
        spouse_name: formData.spouse_name.trim()
      };

      const duplicate = await findDuplicate("clients_public", "public", cleanedData);

      if (duplicate) {
        setExistingRecord(duplicate);
        setDupModalOpen(true);
        return;
      }

      await saveRecord();
    } catch (err) {
      console.error("findDuplicate error:", err);
      notify("Error checking for duplicates: " + err.message);
    }
  };

  const saveRecord = async (overwriteId = null) => {
    try {
      if (overwriteId) {
        await setDoc(doc(db, "clients_public", overwriteId), {
          ...formData,
          is_archived: false,
          updated_at: serverTimestamp(),
        }, { merge: true });
      } else {
        await addDoc(collection(db, "clients_public"), {
          ...formData,
          is_archived: false,
          created_at: serverTimestamp(),
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving public client:", error);
    }
  };

  const comparisonFields = [
    { label: "Male Partner", key: "name" },
    { label: "Female Partner", key: "spouse_name" },
    { label: "Birthdate (M)", key: "birthdate_male" },
    { label: "Birthdate (F)", key: "birthdate_female" },
    { label: "Address", key: "address" },
    { label: "Barangay", key: "barangay" },
    { label: "Latitude", key: "latitude" },
    { label: "Longitude", key: "longitude" },
    { label: "FP Method", key: "fp_method" },
    { label: "No. of Children", key: "no_of_children" },
    { label: "Civil Status (M)", key: "civil_status_male" },
    { label: "Civil Status (F)", key: "civil_status_female" },
    { label: "Education (M)", key: "educational_attainment_male" },
    { label: "Education (F)", key: "educational_attainment_female" },
    { label: "Intention to Shift", key: "intention_to_shift" },
    { label: "Type", key: "type" },
    { label: "Status", key: "status" },
    { label: "Reason", key: "reason" },
    { label: "Classes Held", key: "classes_held" }
  ];

return (
    <>
      <div className="cfpr-overlay">
        <div className="cfpr-modal" id="cfpr-modal-root" role="dialog" aria-labelledby="cfpr-title">

          <div className="cfpr-header">
            <h2 id="cfpr-title" className="cfpr-title">Create New Public Record</h2>
            <p className="cfpr-subtitle">
              Please verify that all entries are correct and no fields remain empty for secure processing.
            </p>
          </div>

          <form onSubmit={handleAdd} className="cfpr-form">
            <div className="cfpr-body">

              {/* ── Partner Information ───────────────────────── */}
              <section className="cfpr-section">
                <h3 className="cfpr-section-title">Partner Information</h3>

                <div className="cfpr-paired">
                  <span className="cfpr-paired-label">Name</span>
                  <div className="cfpr-paired-cols">
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-male">Male</span>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Male Partner"
                        className={`cfpr-input ${errors.name ? "cfpr-input-error" : ""}`}
                      />
                      {errors.name && <span className="cfpr-error-text">{errors.name}</span>}
                    </div>
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-female">Female</span>
                      <input
                        name="spouse_name"
                        value={formData.spouse_name}
                        onChange={handleInputChange}
                        placeholder="Female Partner"
                        className={`cfpr-input ${errors.spouse_name ? "cfpr-input-error" : ""}`}
                      />
                      {errors.spouse_name && <span className="cfpr-error-text">{errors.spouse_name}</span>}
                    </div>
                  </div>
                </div>

                <div className="cfpr-paired">
                  <span className="cfpr-paired-label">Birthdate</span>
                  <div className="cfpr-paired-cols">
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-male">Male</span>
                      <input
                        type="date"
                        name="birthdate_male"
                        value={formData.birthdate_male}
                        onChange={handleInputChange}
                        className={`cfpr-input ${errors.birthdate_male ? "cfpr-input-error" : ""}`}
                      />
                      {errors.birthdate_male && <span className="cfpr-error-text">{errors.birthdate_male}</span>}
                    </div>
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-female">Female</span>
                      <input
                        type="date"
                        name="birthdate_female"
                        value={formData.birthdate_female}
                        onChange={handleInputChange}
                        className={`cfpr-input ${errors.birthdate_female ? "cfpr-input-error" : ""}`}
                      />
                      {errors.birthdate_female && <span className="cfpr-error-text">{errors.birthdate_female}</span>}
                    </div>
                  </div>
                </div>

                <div className="cfpr-paired">
                  <span className="cfpr-paired-label">Educational Attainment</span>
                  <div className="cfpr-paired-cols">
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-male">Male</span>
                      <ReportSelect
                        className="form-select"
                        name="educational_attainment_male"
                        ariaLabel="educational attainment male"
                        value={formData.educational_attainment_male}
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
                        <span className="cfpr-error-text">{errors.educational_attainment_male}</span>
                      )}
                    </div>
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-female">Female</span>
                      <ReportSelect
                        className="form-select"
                        name="educational_attainment_female"
                        ariaLabel="educational attainment female"
                        value={formData.educational_attainment_female}
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
                        <span className="cfpr-error-text">{errors.educational_attainment_female}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="cfpr-paired">
                  <span className="cfpr-paired-label">Civil Status</span>
                  <div className="cfpr-paired-cols">
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-male">Male</span>
                      <ReportSelect
                        className="form-select"
                        name="civil_status_male"
                        ariaLabel="civil status male"
                        value={formData.civil_status_male}
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
                      {errors.civil_status_male && <span className="cfpr-error-text">{errors.civil_status_male}</span>}
                    </div>
                    <div className="cfpr-group">
                      <span className="cfpr-tag cfpr-tag-female">Female</span>
                      <ReportSelect
                        className="form-select"
                        name="civil_status_female"
                        ariaLabel="civil status female"
                        value={formData.civil_status_female}
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
                      {errors.civil_status_female && <span className="cfpr-error-text">{errors.civil_status_female}</span>}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Location ──────────────────────────────────── */}
              <section className="cfpr-section">
                <h3 className="cfpr-section-title">Location</h3>

                <div className="cfpr-grid-2">
                  <div className="cfpr-group">
                    <label className="cfpr-label">
                      Address{" "}
                      {isSearching && <span className="cfpr-searching">(Searching Map...)</span>}
                    </label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Address"
                      className={`cfpr-input ${errors.address ? "cfpr-input-error" : ""}`}
                    />
                    {errors.address && <span className="cfpr-error-text">{errors.address}</span>}
                  </div>

                  <div className="cfpr-group">
                    <label className="cfpr-label">Barangay</label>
                    <input
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleInputChange}
                      placeholder="Barangay"
                      className={`cfpr-input ${errors.barangay ? "cfpr-input-error" : ""}`}
                    />
                    {errors.barangay && <span className="cfpr-error-text">{errors.barangay}</span>}
                  </div>

                  <div className="cfpr-group">
                    <label className="cfpr-label">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleCoordinateChange}
                      className={`cfpr-input ${errors.latitude ? "cfpr-input-error" : ""}`}
                    />
                    {errors.latitude && <span className="cfpr-error-text">{errors.latitude}</span>}
                  </div>

                  <div className="cfpr-group">
                    <label className="cfpr-label">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleCoordinateChange}
                      className={`cfpr-input ${errors.longitude ? "cfpr-input-error" : ""}`}
                    />
                    {errors.longitude && <span className="cfpr-error-text">{errors.longitude}</span>}
                  </div>
                </div>

                <div className="cfpr-map-wrap" id="cfpr-map-wrap">
                  <label className="cfpr-label">Location Visual Verification</label>
                  <div className="cfpr-map-frame">
                    <MapContainer
                      center={[formData.latitude || 14.8436, formData.longitude || 120.8114]}
                      zoom={13}
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
              <section className="cfpr-section">
                <h3 className="cfpr-section-title">Family Planning Details</h3>

                <div className="cfpr-grid-2">
                  <div className="cfpr-group">
                    <label className="cfpr-label">No. of Children</label>
                    <input
                      type="number"
                      name="no_of_children"
                      value={formData.no_of_children}
                      onChange={handleInputChange}
                      min="0"
                      className={`cfpr-input ${errors.no_of_children ? "cfpr-input-error" : ""}`}
                    />
                    {errors.no_of_children && <span className="cfpr-error-text">{errors.no_of_children}</span>}
                  </div>

                  <div className="cfpr-group">
                    <label className="cfpr-label">Method Used</label>
                    <ReportSelect
                      className="form-select"
                      name="fp_method"
                      ariaLabel="fp method"
                      value={formData.fp_method}
                      onChange={handleInputChange}
                      hasError={Boolean(errors.fp_method)}
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
                    {errors.fp_method && <span className="cfpr-error-text">{errors.fp_method}</span>}
                  </div>

                  <div className="cfpr-group">
                    <label className="cfpr-label">Intention to Shift</label>
                    <ReportSelect
                      className="form-select"
                      name="intention_to_shift"
                      ariaLabel="intention to shift"
                      value={formData.intention_to_shift}
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

                  <div className="cfpr-group">
                    <label className="cfpr-label">Traditional FP User: Type</label>
                    <ReportSelect
                      className="form-select"
                      name="type"
                      ariaLabel="type"
                      value={formData.type}
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

                  <div className="cfpr-group">
                    <label className="cfpr-label">Traditional FP User: Status</label>
                    <ReportSelect
                      className="form-select"
                      name="status"
                      ariaLabel="status"
                      value={formData.status}
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

                  <div className="cfpr-group">
                    <label className="cfpr-label">Reason</label>
                    <ReportSelect
                      className="form-select"
                      name="reason"
                      ariaLabel="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      options={[
                        { value: "", label: "Select" },
                        { value: "Spacing", label: "1 - Spacing" },
                        { value: "Limiting", label: "2 - Limiting" },
                        { value: "Achieving", label: "3 - Achieving" },
                      ]}
                    />
                  </div>

                  <div className="cfpr-group cfpr-span-2">
                    <label className="cfpr-label">Classes Held</label>
                    <ReportSelect
                      className="form-select"
                      name="classes_held"
                      ariaLabel="classes held"
                      value={formData.classes_held}
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
                    {errors.classes_held && <span className="cfpr-error-text">{errors.classes_held}</span>}
                  </div>
                </div>
              </section>

            </div>

            <div className="cfpr-footer">
              <button type="button" className="cfpr-btn cfpr-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="cfpr-btn cfpr-btn-save">
                Create Record
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── DUPLICATE COMPARISON MODAL ── */}
      {dupModalOpen && existingRecord && (
        <div className="cfpr-dup-overlay">
          <div className="cfpr-dup-modal" id="cfpr-dup-modal-root">
            <div className="cfpr-dup-header">
              <h2 className="cfpr-dup-title">⚠ Duplicate Record Found</h2>
            </div>
            <div className="cfpr-dup-body">
              <p className="cfpr-dup-subtitle">
                A record with the same husband and wife name already exists.
                Review the differences below and choose how to proceed.
              </p>

              <div className="cfpr-dup-grid">
                <div className="cfpr-dup-col">
                  <div className="cfpr-dup-col-header cfpr-dup-col-header-new">⬆ New Entry (yours)</div>
                  {comparisonFields.map(({ label, key }) => (
                    <div
                      key={key}
                      className={`cfpr-dup-row ${formData[key] !== existingRecord[key] ? "cfpr-dup-row-diff" : ""}`}
                    >
                      <span className="cfpr-dup-row-label">{label}</span>
                      <span>{formData[key] !== undefined && formData[key] !== null ? String(formData[key]) : "—"}</span>
                    </div>
                  ))}
                </div>

                <div className="cfpr-dup-col">
                  <div className="cfpr-dup-col-header cfpr-dup-col-header-existing">📁 Existing (in database)</div>
                  {comparisonFields.map(({ label, key }) => (
                    <div
                      key={key}
                      className={`cfpr-dup-row ${formData[key] !== existingRecord[key] ? "cfpr-dup-row-diff" : ""}`}
                    >
                      <span className="cfpr-dup-row-label">{label}</span>
                      <span>{existingRecord[key] !== undefined && existingRecord[key] !== null ? String(existingRecord[key]) : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="cfpr-dup-legend">🟡 Highlighted fields have different values.</p>

              <div className="cfpr-dup-actions">
                <button
                  type="button"
                  className="cfpr-dup-btn cfpr-dup-btn-cancel"
                  onClick={() => { setDupModalOpen(false); setExistingRecord(null); }}
                >
                  Cancel (go back)
                </button>
                <button
                  type="button"
                  className="cfpr-dup-btn cfpr-dup-btn-skip"
                  onClick={() => { setDupModalOpen(false); onClose(); }}
                >
                  Skip (don't save)
                </button>
                <button
                  type="button"
                  className="cfpr-dup-btn cfpr-dup-btn-overwrite"
                  onClick={() => { setDupModalOpen(false); saveRecord(existingRecord.id); }}
                >
                  Overwrite Existing
                </button>
                <button
                  type="button"
                  className="cfpr-dup-btn cfpr-dup-btn-save"
                  onClick={() => { setDupModalOpen(false); saveRecord(); }}
                >
                  Save as New
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

}

export default ClientAddModal;