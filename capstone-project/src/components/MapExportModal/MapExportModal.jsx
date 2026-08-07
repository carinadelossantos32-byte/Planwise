import React, { useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import './map-export-modal.css';

export default function MapExportModal({ 
  isOpen, 
  onClose, 
  families = [], 
  barangayList = [],
  activeFilterBarangay = '', 
  mapRef, 
  onSelectBarangayForExport 
}) {
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const masterBarangayList = useMemo(() => {
    if (barangayList && barangayList.length > 0) {
      return barangayList;
    }
    
    const set = new Set();
    families.forEach(f => {
      const bgy = f.barangay || f.location?.barangay;
      if (bgy) set.add(bgy.toString().trim());
    });
    
    return Array.from(set).sort();
  }, [barangayList, families]);

  useEffect(() => {
    if (isOpen) {
      if (activeFilterBarangay && activeFilterBarangay !== 'ALL') {
        setSelectedBarangay(activeFilterBarangay);
      } else {
        setSelectedBarangay('');
      }
    }
  }, [isOpen, activeFilterBarangay]);

  if (!isOpen) return null;

  const handleBarangayChange = (e) => {
    const newBarangay = e.target.value;
    setSelectedBarangay(newBarangay);
    
    // Automatic zoom sa napiling barangay
    if (newBarangay && typeof onSelectBarangayForExport === 'function') {
      onSelectBarangayForExport(newBarangay);
    }
  };

  const handleExport = async () => {
    if (!selectedBarangay) return; 
    setIsExporting(true);

    try {
      if (typeof onSelectBarangayForExport === 'function') {
        onSelectBarangayForExport(selectedBarangay);
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));

      await exportMapAsImage();
      onClose();
    } catch (err) {
      console.error("Export Error:", err);
      alert("Nagka-error sa pag-export ng mapa.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportMapAsImage = async () => {
    const mapElement = mapRef?.current || document.querySelector('.leaflet-container');

    if (!mapElement) {
      alert("No map element found.");
      return;
    }

    const canvas = await html2canvas(mapElement, {
      useCORS: true,
      allowTaint: false,
      logging: false,
      scale: 4,
      dpi: 300,
      ignoreElements: (element) => {
        return element.classList.contains('leaflet-control-zoom') || 
               element.classList.contains('layer-menu-popup') ||
               element.classList.contains('custom-toolbar') ||
               element.classList.contains('modal-overlay');
      }
    });

    const imageUri = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    const cleanBgyName = selectedBarangay.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Planwise_Map_${cleanBgyName}_${new Date().toISOString().slice(0,10)}.png`;

    link.setAttribute('href', imageUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fa-solid fa-map-location-dot"></i> Export Map Image</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Select Target Barangay:</label>
            <select 
              value={selectedBarangay} 
              onChange={handleBarangayChange}
              className="modal-select"
            >
              {/* 🌟 DISABLED PLACEHOLDER OPTION */}
              <option value="" disabled hidden>
                -- Select Barangay --
              </option>

              {masterBarangayList.map((bgy, idx) => (
                <option key={idx} value={bgy}>{bgy}</option>
              ))}
            </select>

            <small style={{ color: '#666', marginTop: '6px', display: 'block' }}>
              Selecting a specific barangay will automatically zoom and center the map before export.
            </small>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          
          <button 
            className="btn-primary" 
            onClick={handleExport} 
            disabled={isExporting || !selectedBarangay}
            style={{
              opacity: (!selectedBarangay || isExporting) ? 0.6 : 1,
              cursor: (!selectedBarangay || isExporting) ? 'not-allowed' : 'pointer'
            }}
          >
            {isExporting ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Capturing Map...</>
            ) : (
              <><i className="fa-solid fa-download"></i> Download Map PNG</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}