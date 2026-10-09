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
