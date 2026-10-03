import * as turf from '@turf/turf';
import malolosBarangays from '../data/malolos-barangays.json';

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