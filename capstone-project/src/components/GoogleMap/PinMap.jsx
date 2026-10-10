import { useEffect } from "react";
import { AdvancedMarker, AdvancedMarkerAnchorPoint, useMap } from "@vis.gl/react-google-maps";
import GoogleMapShell from "./GoogleMapShell";
import { MALOLOS_CENTER } from "./mapConfig";

const hasPoint = (lat, lng) => lat !== "" && lng !== "" && lat != null && lng != null &&
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

// Moves the view to the pin whenever the pin changes
function FollowPin({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !hasPoint(lat, lng)) return;
    map.panTo({ lat: Number(lat), lng: Number(lng) });
    if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
  }, [map, lat, lng]);

  return null;
}

/*
    Small map used on the client forms. Click it, or drag the pin, to place the location by hand.
    onPick(lat, lng) is called with the new position; without it the map is view-only.
*/
export default function PinMap({ lat, lng, onPick, defaultZoom = 14 }) {
  const point = hasPoint(lat, lng) ? { lat: Number(lat), lng: Number(lng) } : null;

  return (
    <GoogleMapShell
      defaultCenter={point || MALOLOS_CENTER}
      defaultZoom={point ? 16 : defaultZoom}
      zoomControl
      gestureHandling={onPick ? "greedy" : "cooperative"}
      onClick={onPick ? (e) => {
        const at = e.detail?.latLng;
        if (at) onPick(at.lat, at.lng);
      } : undefined}
    >
      <FollowPin lat={lat} lng={lng} />
      {point && (
        <AdvancedMarker
          position={point}
          anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM_CENTER}
          draggable={Boolean(onPick)}
          onDragEnd={onPick ? (e) => {
            const at = e.latLng;
            if (at) onPick(at.lat(), at.lng());
          } : undefined}
        >
          <div className="gm-pin" style={{ position: "relative", marginBottom: 8 }} />
        </AdvancedMarker>
      )}
    </GoogleMapShell>
  );
}
