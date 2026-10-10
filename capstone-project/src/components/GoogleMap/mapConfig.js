/*
    Needs VITE_GOOGLE_MAPS_API_KEY in .env (a browser key restricted to this site's address).
    VITE_GOOGLE_MAP_ID is optional; the demo id is fine while developing, a real Map ID is better when the site is live.
*/
export const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";
export const hasGoogleMapsKey = Boolean(API_KEY);

export const MALOLOS_CENTER = { lat: 14.844782, lng: 120.812683 };
