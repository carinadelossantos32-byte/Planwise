import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // Lumikha ng heatmap layer
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(map);

    // Linisin (tanggalin) ang layer kapag lumipat ng mode
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

export default HeatmapLayer;