import { useEffect, useMemo, useRef, useState } from 'react';
import { AdvancedMarker, AdvancedMarkerAnchorPoint, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import GoogleMapShell from '../GoogleMap/GoogleMapShell';
import { MALOLOS_CENTER } from '../GoogleMap/mapConfig';
import { normalizeBarangayName } from '../../utils/barangayNames';
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

// Barangay boundaries live in public/malolos-barangays.geojson (WGS84 lon/lat)
const BOUNDARY_URL = '/malolos-barangays.geojson';
// property that holds the barangay name, depending on where the file came from
const NAME_KEYS = ['adm4_name', 'adm4_en', 'ADM4_EN', 'NAME_4', 'name', 'NAME', 'Name', 'brgy_name', 'BRGY_NAME', 'barangay', 'BARANGAY'];

const featureName = (feature) => {
  for (const key of NAME_KEYS) {
    const value = feature.getProperty(key);
    if (value) return value;
  }
  return '';
};

// Draws the outline of the given barangays, like the boundary Google Maps shows for a searched place
// The map also zooms to fit the outlines: one barangay for the barangay filter,
// every barangay of the chosen RHU for the RHU filter.
function BarangayOutlines({ barangays }) {
  const map = useMap();
  const [layer, setLayer] = useState(null);
  const wantedKey = barangays.map(normalizeBarangayName).join('|');

  // loads the boundaries once; they stay hidden until a barangay is asked for
  useEffect(() => {
    if (!map) return undefined;
    let cancelled = false;
    const dataLayer = new window.google.maps.Data({ map });

    fetch(BOUNDARY_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((geojson) => {
        if (cancelled) return;
        dataLayer.addGeoJson(geojson);
        setLayer(dataLayer);
      })
      .catch((err) => console.warn('Barangay outlines unavailable:', err));

    return () => {
      cancelled = true;
      dataLayer.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (!layer) return;
    const wanted = new Set(wantedKey ? wantedKey.split('|') : []);
    layer.setStyle((feature) => ({
      visible: wanted.has(normalizeBarangayName(featureName(feature))),
      clickable: false, // clicks fall through to the markers and the map
      strokeColor: '#E5484D',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: '#E5484D',
      fillOpacity: 0.05,
    }));
  }, [layer, wantedKey]);

  // zooms to fit every outlined barangay
  useEffect(() => {
    if (!map || !layer || !wantedKey) return undefined;
    const wanted = new Set(wantedKey.split('|'));
    const bounds = new window.google.maps.LatLngBounds();
    let found = false;
    layer.forEach((feature) => {
      if (!wanted.has(normalizeBarangayName(featureName(feature)))) return;
      feature.getGeometry().forEachLatLng((latLng) => {
        bounds.extend(latLng);
        found = true;
      });
    });
    if (!found) return undefined;
    map.fitBounds(bounds, 40);

    // Something can move the map right after the fit (an open popup, a zoom sync), so once the
    // map settles, check the outlines are really in view and fit again if they are not
    let retries = 2;
    let timer = null;
    let listener = null;
    const stop = () => {
      if (listener) listener.remove();
      window.clearTimeout(timer);
    };
    listener = window.google.maps.event.addListener(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > 18) {
        map.setZoom(18);
        return;
      }
      const view = map.getBounds();
      const inView = view && view.contains(bounds.getNorthEast()) && view.contains(bounds.getSouthWest());
      if (inView || retries <= 0) {
        stop();
        return;
      }
      retries -= 1;
      map.fitBounds(bounds, 40);
    });
    timer = window.setTimeout(stop, 4000);
    return stop;
  }, [map, layer, wantedKey]);

  return null;
}

// Keeps the map's zoom and the zoom buttons of the page in step
function ZoomSync({ zoomLevel, onZoomChange }) {
  const map = useMap();
  // zooms the map itself reported. The page state can lag behind the map (for example while
  // fitBounds animates); pushing such an old value back onto the map would undo the zoom.
  const fromMap = useRef(new Set());

  useEffect(() => {
    if (!map) return undefined;
    const zoomListener = map.addListener('zoom_changed', () => {
      const zoom = map.getZoom();
      if (zoom == null) return;
      fromMap.current.add(zoom);
      if (onZoomChange) onZoomChange(zoom);
    });
    let timer = null;
    const idleListener = map.addListener('idle', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fromMap.current.clear(), 150);
    });
    return () => {
      zoomListener.remove();
      idleListener.remove();
      window.clearTimeout(timer);
    };
  }, [map, onZoomChange]);

  useEffect(() => {
    if (!map || fromMap.current.has(zoomLevel)) return;
    if (map.getZoom() !== zoomLevel) map.setZoom(zoomLevel);
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
  outlinedBarangays = [],
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
      {/* Change map view to the selected barangay center */}
      {barangayCenter && <ChangeMapView center={barangayCenter} />}
      <ZoomSync zoomLevel={currentZoom} onZoomChange={onZoomChange} />
      <BarangayOutlines barangays={outlinedBarangays} />

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

      {/* RHU BUILDING LOW STOCK WARNING MARKERS */}
      <RhuWarningMarkers markers={rhuWarningMarkers} />
    </GoogleMapShell>
  );
}
