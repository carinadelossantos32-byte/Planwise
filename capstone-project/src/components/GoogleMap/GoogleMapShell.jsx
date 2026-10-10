import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { API_KEY, MAP_ID, hasGoogleMapsKey } from "./mapConfig";
import "./google-map.css";

// Every map in PlanWise is drawn through this one wrapper, so the key, language, and map style are set in one place.

function MapsUnavailable() {
  return (
    <div className="gm-unavailable" role="alert">
      <strong>The map is not available.</strong>
      <span>Add VITE_GOOGLE_MAPS_API_KEY to the .env file and restart the app.</span>
    </div>
  );
}

// faded: the map under the client markers is softened a little so the markers are what the eye finds first
export default function GoogleMapShell({ children, mapTypeId = "roadmap", faded = false, className = "", style, ...mapProps }) {
  if (!hasGoogleMapsKey) return <MapsUnavailable />;

  return (
    <APIProvider apiKey={API_KEY} language="en" region="PH">
      <Map
        mapId={MAP_ID}
        mapTypeId={mapTypeId}
        backgroundColor="#ffffff"
        // giving the map a class name switches off the library's own full-size style, so gm-map-root supplies it
        className={`gm-map-root ${faded ? (mapTypeId === "roadmap" ? "gm-faded-road" : "gm-faded-photo") : ""} ${className}`.trim()}
        disableDefaultUI
        gestureHandling="greedy"
        clickableIcons={false}
        style={{ width: "100%", height: "100%", ...style }}
        {...mapProps}
      >
        {children}
      </Map>
    </APIProvider>
  );
}
