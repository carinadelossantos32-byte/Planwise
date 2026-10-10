// src/utils/geoHelper.js
import malolosGeoJSON from "../data/malolos-barangays.json";

// Helper para gawing lowercase at tanggalin ang mga tuldok o panaklong
const cleanStr = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[.()]/g, "")
    .trim();

// 1. Kunin ang 51 barangays kasama ang center coordinates mula sa GeoJSON
export const MALOLOS_BARANGAY_LIST = malolosGeoJSON.features
  .map((feature) => {
    const name = feature.properties.adm4_name.trim();
    return {
      name,
      lat: Number(feature.properties.center_lat),
      lng: Number(feature.properties.center_lon),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// 2. Maghanda ng matching patterns (hal. "sto" para sa "santo", "n" para sa "ñ")
const LOOKUP_LIST = MALOLOS_BARANGAY_LIST.map((bgy) => {
  const norm = cleanStr(bgy.name);
  const patterns = [norm];

  if (norm.startsWith("santo ")) {
    patterns.push(norm.replace("santo ", "sto "));
  } else if (norm.startsWith("santa ")) {
    patterns.push(norm.replace("santa ", "sta "));
  }

  if (norm.includes("ñ")) {
    patterns.push(norm.replace(/ñ/g, "n"));
  }

  return {
    ...bgy,
    patterns,
  };
});

// Naka-sort mula pinakamahabang pangalan para hindi magkamali sa pag-match
const SORTED_LOOKUP = [...LOOKUP_LIST].sort((a, b) => b.name.length - a.name.length);

// 3. Helper para sa pagkuha ng coordinates kapag pumili sa dropdown
export const getCoordinatesByBarangay = (barangayName) => {
  const found = MALOLOS_BARANGAY_LIST.find((b) => b.name === barangayName);
  if (found) {
    return { latitude: found.lat, longitude: found.lng };
  }
  return { latitude: 14.8436, longitude: 120.8114 };
};

// 4. Helper para i-extract ang barangay mula sa address field ng Excel
export const extractLocationFromAddress = (addressText = "") => {
  if (!addressText) {
    return {
      barangay: "Unassigned",
      latitude: 14.8436,
      longitude: 120.8114,
      isMatched: false,
    };
  }

  const cleanAddr = cleanStr(addressText);

  for (const item of SORTED_LOOKUP) {
    for (const pat of item.patterns) {
      const regex = new RegExp(`\\b${pat}\\b`, "i");
      if (regex.test(cleanAddr)) {
        return {
          barangay: item.name,
          latitude: item.lat,
          longitude: item.lng,
          isMatched: true,
        };
      }
    }
  }

  return {
    barangay: "Unassigned",
    latitude: 14.8436,
    longitude: 120.8114,
    isMatched: false,
  };
};

// 5. Tinitiyak na ang barangay na pinili ay siya ring nakasulat sa address
const containsWord = (text, word) => {
  const escaped = word.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9ñ])${escaped}(?![a-z0-9ñ])`, "i").test(text);
};

export const checkAddressBarangay = (address = "", barangay = "") => {
  const cleanAddr = cleanStr(address);
  const cleanBgy = cleanStr(barangay);
  // Ang mga blangkong field ay hinahawakan na ng required-field validation
  if (!cleanAddr || !cleanBgy) return { ok: true, message: "" };

  const known = LOOKUP_LIST.find((item) => item.patterns.includes(cleanBgy));
  const patterns = known ? known.patterns : [cleanBgy];
  if (patterns.some((pat) => containsWord(cleanAddr, pat))) return { ok: true, message: "" };

  const inAddress = extractLocationFromAddress(address);
  const selected = String(barangay).trim();
  const detail =
    inAddress.isMatched && inAddress.barangay !== (known?.name ?? selected)
      ? `The address mentions Barangay ${inAddress.barangay}, but the barangay is set to ${selected}.`
      : `The address does not mention Barangay ${selected}.`;

  return { ok: false, message: `${detail} Edit the address or the barangay so they match.` };
};

// 6. Normalizes a barangay as written in a Kobo choice list ("san_agustin", "Sto. Rosario") to the exact name the app uses
const stripMarks = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeBarangayText = (text) =>
  stripMarks(String(text || ""))
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\(pob\.?\)/g, " ")
    .replace(/\bpob\.?(?=\s|$)/g, " ")
    .replace(/\b(barangay|brgy|bgy)\b\.?/g, " ")
    .replace(/[_\-.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const BARANGAY_VARIANTS = MALOLOS_BARANGAY_LIST.map((bgy) => {
  const base = normalizeBarangayText(bgy.name);
  const variants = new Set([base]);
  if (base.startsWith("santo ")) variants.add(base.replace("santo ", "sto "));
  if (base.startsWith("santa ")) variants.add(base.replace("santa ", "sta "));
  // the Kobo form drops the ñ from its choice values: "santo_ni_o"
  if (base.includes("nino")) variants.add(base.replace("nino", "ni o"));
  return { name: bgy.name, variants };
});

// The app's barangay name, or "" when the value matches none of the 51
export const canonicalBarangayName = (value) => {
  const normalized = normalizeBarangayText(value);
  if (!normalized) return "";
  return BARANGAY_VARIANTS.find((bgy) => bgy.variants.has(normalized))?.name ?? "";
};

// Center of a barangay, or null when the name is unknown (never the city-center fallback)
export const findBarangayCenter = (barangayName) => {
  const found = MALOLOS_BARANGAY_LIST.find((b) => b.name === barangayName);
  return found ? { latitude: found.lat, longitude: found.lng } : null;
};

export const isMalolos = (value) => normalizeBarangayText(value).includes("malolos");

// One readable address from the pieces a respondent filled in; blank pieces are left out.
// forSearch drops the "(Pob.)" tag and assumes Malolos when no municipality was given, which is what a geocoder needs.
export const buildAddressLabel = (parts = {}, { forSearch = false } = {}) => {
  const clean = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
  const barangay = forSearch ? clean(parts.barangay).replace(/\s*\(pob\.?\)/i, "") : clean(parts.barangay);
  const municipality = clean(parts.municipality) || (forSearch ? "Malolos" : "");
  return [clean(parts.houseNumber), clean(parts.street), barangay, municipality, "Bulacan", "Philippines"]
    .filter(Boolean)
    .join(", ");
};

// True when a coordinate is just the city center or a barangay center, which marks a location that was never found for the address
export const isPlaceholderCoordinate = (lat, lng) => {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return true;
  const near = (a, b) => Math.abs(a - b) < 0.00002;
  if (near(la, 14.8436) && near(lo, 120.8114)) return true;
  return MALOLOS_BARANGAY_LIST.some((b) => near(la, b.lat) && near(lo, b.lng));
};
