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

// CUSTOM MARKER ICON CREATOR BASED ON FAMILY'S FP METHOD
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

  const safeMethod = rawMethod ? rawMethod.toString().trim().toLowerCase() : "no method";

  if (['pills', 'condom', 'injectable', 'short-acting'].includes(safeMethod)) {
    colorClass = 'color-short-modern'; 
  } else if (['implant', 'iud', 'vasectomy', 'tubal ligation', 'btl', 'long-acting'].includes(safeMethod)) {
    colorClass = 'color-long-modern'; 
  } else if (['cmm/billings', 'billings', 'bbt', 'sympto-thermal', 'sdm', 'lam', 'natural'].includes(safeMethod)) {
    colorClass = 'color-natural-modern'; 
  } else if (['withdrawal', 'rhythm', 'calendar', 'abstinence', 'herbal', 'traditional'].includes(safeMethod)) {
    colorClass = 'color-traditional'; 
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

const userLocationIcon = L.divIcon({
  className: 'custom-user-location',
  html: `<div class="pulse-dot"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const TILE_URLS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
    minZoom: 2,
    maxZoom: 19
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    minZoom: 2,
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
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

const createBarangayMarkerIcon = (isLowStock = false) => {
    if (isLowStock) {
        const svgLowStock = `
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
                <!-- Glowing Pulsing outer circle -->
                <circle cx="24" cy="24" r="20" fill="rgba(239, 68, 68, 0.3)" stroke="#EF4444" stroke-width="2">
                    <animate attributeName="r" values="16;22;16" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
                </circle>
                <!-- Main Red Pin Center -->
                <circle cx="24" cy="24" r="10" fill="#EF4444" stroke="#FFFFFF" stroke-width="2.5" />
                <!-- Warning Badge Icon -->
                <text x="24" y="28" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">!</text>
            </svg>
        `;

        return L.divIcon({
            className: 'rhu-low-stock-marker',
            html: svgLowStock,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
            popupAnchor: [0, -20]
        });
    };

    return L.divIcon({
        className: 'rhu-normal-stock-marker',
        html: svgNormalStock,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -12]
    });
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
  barangayMarkers = []
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

        {barangayCenter && <ChangeMapView center={barangayCenter} />}
        <MapController zoomLevel={currentZoom} onZoomChange={onZoomChange} />

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

        {barangayMarkers
          .filter((marker) => marker.isLowStock)
          .map((marker) => {
            const icon = createBarangayMarkerIcon(true);

            return (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={icon}
                zIndexOffset={-500}
              >
                <Popup>
                  <div style={{ textAlign: 'center', minWidth: '150px', padding: '4px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1E293B' }}>
                      Brgy. {marker.barangay}
                    </h3>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748B' }}>
                      Under: <strong>{marker.rhuName}</strong>
                    </p>

                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#FFFFFF',
                      backgroundColor: '#EF4444'
                    }}>
                      ⚠️ Low Stock Alert ({marker.stock} left)
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })
        }
      </MapContainer>
    );
}