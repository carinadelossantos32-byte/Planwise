import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import './map-display.css';
import MarkerClusterGroup from 'react-leaflet-cluster'; 
import HeatmapLayer from './HeatmapLayer';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

//custom function to create a FontAwesome icon for the map markers based on family planning method
const createFaIcon = (family, zoom) => {
  let iconClass = 'fa-circle';
  let colorClass = 'color-traditional';

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

  // determine the color class based on the family planning method
  const safeMethod = rawMethod ? rawMethod.toString().trim().toLowerCase() : "no method";

  if (['pills', 'condom', 'injectable', 'short-acting'].includes(safeMethod)) {
    colorClass = 'color-short-modern'; 
  } else if (['implant', 'iud', 'long-acting'].includes(safeMethod)) {
    colorClass = 'color-long-acting'; 
  } else if (['vasectomy', 'tubal ligation', 'btl', 'modern'].includes(safeMethod)) {
    colorClass = 'color-permanent-modern';
  } else if (['withdrawal', 'rhythm', 'calendar', 'abstinence', 'herbal', 'traditional'].includes(safeMethod)) {
    colorClass = 'color-traditional'; 
  } else if (['cmm/billings', 'billings', 'bbt', 'sympto-thermal', 'sdm', 'lam', 'natural'].includes(safeMethod)) {
    colorClass = 'color-natural-modern'; 
  } else {
    colorClass = 'color-no-method'; 
  }

  const dynamicSize = (zoom - 12) * 2 + 11;
  const clampedSize = Math.max(6, Math.min(13, dynamicSize)); 

  return L.divIcon({
    html: `<i class="fa-solid ${iconClass} ${colorClass}"  style="font-size: ${clampedSize}px;"></i>`,
    className: 'map-fa-marker',
    iconSize: [clampedSize, clampedSize],
    iconAnchor: [clampedSize / 2, clampedSize / 2], 
    popupAnchor: [0, -clampedSize / 2]
  });
};

// CUSTOM CLUSTER ICON CREATOR
const createCustomClusterIcon = (cluster) => {
  const count = cluster.getChildCount(); 

  let sizeClass = 'cluster-small';
  if (count > 20) {
    sizeClass = 'cluster-medium';
  }
  if (count > 50) {
    sizeClass = 'cluster-large';
  }

  return L.divIcon({
    html: `<div class="custom-cluster-inner">
             <span>${count}</span>
           </div>`,
    className: `custom-marker-cluster ${sizeClass}`,
    iconSize: L.point(40, 40, true),
  });
};

// RHU WARNING ICON CREATOR
const createRhuWarningIcon = () => {
  return L.divIcon({
    className: 'custom-rhu-warning-marker',
    html: `
      <div style="
        background-color: #EF4444;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #FFFFFF;
        box-shadow: 0 4px 10px rgba(239, 68, 68, 0.45);
      ">
        <i class="fa-solid fa-triangle-exclamation" style="
          transform: rotate(45deg);
          color: #FFFFFF;
          font-size: 14px;
        "></i>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
  });
};

// MAP CONTROLLERS
function MapController({ zoomLevel, onZoomChange }) {
  const map = useMapEvents({
    zoomend() {
      if (onZoomChange) onZoomChange(map.getZoom());
    },
  }); 

  useEffect(() => {
    if (map.getZoom() !== zoomLevel) {
      map.setZoom(zoomLevel);
    }
  }, [zoomLevel, map]);

  return null; 
}

// USER LOCATION ICON
const userLocationIcon = L.divIcon({
  className: 'custom-user-location',
  html: `<div class="pulse-dot"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// TILE LAYER URLS
const TILE_URLS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
    minZoom: 2,
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    subdomains: 'abc',
    minZoom: 2,
    maxZoom: 18
  }
};

// Change map view to the selected barangay center
function ChangeMapView({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.coordinates && center.coordinates.lat && center.coordinates.lng) {
      const { lat, lng } = center.coordinates;
      map.flyTo([lat, lng], 17, {
        animation: true,
        duration: 1.1,
      }); 
    }
  }, [center?.timestamp, map]);

  return null;
} 

// BARANGAY FOCUS CONTROLLER
export function BarangayFocusController({ selectedBarangay, families }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedBarangay || selectedBarangay === 'ALL') return;

    const bgyFamilies = families.filter(f => {
      const bgy = f.barangay || f.location?.barangay || '';
      return bgy.toString().trim().toLowerCase() === selectedBarangay.toString().trim().toLowerCase();
    });

    const coords = bgyFamilies
      .map(f => {
        const lat = Number(f.lat ?? f.latitude ?? f.location?.lat);
        const lng = Number(f.lng ?? f.longitude ?? f.location?.lng);
        return [lat, lng];
      })
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng) && lat !== 0);

    if (coords.length > 0) {
      map.fitBounds(coords, { 
        padding: [15, 15],
        maxZoom: 18,
        animate: false
      });
    }
  }, [selectedBarangay, families, map]);

  return null;
}

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
  const defaultCenter = [14.844782, 120.812683]; 

  const activeFamilies = Array.isArray(filteredFamilies) ? filteredFamilies : families;

  const getCoords = (f) => {
    if (!f) return null;
    const lat = f.lat ?? f.latitude ?? f.location?.lat;
    const lng = f.lng ?? f.longitude ?? f.location?.lng;
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return [Number(lat), Number(lng)];
    }
    return null;
  };

  const currentTile = TILE_URLS[activeLayer] || TILE_URLS.standard;
  
  return (
      <MapContainer 
        center={defaultCenter} 
        zoom={currentZoom} 
        zoomControl={false}
        minZoom={3}
        maxZoom={18}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          key={activeLayer}
          attribution={currentTile.attribution}
          url={currentTile.url}
          crossOrigin={true}
        />

        <BarangayFocusController 
          selectedBarangay={selectedBarangay} 
          families={families} 
        />

          {/* Change map view to the selected barangay center */}
        {barangayCenter && <ChangeMapView center={barangayCenter} />}
        <MapController zoomLevel={currentZoom} onZoomChange={onZoomChange} />

        {/*Display user location marker if available */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}/>
        )}

        {mapMode === 'markers' && (
          activeFamilies.map((family, idx) => {
            const coords = getCoords(family);
            if (!coords) return null;

            return (
              <Marker 
                key={family.id || family.key || `marker-${idx}`} 
                position={coords}
                icon={createFaIcon(family, currentZoom)}
                eventHandlers={{
                  click: () => {
                    if (onMarkerClick) onMarkerClick(family);
                  }
                }}
              />
            );
          })
        )}

        {mapMode === 'heatmap' && (
          <HeatmapLayer 
            points={activeFamilies
              .map(f => {
                const coords = getCoords(f);
                return coords ? [...coords, 1] : null;
              })
              .filter(Boolean)} 
          />
        )}

        {mapMode === 'clusters' && (
          <MarkerClusterGroup
            iconCreateFunction={createCustomClusterIcon} 
            showCoverageOnHover={false}                  
            maxClusterRadius={50}                        
            spiderfyOnMaxZoom={true}                    
            zoomToBoundsOnClick={true}
          >
            {activeFamilies.map((family, idx) => {
              const coords = getCoords(family);
              if (!coords) return null;

              return (
                <Marker 
                  key={family.id || family.key || `cluster-marker-${idx}`} 
                  position={coords}
                  icon={createFaIcon(family, currentZoom)}
                  eventHandlers={{
                    click: () => {
                      if (onMarkerClick) onMarkerClick(family);
                    }
                  }}
                />
              );
            })}
          </MarkerClusterGroup>
        )}

        {/* RHU BUILDING LOW STOCK WARNING MARKERS */}
        {rhuWarningMarkers.map((rhuMarker) => (
          <Marker
            key={rhuMarker.id}
            position={[rhuMarker.lat, rhuMarker.lng]}
            icon={createRhuWarningIcon()}
            zIndexOffset={600}
          >
            <Popup>
              <div style={{ minWidth: '220px', padding: '6px' }}>
                <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '8px' }}>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A', fontWeight: '700' }}>
                    {rhuMarker.rhuName}
                  </h3>
                  {rhuMarker.address && (
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      📍 {rhuMarker.address}
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
                  {rhuMarker.lowStockMethods && rhuMarker.lowStockMethods.map((item, idx) => (
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
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    );
}