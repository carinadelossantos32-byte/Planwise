import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import './map-display.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const createFaIcon = (method, zoom) => {
  let iconClass = 'fa-circle'; // Default shape
  let colorClass = 'color-traditional'; // Default color: Gray/Itim

  // 🌟 SAFETY NET #1: Siguraduhing may string bago mag-trim at mag-lowercase
  const safeMethod = method ? method.toString().trim() : "no method";
  const lowerMethod = safeMethod.toLowerCase();

  // 1. PULA: Short-Acting / Temporary Modern
  if (['pills', 'condom', 'injectable'].includes(lowerMethod)) {
    colorClass = 'color-short-modern'; // Red sa CSS
  } 
  // 2. ASUL: Long-Acting / Permanent Modern
  else if (['implant', 'iud', 'vasectomy', 'tubal ligation'].includes(lowerMethod)) {
    colorClass = 'color-long-modern'; // Blue sa CSS
  } 
  else if (['cmm/billings', 'bbt', 'sympto-thermal', 'sdm', 'lam'].includes(lowerMethod)) {
    colorClass = 'color-natural-modern'; // Green
  }
  // 4. BROWN/ORANGE: Traditional Methods kasama ang Herbal
  else if (['withdrawal', 'rhythm', 'calendar', 'abstinence', 'herbal'].includes(lowerMethod)) {
    colorClass = 'color-traditional'; // Brown o Orange sa CSS
  }
  // 5. GRAY/ITIM: No Method lang talaga
  else {
    colorClass = 'color-no-method'; // Gray/Itim sa CSS
  }

  const dynamicSize = (zoom - 12) * 2 + 11;
  const clampedSize = Math.max(6, Math.min(13, dynamicSize)); // Pinakamaliit ang 6px, pinakamalaki ang 13px

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
      onZoomChange(map.getZoom());
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
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], 16); 
    }
  }, [center, map]);

  return null;
}

export default function MapDisplay({ families, currentZoom, onZoomChange, barangayCenter }) {
  const defaultCenter = [14.844782, 120.812683]; 

  const safeFamilies = Array.isArray(families) ? families : [];

  return (
    <MapContainer 
        center={defaultCenter} 
        zoom={currentZoom} 
        zoomControl={false}
        minZoom={3}
        maxZoom={18}
        style={{ height: '100%', width: '100%' }}>

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {barangayCenter && <ChangeMapView center={barangayCenter} />}

      <MapController zoomLevel={currentZoom} onZoomChange={onZoomChange} />

      {safeFamilies.map((family) => {
        if (!family || family.lat === undefined || family.lng === undefined) return null;

        return (
          <Marker 
            key={family.id} 
            position={[family.lat, family.lng]}
            icon={createFaIcon(family.method || "no method", currentZoom)}
          >
            <Popup>
              <strong>{family.name || "Unknown"} Family</strong> <br />
              Method: {family.method || "None"} <br />
              Barangay: {family.barangay || "N/A"}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  );
}