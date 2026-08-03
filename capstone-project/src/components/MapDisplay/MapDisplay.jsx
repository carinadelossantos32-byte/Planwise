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
    html: `<i class="fa-solid ${iconClass} ${colorClass}" style="font-size: ${clampedSize}px;"></i>`,
    className: 'map-fa-marker',
    iconSize: [clampedSize, clampedSize],
    iconAnchor: [clampedSize / 2, clampedSize / 2], 
    popupAnchor: [0, -clampedSize / 2]
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
      map.flyTo([lat, lng], 16, {
        animation: true,
        duration: 1.5,
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
    minZoom: 2,
    maxZoom: 19
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    minZoom: 2,
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    minZoom: 2,
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    minZoom: 2,
    maxZoom: 18
  }
};

// 🌟 INAYOS NA BARANGAY FOCUS CONTROLLER (Case-Insensitive & Robust Bounds)
export function BarangayFocusController({ selectedBarangay, families }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedBarangay || selectedBarangay === 'ALL') return;

    // Filter pamilya sa barangay gamit ang case-insensitive string matching
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
        padding: [40, 40],
        maxZoom: 16,
        animate: false // 🌟 Naka-disable ang animation para instant ang zoom-in at ready agad sa screenshot!
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
  selectedBarangay = 'ALL'
}) {
  const defaultCenter = [14.844782, 120.812683]; 

  const activeFamilies = (Array.isArray(filteredFamilies) && filteredFamilies.length > 0)
    ? filteredFamilies
    : (Array.isArray(families) ? families : []);

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
        crossOrigin={true} // 🌟 KAILANGAN PARA SA HTML2CANVAS MAP EXPORT
      />

      <BarangayFocusController 
        selectedBarangay={selectedBarangay} 
        families={families} 
      />

      {/* 🌟 TINANGGAL ANG SPACE SA COMPONENT NAME */}
      {barangayCenter && <ChangeMapView center={barangayCenter} />}
      <MapController zoomLevel={currentZoom} onZoomChange={onZoomChange} />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}/>
      )}

      {/* 1. REGULAR MARKERS MODE */}
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

      {/* 2. HEATMAP MODE */}
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

      {/* 3. CLUSTERS MODE */}
      {mapMode === 'clusters' && (
        <MarkerClusterGroup>
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

    </MapContainer>
  );
}