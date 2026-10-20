import ReportSelect from "../ReportSelect/ReportSelect";
import { notify } from "../../utils/notify";
import { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import * as turf from '@turf/turf';
import { httpsCallable } from 'firebase/functions';
import { AdvancedMarker, AdvancedMarkerAnchorPoint, useMap } from '@vis.gl/react-google-maps';
import { X, Eye, Download, FileText, ArrowLeft, Loader2, MapPinned } from 'lucide-react';
import './map-export-modal.css';
import { functions } from '../../firebase-config';
import GoogleMapShell from '../GoogleMap/GoogleMapShell';
import { MALOLOS_CENTER, hasGoogleMapsKey } from '../GoogleMap/mapConfig';
import malolosBarangays from '../../data/malolos-barangays.json';
import { canonicalMethod } from '../../pages/Reports/reportData.js';
import { canvasToPdfBlob } from '../../utils/imagePdf';

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

// The outline of a barangay as lists of {lat, lng}, one list for each separate piece
const outlinesOf = (boundary) => {
  const geometry = boundary?.geometry;
  if (!geometry) return [];
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  return polygons.map((rings) => rings[0].map(([lng, lat]) => ({ lat, lng })));
};

// Draws the barangay outline and frames the barangay: its boundary when the map data has one, otherwise its client pins
function BoundaryAndFraming({ boundary, points, onMap }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return undefined;
    onMap(map);

    const outlines = outlinesOf(boundary);
    const shapes = [];
    if (outlines.length > 0) {
      // a huge square with the barangay cut out of it; the two rings run in opposite directions, which makes the hole
      const around = 0.4;
      const square = [
        { lat: MALOLOS_CENTER.lat - around, lng: MALOLOS_CENTER.lng - around },
        { lat: MALOLOS_CENTER.lat - around, lng: MALOLOS_CENTER.lng + around },
        { lat: MALOLOS_CENTER.lat + around, lng: MALOLOS_CENTER.lng + around },
        { lat: MALOLOS_CENTER.lat + around, lng: MALOLOS_CENTER.lng - around },
      ];
      const area = (ring) => ring.reduce((sum, p, i) => {
        const q = ring[(i + 1) % ring.length];
        return sum + (p.lng * q.lat - q.lng * p.lat);
      }, 0);
      const holes = outlines.map((ring) => (area(ring) * area(square) > 0 ? [...ring].reverse() : ring));
      shapes.push(new window.google.maps.Polygon({
        map,
        paths: [square, ...holes],
        clickable: false,
        strokeWeight: 0,
        fillColor: '#ffffff',
        fillOpacity: 0.4,
      }));
    }
    outlines.forEach((path) => shapes.push(new window.google.maps.Polygon({
      map,
      paths: path,
      clickable: false,
      strokeColor: '#0f172a',
      strokeWeight: 2.5,
      fillOpacity: 0,
    })));

    const bounds = new window.google.maps.LatLngBounds();
    if (outlines.length > 0) {
      outlines.forEach((path) => path.forEach((point) => bounds.extend(point)));
      map.fitBounds(bounds, 18);
    } else if (points.length > 0) {
      points.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      map.fitBounds(bounds, 40);
    }

    return () => {
      shapes.forEach((shape) => shape.setMap(null));
      onMap(null);
    };
  }, [map, boundary, points, onMap]);

  return null;
}

// A plain drawing of the framed view: the barangay outline and the client dots on a light background.
// Used when the map picture cannot be fetched, so an export is still possible.
const outlineOnlyImage = (map, boundary, markers, width, height) => {
  const view = map.getBounds()?.toJSON();
  if (!view) throw new Error('The map has no view yet');

  const mercator = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const top = mercator(view.north);
  const bottom = mercator(view.south);
  const at = (lat, lng) => [
    ((lng - view.west) / (view.east - view.west)) * width,
    ((top - mercator(lat)) / (top - bottom)) * height,
  ];

  const shapes = outlinesOf(boundary)
    .map((ring) => `M${ring.map(({ lat, lng }) => at(lat, lng).map((n) => n.toFixed(1)).join(',')).join('L')}Z`)
    .join(' ');
  const dots = markers.map(({ lat, lng, color }) => {
    const [x, y] = at(lat, lng);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="#${color}"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#e8edf4"/><path d="${shapes}" fill="#ffffff" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>${dots}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// The outline as [lat, lng] pairs, thinned until the map image request stays small
const outlineForImage = (boundary) => {
  const largest = outlinesOf(boundary).sort((a, b) => b.length - a.length)[0];
  if (!largest) return [];

  for (const tolerance of [0.0001, 0.0002, 0.0004, 0.0008]) {
    const ring = turf.simplify(
      turf.polygon([largest.map(({ lat, lng }) => [lng, lat])]),
      { tolerance, highQuality: false }
    ).geometry.coordinates[0];
    if (ring.length <= 350) return ring.map(([lng, lat]) => [lat, lng]);
  }
  return [];
};

export default function MapExportModal({
  isOpen,
  onClose,
  families = [],
  barangayList = [],
  activeFilterBarangay = ''
}) {
  const sheetRef = useRef(null);
  const mapBoxRef = useRef(null);
  const mapRef = useRef(null);
  const canvasRef = useRef(null); // the photographed sheet, kept so it can also be saved as a PDF
  const [staticUrl, setStaticUrl] = useState(null); // the picture of the map that takes the live map's place while the sheet is photographed
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const setMap = useMemo(() => (map) => { mapRef.current = map; }, []);

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
      setStaticUrl(null);
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

  const baseName = `Planwise_Map_${selectedBarangay.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

  const handlePreview = async () => {
    if (!selectedBarangay || !sheetRef.current) return;
    const map = mapRef.current;
    const box = mapBoxRef.current;
    if (!map || !box) {
      notify("The map is not ready yet. Please try again in a moment.");
      return;
    }
    setIsCapturing(true);

    try {
      // the live map cannot be photographed, so Google draws the same view as a picture
      const rect = box.getBoundingClientRect();
      const shrink = Math.min(1, 640 / Math.max(rect.width, rect.height));
      const width = Math.round(rect.width * shrink);
      const height = Math.round(rect.height * shrink);
      const center = map.getCenter();

      const markers = barangayFamilies
        .map((family) => {
          const lat = Number(family.lat ?? family.latitude);
          const lng = Number(family.lng ?? family.longitude);
          if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
          const group = LEGEND_GROUPS.find((g) => g.id === legendGroupOf(family));
          return { lat, lng, color: group.color.replace('#', '') };
        })
        .filter(Boolean);

      let mapPicture;
      try {
        const response = await httpsCallable(functions, 'staticMapImage')({
          center: { lat: center.lat(), lng: center.lng() },
          zoom: Math.round((map.getZoom() ?? 14) + Math.log2(shrink)),
          width,
          height,
          boundary: outlineForImage(boundary),
          markers,
        });
        mapPicture = response.data.image;
      } catch (serviceError) {
        // no map picture: draw the barangay and its clients instead, and say so
        console.warn("Map picture unavailable:", serviceError);
        mapPicture = outlineOnlyImage(map, boundary, markers, Math.round(rect.width), Math.round(rect.height));
        notify("The map picture could not be loaded, so the export shows the barangay outline and its clients on a plain background.");
      }

      flushSync(() => setStaticUrl(mapPicture));
      const image = box.querySelector('img');
      if (image) await image.decode();

      const sheet = sheetRef.current;
      const canvas = await html2canvas(sheet, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        // about 2400px wide, sharp enough to print
        scale: Math.min(4, 2400 / sheet.offsetWidth),
      });

      canvasRef.current = canvas;
      setPreviewUrl(canvas.toDataURL('image/png', 1.0));
    } catch (err) {
      console.error("Export Error:", err);
      notify("There was an error while preparing the map. Please try again.");
    } finally {
      setStaticUrl(null);
      setIsCapturing(false);
    }
  };

  const saveFile = (href, fileName) => {
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = () => {
    saveFile(previewUrl, `${baseName}.png`);
    onClose();
  };

  const handleDownloadPdf = () => {
    if (!canvasRef.current) return;
    try {
      const url = URL.createObjectURL(canvasToPdfBlob(canvasRef.current));
      saveFile(url, `${baseName}.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      console.error("PDF Export Error:", err);
      notify("The PDF could not be created. Please try again.");
    }
  };

  return (
    <div className="mx-overlay" onClick={onClose}>
      <div className="mx-modal" role="dialog" aria-modal="true" aria-label="Export map" onClick={(e) => e.stopPropagation()}>
        <div className="mx-header">
          <div>
            <h3 className="mx-title"><MapPinned size={18} /> Export Barangay Map</h3>
            <p className="mx-subtitle">
              {previewUrl
                ? "This is what will be downloaded, as a PNG image or a PDF."
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
                  <div className="mx-sheet-map" ref={mapBoxRef}>
                    {staticUrl ? (
                      <img src={staticUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : !hasGoogleMapsKey ? (
                      <GoogleMapShell />
                    ) : (
                      <GoogleMapShell
                        defaultCenter={MALOLOS_CENTER}
                        defaultZoom={14}
                        minZoom={11}
                        maxZoom={18}
                        zoomControl
                        faded
                        isFractionalZoomEnabled={false}
                      >
                        <BoundaryAndFraming boundary={boundary} points={points} onMap={setMap} />

                        {barangayFamilies.map((family, idx) => {
                          const lat = Number(family.lat ?? family.latitude);
                          const lng = Number(family.lng ?? family.longitude);
                          if (isNaN(lat) || isNaN(lng) || lat === 0) return null;

                          const group = LEGEND_GROUPS.find(g => g.id === legendGroupOf(family));
                          // white disc with a dark edge under a solid method-colored dot
                          return (
                            <AdvancedMarker
                              key={family.id || idx}
                              position={{ lat, lng }}
                              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
                              clickable={false}
                            >
                              <span style={{
                                display: 'grid',
                                placeItems: 'center',
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: '#ffffff',
                                border: '1.5px solid #0f172a',
                                boxSizing: 'border-box',
                              }}>
                                <span style={{ width: 13, height: 13, borderRadius: '50%', background: group.color }} />
                              </span>
                            </AdvancedMarker>
                          );
                        })}
                      </GoogleMapShell>
                    )}
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
              <button type="button" className="mx-btn mx-btn--primary" onClick={handleDownloadPdf}>
                <FileText size={15} /> Download PDF
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
