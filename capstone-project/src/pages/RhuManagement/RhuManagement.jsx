import "./rhu-management.css";
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  X, 
  ArrowRight, 
  CheckSquare, 
  Square, 
  AlertCircle 
} from 'lucide-react';


// Import Firebase Firestore modules from your project setup
import { db } from '../../firebase-config';
import { notify } from '../../utils/notify';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

// Complete list of 51 barangays matching your exact Firestore document string conventions
const ALL_BARANGAYS = [
  "Anilao", "Atlag", "Babatnin", "Bagna", "Bagong Bayan", 
  "Balayong", "Balite", "Bangkal", "Barihan", "Bulihan", 
  "Bungahan", "Caingin", "Calero", "Caliligawan", "Canalate", 
  "Caniogan", "Catmon", "Cofradia", "Dakila", "Guinhawa", 
  "Liang", "Ligas", "Longos", "Look 1st", "Look 2nd", 
  "Lugam", "Mabolo", "Mambog", "Masile", "Matimbo", 
  "Mojon", "Namayan", "Niugan", "Pamarawan", "Panasahan", 
  "Pinagbakahan", "S. Bata", "S. Matanda", "San Agustin", "San Gabriel", 
  "San Juan", "San Pablo", "San Vicente", "Santisima Trinidad", "Sto. Cristo", 
  "Sto. Nino", "Sto. Rosario", "Santor", "Santiago", "Taal", 
  "Tikay"
];

export default function RhuManagement() {
  const [rhuData, setRhuData] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRhuId, setNewRhuId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [selectedBarangays, setSelectedBarangays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Detail view state
  const [viewRHUId, setViewRHUId] = useState(null);
  const viewedRHU = rhuData.find((item) => item.id === viewRHUId) || null;

  // 1. Fetch RHU documents from Firestore collection
  const fetchRhuData = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "rhu"));
      const rhus = [];
      querySnapshot.forEach((docSnap) => {
        rhus.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setRhuData(rhus);
    } catch (error) {
      console.error("Error fetching RHUs from Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRhuData();
  }, []);

  // Helper to safely format location whether it's a Firestore GeoPoint, string, or empty
  const formatLocation = (loc) => {
    if (!loc) return 'No location set';
    
    // Handles Firestore GeoPoint objects ({ _lat, _long } or { latitude, longitude })
    if (typeof loc === 'object') {
      const lat = loc.latitude ?? loc._lat;
      const lng = loc.longitude ?? loc._long;
      if (lat !== undefined && lng !== undefined) {
        return `[${lat}, ${lng}]`;
      }
      return JSON.stringify(loc);
    }

    return String(loc);
  };

  // Normalizer helper: strips accents, spaces, and special characters for 100% key match accuracy
  const normalizeKey = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // removes accents (e.g. ñ -> n)
      .replace(/[^a-z0-9]/g, "");     // removes dots, spaces, dashes
  };

  // 2. Map every barangay to its active Firestore RHU owner
  const getBarangayOwnerMap = () => {
    const map = {};
    rhuData.forEach((rhu) => {
      if (Array.isArray(rhu.barangays)) {
        rhu.barangays.forEach((b) => {
          const cleanKey = normalizeKey(b);
          if (cleanKey) {
            map[cleanKey] = rhu.id;
          }
        });
      }
    });
    return map;
  };

  const barangayOwnerMap = getBarangayOwnerMap();

  const handleToggleBarangay = (barangayName) => {
    if (selectedBarangays.includes(barangayName)) {
      setSelectedBarangays(selectedBarangays.filter((b) => b !== barangayName));
    } else {
      setSelectedBarangays([...selectedBarangays, barangayName]);
    }
  };

  // 3. CORE FUNCTION: Save new RHU and batch update modified Firestore documents
  const handleAddRhu = async (e) => {
    e.preventDefault();
    if (!newRhuId.trim()) return;

    const formattedRhuId = newRhuId.trim().toLowerCase();

    try {
      const batch = writeBatch(db);

      // A. Remove selected barangays from existing RHU documents in Firestore
      rhuData.forEach((rhu) => {
        if (Array.isArray(rhu.barangays)) {
          const updatedBarangays = rhu.barangays.filter(
            (b) => !selectedBarangays.includes(b)
          );
          if (updatedBarangays.length !== rhu.barangays.length) {
            const rhuRef = doc(db, "rhu", rhu.id);
            batch.update(rhuRef, { barangays: updatedBarangays });
          }
        }
      });

      // B. Create the new RHU document in Firestore
      const newRhuRef = doc(db, "rhu", formattedRhuId);
      batch.set(newRhuRef, {
        barangays: selectedBarangays,
        location: newLocation.trim() || ''
      });

      // Commit all operations atomically
      await batch.commit();

      // Refresh UI state from Firestore
      await fetchRhuData();

      // Reset form & close modal
      setIsModalOpen(false);
      setNewRhuId('');
      setNewLocation('');
      setSelectedBarangays([]);
    } catch (error) {
      console.error("Error creating new RHU in Firestore:", error);
      notify("Failed to save new RHU. Please try again.");
    }
  };

  const filteredBarangays = ALL_BARANGAYS.filter((b) => 
    b.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rhu-management-container">
      {/* Header Section */}
      <div className="rhu-header">
        <div>
          <h2>RHU & Barangay Scope Management</h2>
          <p>Add new RHU documents and manage assigned barangay jurisdictions.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add New RHU
        </button>
      </div>

      {/* Grid of Existing RHU Documents */}
      <div className="rhu-grid">
        {loading ? (
          <p className="text-muted">Loading RHUs from Firestore...</p>
        ) : rhuData.length === 0 ? (
          <div className="empty-state">
            <Building2 size={40} className="empty-icon" />
            <p className="text-muted">No RHU documents found. Click "+ Add New RHU" to begin.</p>
          </div>
        ) : (
          rhuData.map((rhu) => (
            <div key={rhu.id} className="rhu-card">
              <div className="rhu-card-header">
                <span className="rhu-card-icon"><Building2 size={18} /></span>
                <h3>{rhu.id}</h3>
                <span className="badge">{rhu.barangays?.length || 0} Barangays</span>
              </div>

              <div className="rhu-card-preview">
                {rhu.barangays?.length > 0 ? (
                  <>
                    {rhu.barangays.slice(0, 4).map((b) => (
                      <span key={b} className="rhu-chip">{b}</span>
                    ))}
                    {rhu.barangays.length > 4 && (
                      <span className="rhu-chip rhu-chip--more">+{rhu.barangays.length - 4} more</span>
                    )}
                  </>
                ) : (
                  <span className="text-muted">No barangays assigned</span>
                )}
              </div>

              <div className="rhu-card-footer">
                <button className="btn-text" onClick={() => setViewRHUId(rhu.id)}>
                  View Scope <ArrowRight size={14} className="icon-inline" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Scope Modal */}
      {viewedRHU && (
        <div className="rhu-modal-overlay" onClick={() => setViewRHUId(null)}>
          <div className="rhu-modal-content" role="dialog" aria-modal="true" aria-label="RHU scope details" onClick={(e) => e.stopPropagation()}>
            <div className="rhu-modal-header">
              <div className="rhu-modal-title-wrapper">
                <span className="modal-icon-badge">
                  <Building2 size={20} />
                </span>
                <div>
                  <h3>RHU Scope Details</h3>
                  <span className="modal-subtitle">Document ID: <strong>{viewedRHU.id}</strong></span>
                </div>
              </div>
              <button className="rhu-close-btn" onClick={() => setViewRHUId(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="rhu-modal-body-pad">
              {/* Barangays Scope Section */}
              <div className="barangay-scope-section">
                <div className="scope-section-header">
                  <h4>Assigned Barangays</h4>
                  <span className="badge-pill">{viewedRHU.barangays?.length || 0} Assigned</span>
                </div>

                <div className="tag-container-scrollable">
                  {viewedRHU.barangays?.length > 0 ? (
                    viewedRHU.barangays.map((b, idx) => (
                      <span key={idx} className="barangay-tag-pill">
                        <span className="dot-indicator"></span>
                        {b}
                      </span>
                    ))
                  ) : (
                    <div className="empty-scope-state">
                      <AlertCircle size={18} className="text-muted" />
                      <p className="text-muted">No barangays assigned to this RHU.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rhu-modal-actions">
              <button className="btn-secondary" onClick={() => setViewRHUId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New RHU Modal */}
      {isModalOpen && (
        <div className="rhu-modal-overlay">
          <div className="rhu-modal-content rhu-modal-content--wide" role="dialog" aria-modal="true" aria-label="Add new rural health unit">
            <div className="rhu-modal-header">
              <h3>Add New Rural Health Unit</h3>
              <button type="button" className="rhu-close-btn" onClick={() => setIsModalOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddRhu}>
              <div className="rhu-form-body">
              <div className="form-group">
                <label>RHU Document ID (e.g., rhu11)</label>
                <input 
                  type="text" 
                  placeholder="rhu11"
                  value={newRhuId} 
                  onChange={(e) => setNewRhuId(e.target.value)} 
                  required 
                />
              </div>

              {/* Location / Coordinates Input */}
              <div className="form-group">
                <label>Location / Coordinates</label>
                <input 
                  type="text" 
                  placeholder="e.g., [14.839676 N, 120.812345 E]" 
                  value={newLocation} 
                  onChange={(e) => setNewLocation(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <div className="barangay-select-header">
                  <label>Select Barangays ({selectedBarangays.length} selected)</label>
                  <div className="search-box">
                    <Search size={14} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search barangay..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input-sm"
                    />
                  </div>
                </div>
                <p className="help-text">
                  <AlertCircle size={14} className="icon-inline" /> 
                  Checking a barangay will automatically pull it into this new RHU and remove it from its previous document.
                </p>

                <div className="barangay-checkbox-grid">
                  {filteredBarangays.map((bName) => {
                    const isSelected = selectedBarangays.includes(bName);
                    const cleanKey = normalizeKey(bName);
                    const currentOwner = barangayOwnerMap[cleanKey];

                    return (
                      <div 
                        key={bName} 
                        className={`barangay-checkbox-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleBarangay(bName)}
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="checkbox-icon checked" />
                        ) : (
                          <Square size={18} className="checkbox-icon" />
                        )}
                        <div className="barangay-info">
                          <span className="b-name">{bName}</span>
                          <span className={`b-current-tag ${isSelected ? 'will-reassign' : ''}`}>
                            {isSelected 
                              ? '➔ Moving here' 
                              : (currentOwner ? `Currently under: ${currentOwner}` : 'Unassigned')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>

              <div className="rhu-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save New RHU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}