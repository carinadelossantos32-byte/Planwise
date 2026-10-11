import { useEffect, useMemo, useRef, useState } from 'react';
import { AdvancedMarker, AdvancedMarkerAnchorPoint, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import GoogleMapShell from '../GoogleMap/GoogleMapShell';
import { MALOLOS_CENTER } from '../GoogleMap/mapConfig';
import './map-display.css';
import HeatmapLayer from './HeatmapLayer';

// which color class a client's dot gets, from the family planning method
const colorClassOf = (family) => {
  let rawMethod = "";

  if (family?.fp_method && family.fp_method.trim() !== "") {
    rawMethod = family.fp_method;
  } else if (family?.type && family.type.trim() !== "") {
    rawMethod = family.type;
  } else if (family?.methodUsed) {
    rawMethod = family.methodUsed;
  } else if (family?.traditionalType) {
    rawMethod = family.traditionalType;
  } else if (family?.fpMethod) {
    rawMethod = family.fpMethod;
  }

  const safeMethod = rawMethod ? rawMethod.toString().trim().toLowerCase() : "no method";

  if (['pills', 'condom', 'injectable', 'short-acting'].includes(safeMethod)) return 'color-short-modern';
  if (['implant', 'iud', 'long-acting'].includes(safeMethod)) return 'color-long-acting';
  if (['vasectomy', 'tubal ligation', 'btl', 'modern'].includes(safeMethod)) return 'color-permanent-modern';
  if (['withdrawal', 'rhythm', 'calendar', 'abstinence', 'herbal', 'traditional'].includes(safeMethod)) return 'color-traditional';
  if (['cmm/billings', 'billings', 'bbt', 'sympto-thermal', 'sdm', 'lam', 'natural'].includes(safeMethod)) return 'color-natural-modern';
  return 'color-no-method';
};

// grows with zoom so client pins stay clear of the street map's own icons
const dotSizeAt = (zoom) => Math.max(20, Math.min(34, (zoom - 12) * 3 + 20));

// A dot drawn for the clusterer, which needs plain DOM elements instead of React
const makeDotElement = (family, zoom) => {
  const size = dotSizeAt(zoom);
  const wrapper = document.createElement('div');
  wrapper.className = 'map-fa-marker';
  wrapper.style.transform = 'translate(0, 50%)'; // a marker sits on its point by its bottom edge; this centers the dot on it
  const dot = document.createElement('span');
  dot.className = `map-client-dot ${colorClassOf(family)}`;
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  wrapper.appendChild(dot);
  return wrapper;
};

const clusterElement = (count) => {
  let sizeClass = 'cluster-small';
  if (count > 20) sizeClass = 'cluster-medium';
  if (count > 50) sizeClass = 'cluster-large';

  const element = document.createElement('div');
  element.className = `custom-marker-cluster ${sizeClass}`;
  element.style.width = '40px';
  element.style.height = '40px';
  element.style.transform = 'translate(0, 50%)';
  element.innerHTML = `<div class="custom-cluster-inner"><span>${count}</span></div>`;
  return element;
};

// Groups nearby clients into numbered circles; zooming in or clicking a circle opens it up
function ClusteredClients({ families, getCoords, zoom, onMarkerClick }) {
  const map = useMap();
  const markerLibrary = useMapsLibrary('marker');
  const clickRef = useRef(onMarkerClick);
  useEffect(() => { clickRef.current = onMarkerClick; });

  useEffect(() => {
    if (!map || !markerLibrary) return undefined;

    const markers = [];
    families.forEach((family) => {
      const coords = getCoords(family);
      if (!coords) return;
      const marker = new markerLibrary.AdvancedMarkerElement({
        position: { lat: coords[0], lng: coords[1] },
        content: makeDotElement(family, zoom),
      });
      marker.addListener('click', () => {
        if (clickRef.current) clickRef.current(family);
      });
      markers.push(marker);
    });

    const clusterer = new MarkerClusterer({
      map,
      markers,
      algorithmOptions: { radius: 50 },
      renderer: {
        render: ({ count, position }) =>
          new markerLibrary.AdvancedMarkerElement({ position, content: clusterElement(count) }),
      },
    });

    return () => {
      clusterer.clearMarkers();
      clusterer.setMap(null);
      markers.forEach((marker) => { marker.map = null; });
    };
  }, [map, markerLibrary, families, getCoords, zoom]);

  return null;
}

// Keeps the map's zoom and the zoom buttons of the page in step
function ZoomSync({ zoomLevel, onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return undefined;
    const listener = map.addListener('zoom_changed', () => {
      const zoom = map.getZoom();
      if (onZoomChange && zoom != null) onZoomChange(zoom);
    });
    return () => listener.remove();
  }, [map, onZoomChange]);

  useEffect(() => {
    if (map && map.getZoom() !== zoomLevel) map.setZoom(zoomLevel);
  }, [zoomLevel, map]);

  return null;
}

// Change map view to the selected barangay center
function ChangeMapView({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !center?.coordinates?.lat || !center?.coordinates?.lng) return;
    map.panTo({ lat: center.coordinates.lat, lng: center.coordinates.lng });
    map.setZoom(17);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.timestamp, map]);

  return null;
}

// Frames the clients of the selected barangay
export function BarangayFocusController({ selectedBarangay, families }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedBarangay || selectedBarangay === 'ALL') return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;
    families.forEach((f) => {
      const bgy = f.barangay || f.location?.barangay || '';
      if (bgy.toString().trim().toLowerCase() !== selectedBarangay.toString().trim().toLowerCase()) return;
      const lat = Number(f.lat ?? f.latitude ?? f.location?.lat);
      const lng = Number(f.lng ?? f.longitude ?? f.location?.lng);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return;
      bounds.extend({ lat, lng });
      count += 1;
    });

    if (count === 0) return;
    map.fitBounds(bounds, 15);
    const once = window.google.maps.event.addListenerOnce(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > 18) map.setZoom(18);
    });
    return () => once.remove();
  }, [selectedBarangay, families, map]);

  return null;
}

function RhuWarningMarkers({ markers }) {
  const [openId, setOpenId] = useState(null);
  const open = markers.find((m) => m.id === openId);

  return (
    <>
      {markers.map((rhuMarker) => (
        <AdvancedMarker
          key={rhuMarker.id}
          position={{ lat: rhuMarker.lat, lng: rhuMarker.lng }}
          zIndex={600}
          onClick={() => setOpenId(rhuMarker.id)}
        >
          <div style={{
            backgroundColor: '#EF4444',
            width: '32px',
            height: '32px',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #FFFFFF',
            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.45)',
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ transform: 'rotate(45deg)', color: '#FFFFFF', fontSize: '14px' }}></i>
          </div>
        </AdvancedMarker>
      ))}

      {open && (
        <InfoWindow
          position={{ lat: open.lat, lng: open.lng }}
          pixelOffset={[0, -36]}
          onCloseClick={() => setOpenId(null)}
        >
          <div style={{ minWidth: '220px', padding: '6px' }}>
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '8px' }}>
              <h3 style={{ margin: '0 0 2px 0', paddingRight: '24px', fontSize: '14px', color: '#0F172A', fontWeight: '700' }}>
                {open.rhuName}
              </h3>
              {open.address && (
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  📍 {open.address}
                </span>
              )}
            </div>

            {/* Warning Badge Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#991B1B',
              backgroundColor: '#FEE2E2',
              marginBottom: '10px'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>Low Stock Alert</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {open.lowStockMethods && open.lowStockMethods.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                    borderBottom: '1px dashed #F1F5F9',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: '600', color: '#334155' }}>
                      {item.method}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '4px' }}>
                      (limit: {item.limit})
                    </span>
                  </div>
                  <span style={{
                    fontWeight: '700',
                    color: item.count === 0 ? '#DC2626' : '#C2410C',
                    backgroundColor: item.count === 0 ? '#FEF2F2' : '#FFEDD5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}>
                    {item.count} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

const getCoords = (f) => {
  if (!f) return null;
  const lat = f.lat ?? f.latitude ?? f.location?.lat;
  const lng = f.lng ?? f.longitude ?? f.location?.lng;
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    return [Number(lat), Number(lng)];
  }
  return null;
};

export default function MapDisplay({
  families = [],
  currentZoom = 13,
  onZoomChange,
  barangayCenter,
  onMarkerClick,
  userLocation,
  mapMode = 'markers',
  filteredFamilies,
  activeLayer = 'standard',
  selectedBarangay = 'ALL',
  rhuWarningMarkers = []
}) {
  const activeFamilies = Array.isArray(filteredFamilies) ? filteredFamilies : families;

  const heatPoints = useMemo(() => (
    activeFamilies
      .map((f) => {
        const coords = getCoords(f);
        return coords ? [...coords, 1] : null;
      })
      .filter(Boolean)
  ), [activeFamilies]);

  const dotSize = dotSizeAt(currentZoom);

  return (
    <GoogleMapShell
      defaultCenter={MALOLOS_CENTER}
      defaultZoom={currentZoom}
      minZoom={3}
      maxZoom={18}
      faded
      // "hybrid" is the satellite view with street names on it
      mapTypeId={activeLayer === 'satellite' ? 'hybrid' : 'roadmap'}
    >
      <BarangayFocusController selectedBarangay={selectedBarangay} families={families} />

      {/* Change map view to the selected barangay center */}
      {barangayCenter && <ChangeMapView center={barangayCenter} />}
      <ZoomSync zoomLevel={currentZoom} onZoomChange={onZoomChange} />

      {/* Display user location marker if available */}
      {userLocation && (
        <AdvancedMarker
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
        >
          <div className="custom-user-location"><div className="pulse-dot"></div></div>
        </AdvancedMarker>
      )}

      {mapMode === 'markers' && activeFamilies.map((family, idx) => {
        const coords = getCoords(family);
        if (!coords) return null;

        return (
          <AdvancedMarker
            key={family.id || family.key || `marker-${idx}`}
            position={{ lat: coords[0], lng: coords[1] }}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            onClick={() => { if (onMarkerClick) onMarkerClick(family); }}
          >
            <div className="map-fa-marker">
              <span
                className={`map-client-dot ${colorClassOf(family)}`}
                style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
              ></span>
            </div>
          </AdvancedMarker>
        );
      })}

      {mapMode === 'heatmap' && <HeatmapLayer points={heatPoints} />}

      {mapMode === 'clusters' && (
        <ClusteredClients
          families={activeFamilies}
          getCoords={getCoords}
          zoom={currentZoom}
          onMarkerClick={onMarkerClick}
        />
      )}

      {/* RHU BUILDING LOW STOCK WARNING MARKERS */}
      <RhuWarningMarkers markers={rhuWarningMarkers} />
    </GoogleMapShell>
  );
}
