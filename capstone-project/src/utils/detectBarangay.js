import * as turf from '@turf/turf';
import malolosBarangays from '../data/malolos-barangays.json';

// "left,top,right,bottom" around one barangay, used to search for an address inside it first
export const barangayViewbox = (barangayName, pad = 0.002) => {
  const feature = malolosBarangays.features.find((f) => f.properties.adm4_name === barangayName);
  if (!feature) return "";
  const [minLng, minLat, maxLng, maxLat] = turf.bbox(feature);
  return [minLng - pad, maxLat + pad, maxLng + pad, minLat - pad].map((n) => n.toFixed(5)).join(",");
};

export const detectBarangay = (lat, lng) => {
  if (!lat || !lng) return "";

  const point = turf.point([lng, lat]); // turf uses [lng, lat]

  for (const feature of malolosBarangays.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      return feature.properties.adm4_name; // ← use this exact key
    }
  }

  return ""; // pin is outside Malolos
};