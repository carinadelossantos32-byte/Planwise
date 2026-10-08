import { describe, expect, it } from "vitest";
import { MALOLOS_BARANGAY_LIST, extractLocationFromAddress, getCoordinatesByBarangay } from "./geoHelper";

const CITY_CENTER = { latitude: 14.8436, longitude: 120.8114 };

describe("MALOLOS_BARANGAY_LIST", () => {
  it("lists all 51 barangays with usable coordinates", () => {
    expect(MALOLOS_BARANGAY_LIST).toHaveLength(51);
    for (const barangay of MALOLOS_BARANGAY_LIST) {
      expect(barangay.name).toBeTruthy();
      expect(Number.isFinite(barangay.lat)).toBe(true);
      expect(Number.isFinite(barangay.lng)).toBe(true);
    }
  });
});

describe("getCoordinatesByBarangay", () => {
  it("returns the barangay's own coordinates", () => {
    const first = MALOLOS_BARANGAY_LIST[0];
    expect(getCoordinatesByBarangay(first.name)).toEqual({ latitude: first.lat, longitude: first.lng });
  });

  it("falls back to the city center for an unknown barangay", () => {
    expect(getCoordinatesByBarangay("Nowhere")).toEqual(CITY_CENTER);
  });
});

describe("extractLocationFromAddress", () => {
  it("finds the barangay inside a longer address", () => {
    const target = MALOLOS_BARANGAY_LIST[0];
    const result = extractLocationFromAddress(`123 Purok 2, ${target.name}, Malolos, Bulacan`);
    expect(result.isMatched).toBe(true);
    expect(result.barangay).toBe(target.name);
    expect(result.latitude).toBe(target.lat);
  });

  it("marks an empty address as unassigned at the city center", () => {
    expect(extractLocationFromAddress("")).toEqual({ barangay: "Unassigned", ...CITY_CENTER, isMatched: false });
  });
});
