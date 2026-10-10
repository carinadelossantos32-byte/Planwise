import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { detectBarangay, barangayViewbox } from "./detectBarangay";
import { canonicalBarangayName } from "./geoHelper";

/*
    Looks addresses up through the geocodeAddressBatch cloud function, then checks every answer
    against the Malolos barangay boundaries here, so a hit somewhere else in the Philippines is
    never accepted.
*/
const CHUNK_SIZE = 10;

export async function geocodeAddresses(items) {
  const call = httpsCallable(functions, "geocodeAddressBatch", { timeout: 180000 });
  const results = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE).map(({ query, fallbackQuery = "", barangay = "" }) => ({
      query,
      fallbackQuery,
      viewbox: barangayViewbox(barangay), // the chosen barangay is searched first
    }));
    const response = await call({ items: chunk });
    results.push(...(response.data?.results || []));
  }
  return results;
}

// status: exact | street  - safe to save as the location of the address
//         approximate     - the geocoder only found the area, not the address
//         other-barangay  - inside Malolos, but not in the barangay that was given
//         outside | none  - not in Malolos, or nothing found
export function classifyGeocode(result, barangay, detect = detectBarangay) {
  if (!result || !result.found) return { status: "none" };

  const candidates = (Array.isArray(result.candidates) && result.candidates.length > 0 ? result.candidates : [result])
    .map((c) => ({ precision: c.precision, lat: Number(c.lat), lon: Number(c.lon) }))
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .map((c) => ({ ...c, detectedBarangay: detect(c.lat, c.lon) }));
  if (candidates.length === 0) return { status: "none" };

  // Only a match inside the chosen barangay can be used; the most specific one wins
  const rank = { house: 0, street: 1, area: 2 };
  const inBarangay = candidates
    .filter((c) => c.detectedBarangay && (!barangay || c.detectedBarangay === barangay))
    .sort((a, b) => (rank[a.precision] ?? 1) - (rank[b.precision] ?? 1));

  const best = inBarangay[0];
  if (best) {
    const { lat, lon, detectedBarangay } = best;
    if (best.precision === "area") return { status: "approximate", lat, lon, detectedBarangay };
    return { status: best.precision === "house" ? "exact" : "street", lat, lon, detectedBarangay };
  }

  const first = candidates[0];
  if (!first.detectedBarangay) return { status: "outside", lat: first.lat, lon: first.lon };
  return { status: "other-barangay", lat: first.lat, lon: first.lon, detectedBarangay: first.detectedBarangay };
}

export const LOCATION_MESSAGES = {
  none: "No location was found for this address",
  outside: "The address was found outside Malolos",
  "other-barangay": "The address was found in a different barangay",
  approximate: "Only the area was found, not the exact address",
  unavailable: "The address lookup is unavailable right now",
};

// ---- manual entry (Add / Edit client forms) ----

const round6 = (n) => parseFloat(Number(n).toFixed(6));
export { round6 };

// Looks up the address typed in a form; the barangay field is added to the search text
export async function lookupAddressLocation(address, barangay) {
  const clean = (v) => String(v || "").replace(/\s*\(pob\.?\)/i, "").trim();
  const query = [clean(address), clean(barangay), "Malolos", "Bulacan", "Philippines"].filter(Boolean).join(", ");
  const chosen = canonicalBarangayName(barangay);
  const [result] = await geocodeAddresses([{ query, barangay: chosen }]);
  return classifyGeocode(result, chosen);
}

// One line for the person filling in the form
export function locationHint(outcome) {
  switch (outcome?.status) {
    case "exact": return "Exact address found. The pin shows its location.";
    case "street": return "The street was found, but not the exact house. Move the pin to the house if needed.";
    case "other-barangay": return `The address was found in Barangay ${outcome.detectedBarangay}, not the barangay entered. Check both, or place the pin by hand.`;
    case "outside": return "The address was found outside Malolos. Check it, or place the pin by hand.";
    case "approximate": return "Only the area was found, not the exact address. Click the map to place the pin.";
    case "unavailable": return "The address lookup is unavailable right now. Click the map to place the pin.";
    default: return "No location was found for this address. Click the map to place the pin.";
  }
}

// A pin has to be inside Malolos, and inside the barangay entered when that barangay is known
export function checkPinLocation(lat, lng, barangay, detect = detectBarangay) {
  const where = detect(Number(lat), Number(lng));
  if (!where) return { ok: false, message: "This location is outside Malolos. Check the address or move the pin." };
  const given = canonicalBarangayName(barangay);
  if (given && where !== given) {
    return { ok: false, message: `This location is in Barangay ${where}, not ${given}. Check the address, the barangay, or move the pin.` };
  }
  return { ok: true, message: "" };
}
