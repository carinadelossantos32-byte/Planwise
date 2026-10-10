import { buildAddressLabel, canonicalBarangayName, isMalolos } from "./geoHelper";

/*
    Reads the address pieces of a Kobo submission.

    The Kobo sync function hands over each answer under the last part of its field path, so a
    question inside a group still arrives as, for example, "House_Number". KEY_CANDIDATES lists
    the keys the form is expected to use; when none of them is present, a key whose name clearly
    reads as the same question is used. The matched keys are returned so a sync can be checked
    against the form.
*/
const KEY_CANDIDATES = {
  houseNumber: ["House_Number", "House_No", "HouseNumber", "House_No_"],
  street: ["Street_Name", "Street", "StreetName"],
  barangay: ["Barangay"],
  municipality: ["Municipality", "City_Municipality", "City"],
};

const KEY_PATTERNS = {
  houseNumber: (key) => /house[^a-z0-9]*(no|num)/.test(key),
  street: (key) => /(^|[^a-z])(street|kalye)([^a-z]|$)/.test(key),
  barangay: (key) => /(barangay|brgy)/.test(key) && !/(worker|bpw|collector|enumerator|captain|kapitan)/.test(key),
  municipality: (key) => /(municipal|city|lungsod)/.test(key),
};

const flat = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

function findKey(survey, field) {
  const keys = Object.keys(survey);
  const wanted = KEY_CANDIDATES[field].map(flat);
  const exact = keys.find((key) => wanted.includes(flat(key)) && hasValue(survey[key]));
  if (exact) return exact;
  return keys.find((key) => KEY_PATTERNS[field](key.toLowerCase()) && hasValue(survey[key])) ?? null;
}

export function readKoboAddressParts(survey = {}) {
  const matchedKeys = {};
  const raw = {};
  for (const field of Object.keys(KEY_CANDIDATES)) {
    const key = findKey(survey, field);
    matchedKeys[field] = key;
    raw[field] = key ? String(survey[key]).trim() : "";
  }
  return { ...raw, matchedKeys };
}

// Everything the sync needs to know about where a respondent lives
export function buildKoboLocation(survey = {}) {
  const parts = readKoboAddressParts(survey);
  const barangay = canonicalBarangayName(parts.barangay);
  const municipality = isMalolos(parts.municipality) ? "Malolos" : parts.municipality;

  const pieces = {
    houseNumber: parts.houseNumber,
    street: parts.street,
    barangay: barangay || parts.barangay,
    municipality,
  };

  const errors = [];
  if (!parts.barangay) errors.push("Barangay is missing");
  else if (!barangay) errors.push(`Barangay "${parts.barangay}" is not one of the 51 barangays of Malolos`);
  if (parts.municipality && !isMalolos(parts.municipality)) {
    errors.push(`Municipality "${parts.municipality}" is not Malolos`);
  }

  return {
    hasStructuredAddress: Boolean(parts.houseNumber || parts.street || parts.barangay || parts.municipality),
    barangay,
    address: buildAddressLabel(pieces),
    query: buildAddressLabel(pieces, { forSearch: true }),
    fallbackQuery: parts.houseNumber ? buildAddressLabel({ ...pieces, houseNumber: "" }, { forSearch: true }) : "",
    errors,
    matchedKeys: parts.matchedKeys,
  };
}
