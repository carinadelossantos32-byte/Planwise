import ReportSelect from "../ReportSelect/ReportSelect";
import { notify } from "../../utils/notify";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, GeoJSON, useMap } from 'react-leaflet';
import { X, Eye, Download, ArrowLeft, Loader2, MapPinned } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './map-export-modal.css';
import malolosBarangays from '../../data/malolos-barangays.json';
import { canonicalMethod } from '../../pages/Reports/reportData.js';

const MALOLOS_CENTER = [14.844782, 120.812683];

// One dot color per method, listed in the legend of the exported sheet
const LEGEND_GROUPS = [
  { id: 'btl', label: 'BTL', color: '#6D28D9' },
  { id: 'nsv', label: 'NSV', color: '#1D4ED8' },
  { id: 'iud', label: 'IUD', color: '#0EA5E9' },
  { id: 'implant', label: 'Implant', color: '#0D9488' },
  { id: 'pills', label: 'Pills', color: '#DB2777' },
  { id: 'condom', label: 'Condom', color: '#F97316' },
  // not listed in the legend; its clients are still plotted and counted
  { id: 'dmpa', label: 'DMPA', color: '#16A34A', hidden: true },
  { id: 'nfp', label: 'NFP', color: '#CA8A04' },
  { id: 'traditional', label: 'Traditional', color: '#92400E' },
  { id: 'pregnant', label: 'Pregnant', color: '#DC2626' },
  { id: 'none', label: 'No Method', color: '#64748B' },
];

const METHOD_GROUP = {
  'Tubal Ligation': 'btl',
  'Vasectomy': 'nsv',
  'IUD': 'iud',
  'Implant': 'implant',
  'Pills': 'pills',
  'Condom': 'condom',
  'Injectable': 'dmpa',
  'CMM': 'nfp',
  'BBT': 'nfp',
  'STM': 'nfp',
  'SDM': 'nfp',
  'LAM': 'nfp',
};

const TRADITIONAL = ['withdrawal', 'rhythm', 'calendar', 'abstinence', 'herbal', 'traditional'];

const clean = (value) => String(value || '').trim().toLowerCase().replace(/ñ/g, 'n');

function legendGroupOf(family) {
  if (clean(family.status).includes('pregnan')) return 'pregnant';

  const group = METHOD_GROUP[canonicalMethod(family.fp_method)];
  if (group) return group;

  return TRADITIONAL.includes(clean(family.fp_method)) ? 'traditional' : 'none';
}

// Frames the barangay: its boundary when the map data has one, otherwise its client pins
function FitToBarangay({ boundary, points }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    if (boundary) {
      map.fitBounds(L.geoJSON(boundary).getBounds(), { padding: [18, 18], animate: false });
    } else if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 17, animate: false });
    }
  }, [boundary, points, map]);

  return null;
}

export default function MapExportModal({
  isOpen,
  onClose,
  families = [],
  barangayList = [],
  activeFilterBarangay = ''
}) {
  const sheetRef = useRef(null);
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

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
      setPreviewUrl(null);
      if (activeFilterBarangay && activeFilterBarangay !== 'ALL') {
        setSelectedBarangay(activeFilterBarangay);
      } else {
        setSelectedBarangay('');
      }
    }
  }, [isOpen, activeFilterBarangay]);

  const boundary = useMemo(() => (
    malolosBarangays.features.find(
      feature => clean(feature.properties.adm4_name) === clean(selectedBarangay)
    ) || null
  ), [selectedBarangay]);

  const barangayFamilies = useMemo(() => (
    selectedBarangay
      ? families.filter(f => clean(f.barangay || f.location?.barangay) === clean(selectedBarangay))
      : []
  ), [families, selectedBarangay]);

  const points = useMemo(() => (
    barangayFamilies
      .map(f => [Number(f.lat ?? f.latitude), Number(f.lng ?? f.longitude)])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng) && lat !== 0)
  ), [barangayFamilies]);

  const legend = useMemo(() => {
    const counts = {};
    barangayFamilies.forEach(f => {
      const id = legendGroupOf(f);
      counts[id] = (counts[id] || 0) + 1;
    });
    return LEGEND_GROUPS
      .filter(group => !group.hidden)
      .map(group => ({ ...group, count: counts[group.id] || 0 }));
  }, [barangayFamilies]);

  if (!isOpen) return null;

  const fileName = `Planwise_Map_${selectedBarangay.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;

  const handlePreview = async () => {
    if (!selectedBarangay || !sheetRef.current) return;
    setIsCapturing(true);

    try {
      const sheet = sheetRef.current;
      const canvas = await html2canvas(sheet, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        // about 2400px wide, sharp enough to print
        scale: Math.min(4, 2400 / sheet.offsetWidth),
        ignoreElements: (element) => element.classList.contains('leaflet-control-zoom')
      });

      setPreviewUrl(canvas.toDataURL('image/png', 1.0));
    } catch (err) {
      console.error("Export Error:", err);
      notify("There was an error while preparing the map. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.setAttribute('href', previewUrl);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  return (
    <div className="mx-overlay" onClick={onClose}>
      <div className="mx-modal" role="dialog" aria-modal="true" aria-label="Export map" onClick={(e) => e.stopPropagation()}>
        <div className="mx-header">
          <div>
            <h3 className="mx-title"><MapPinned size={18} /> Export Barangay Map</h3>
            <p className="mx-subtitle">
              {previewUrl
                ? "This is the image that will be downloaded."
                : "Pick a barangay, then drag or zoom the map to frame it."}
            </p>
          </div>
          <button type="button" className="mx-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mx-body">
          {!previewUrl && (
            <div className="mx-field">
              <span className="mx-field-label">Barangay</span>
              <ReportSelect
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                options={masterBarangayList.map((bgy) => ({ value: bgy, label: bgy }))}
                ariaLabel="Barangay"
                placeholder="Select barangay"
              />
            </div>
          )}

          {previewUrl ? (
            <img src={previewUrl} alt={`Export preview for Barangay ${selectedBarangay}`} className="mx-preview-image" />
          ) : !selectedBarangay ? (
            <div className="mx-placeholder">
              <MapPinned size={28} />
              <span>Select a barangay to lay out its map.</span>
            </div>
          ) : (
            <div className="mx-sheet" ref={sheetRef}>
              <div className="mx-sheet-frame">
                <div className="mx-sheet-main">
                  <div className="mx-sheet-map">
                    <MapContainer
                      center={MALOLOS_CENTER}
                      zoom={14}
                      minZoom={11}
                      maxZoom={18}
                      zoomSnap={0.25}
                      preferCanvas={true}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        crossOrigin={true}
                        opacity={0.6}
                      />
                      <FitToBarangay boundary={boundary} points={points} />

                      {boundary && (
                        <GeoJSON
                          key={selectedBarangay}
                          data={boundary}
                          interactive={false}
                          style={{ color: '#0f172a', weight: 2.5, fillColor: '#ffffff', fillOpacity: 0.35 }}
                        />
                      )}

                      {barangayFamilies.map((family, idx) => {
                        const lat = Number(family.lat ?? family.latitude);
                        const lng = Number(family.lng ?? family.longitude);
                        if (isNaN(lat) || isNaN(lng) || lat === 0) return null;

                        const group = LEGEND_GROUPS.find(g => g.id === legendGroupOf(family));
                        // white disc with a dark edge under a solid method-colored dot
                        return (
                          <React.Fragment key={family.id || idx}>
                            <CircleMarker
                              center={[lat, lng]}
                              radius={10}
                              interactive={false}
                              pathOptions={{ color: '#0f172a', weight: 1.5, fillColor: '#ffffff', fillOpacity: 1 }}
                            />
                            <CircleMarker
                              center={[lat, lng]}
                              radius={6.5}
                              interactive={false}
                              pathOptions={{ stroke: false, fillColor: group.color, fillOpacity: 1 }}
                            />
                          </React.Fragment>
                        );
                      })}
                    </MapContainer>
                  </div>

                  <div className="mx-sheet-legend">
                    <span className="mx-legend-title">Legend</span>
                    <ul>
                      {legend.map(item => (
                        <li key={item.id}>
                          <span className="mx-legend-dot" style={{ backgroundColor: item.color }}></span>
                          <span className="mx-legend-label">{item.label}</span>
                          <span className="mx-legend-count">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mx-legend-total">
                      <span>Total clients</span>
                      <strong>{barangayFamilies.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="mx-sheet-title">
                  <strong>Boundary Map of Barangay {selectedBarangay}</strong>
                  <span>
                    Family planning clients by method · City of Malolos · {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mx-footer">
          {previewUrl ? (
            <>
              <button type="button" className="mx-btn mx-btn--outline" onClick={() => setPreviewUrl(null)}>
                <ArrowLeft size={15} /> Back to adjust
              </button>
              <button type="button" className="mx-btn mx-btn--primary" onClick={handleDownload}>
                <Download size={15} /> Download PNG
              </button>
            </>
          ) : (
            <>
              <button type="button" className="mx-btn mx-btn--outline" onClick={onClose} disabled={isCapturing}>
                Cancel
              </button>
              <button
                type="button"
                className="mx-btn mx-btn--primary"
                onClick={handlePreview}
                disabled={isCapturing || !selectedBarangay}
              >
                {isCapturing
                  ? <><Loader2 size={15} className="mx-spin" /> Preparing preview...</>
                  : <><Eye size={15} /> Preview export</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
