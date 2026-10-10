import { describe, expect, it } from "vitest";
import { buildAddressLabel, canonicalBarangayName, findBarangayCenter, isMalolos, MALOLOS_BARANGAY_LIST } from "./geoHelper";
import { buildKoboLocation, readKoboAddressParts } from "./koboAddress";
import { classifyGeocode } from "./geocodeKobo";



describe("canonicalBarangayName", () => {
  it("matches every barangay name as the app writes it", () => {
    for (const { name } of MALOLOS_BARANGAY_LIST) {
      expect(canonicalBarangayName(name)).toBe(name);
    }
  });

  it("turns Kobo choice values into the app's names", () => {
    expect(canonicalBarangayName("san_agustin")).toBe("San Agustin");
    expect(canonicalBarangayName("Sto. Rosario")).toBe("Santo Rosario");
    expect(canonicalBarangayName("santo_nino")).toBe("Santo Niño");
    expect(canonicalBarangayName("Brgy. Look 1st")).toBe("Look 1st");
    expect(canonicalBarangayName("san_vicente_pob")).toBe("San Vicente");
  });

  it("returns an empty string for something that is not a Malolos barangay", () => {
    expect(canonicalBarangayName("Poblacion")).toBe("");
    expect(canonicalBarangayName("")).toBe("");
  });
});

describe("buildAddressLabel", () => {
  it("joins the pieces and leaves out the blank ones", () => {
    expect(buildAddressLabel({ houseNumber: "12", street: "Rizal St.", barangay: "Anilao", municipality: "Malolos" }))
      .toBe("12, Rizal St., Anilao, Malolos, Bulacan, Philippines");
    expect(buildAddressLabel({ street: "Rizal St.", barangay: "Anilao" })).toBe("Rizal St., Anilao, Bulacan, Philippines");
  });

  it("prepares a search text without the (Pob.) tag and with Malolos filled in", () => {
    expect(buildAddressLabel({ barangay: "San Vicente" }, { forSearch: true }))
      .toBe("San Vicente, Malolos, Bulacan, Philippines");
  });
});

describe("findBarangayCenter / isMalolos", () => {
  it("gives a center only for a real barangay", () => {
    expect(findBarangayCenter("Anilao")).toEqual({ latitude: expect.any(Number), longitude: expect.any(Number) });
    expect(findBarangayCenter("Nowhere")).toBeNull();
  });

  it("recognizes Malolos however it is typed", () => {
    expect(isMalolos("Malolos")).toBe(true);
    expect(isMalolos("City of Malolos")).toBe(true);
    expect(isMalolos("Hagonoy")).toBe(false);
  });
});

describe("readKoboAddressParts / buildKoboLocation", () => {
  const submission = {
    House_Number: "12",
    Street_Name: "Rizal St.",
    Barangay: "san_agustin",
    Municipality: "malolos",
    Barangay_Population_Worker: "Someone",
  };

  it("reads the expected keys and reports which ones it used", () => {
    const parts = readKoboAddressParts(submission);
    expect(parts.houseNumber).toBe("12");
    expect(parts.matchedKeys).toEqual({
      houseNumber: "House_Number",
      street: "Street_Name",
      barangay: "Barangay",
      municipality: "Municipality",
    });
  });

  it("finds a question whose key carries extra wording", () => {
    const parts = readKoboAddressParts({ Numero_ng_Bahay_House_Number: "5", Pangalan_ng_Kalye_Street_Name: "Mabini", Barangay_Brgy: "anilao" });
    expect(parts.houseNumber).toBe("5");
    expect(parts.street).toBe("Mabini");
    expect(parts.barangay).toBe("anilao");
  });

  it("assembles one address and normalizes the barangay", () => {
    const location = buildKoboLocation(submission);
    expect(location.barangay).toBe("San Agustin");
    expect(location.address).toBe("12, Rizal St., San Agustin, Malolos, Bulacan, Philippines");
    expect(location.fallbackQuery).toBe("Rizal St., San Agustin, Malolos, Bulacan, Philippines");
    expect(location.errors).toEqual([]);
  });

  it("flags an unknown barangay and a municipality other than Malolos", () => {
    const location = buildKoboLocation({ Barangay: "Poblacion", Municipality: "Hagonoy" });
    expect(location.barangay).toBe("");
    expect(location.errors).toHaveLength(2);
  });

  it("does not claim a structured address when none of the questions was answered", () => {
    expect(buildKoboLocation({ Address: "somewhere" }).hasStructuredAddress).toBe(false);
  });
});

describe("classifyGeocode", () => {
  const inAnilao = () => "Anilao";
  const nowhere = () => "";

  it("accepts a house or street match inside the given barangay", () => {
    expect(classifyGeocode({ found: true, lat: 14.85, lon: 120.81, precision: "house" }, "Anilao", inAnilao).status).toBe("exact");
    expect(classifyGeocode({ found: true, lat: 14.85, lon: 120.81, precision: "street" }, "Anilao", inAnilao).status).toBe("street");
  });

  it("rejects a result that is not in Malolos", () => {
    expect(classifyGeocode({ found: true, lat: 14.5, lon: 121, precision: "house" }, "Anilao", nowhere).status).toBe("outside");
  });

  it("rejects a result in another barangay", () => {
    expect(classifyGeocode({ found: true, lat: 14.85, lon: 120.81, precision: "house" }, "Atlag", inAnilao).status).toBe("other-barangay");
  });

  it("does not treat an area-only match as the address", () => {
    expect(classifyGeocode({ found: true, lat: 14.85, lon: 120.81, precision: "area" }, "Anilao", inAnilao).status).toBe("approximate");
  });

  it("reports nothing found", () => {
    expect(classifyGeocode({ found: false }, "Anilao", inAnilao).status).toBe("none");
    expect(classifyGeocode(null, "Anilao", inAnilao).status).toBe("none");
  });
});

describe("PUBLIC_FORM_CONFIG.mapFields location", () => {
  const base = {
    _id: 101,
    Pangalan_ng_LALAKI_Asawa_Partner: "Juan",
    Pangalan_ng_BABAE_Asawa_Partner: "Maria",
  };

  it("builds one address and leaves the coordinates empty until the address is found", async () => {
    const { PUBLIC_FORM_CONFIG } = await import("./kobo-form-configs");
    const client = PUBLIC_FORM_CONFIG.mapFields({
      ...base, House_Number: "12", Street_Name: "Rizal St.", Barangay: "anilao", Municipality: "malolos",
    });
    expect(client.address).toBe("12, Rizal St., Anilao, Malolos, Bulacan, Philippines");
    expect(client.barangay).toBe("Anilao");
    expect(client.latitude).toBeNull();
    expect(client.longitude).toBeNull();
    expect(client._requiresLocation).toBe(true);
    expect(client._geocodeQuery).toBe("12, Rizal St., Anilao, Malolos, Bulacan, Philippines");
    expect(client._geocodeFallbackQuery).toBe("Rizal St., Anilao, Malolos, Bulacan, Philippines");
  });

  it("does not look up an address whose barangay is not recognized", async () => {
    const { PUBLIC_FORM_CONFIG } = await import("./kobo-form-configs");
    const client = PUBLIC_FORM_CONFIG.mapFields({ ...base, Street_Name: "Rizal St.", Barangay: "Poblacion", Municipality: "Malolos" });
    expect(client.barangay).toBe("");
    expect(client._geocodeQuery).toBe("");
    expect(client._locationNote).toContain("Poblacion");
  });

  it("flags a municipality other than Malolos", async () => {
    const { PUBLIC_FORM_CONFIG } = await import("./kobo-form-configs");
    const client = PUBLIC_FORM_CONFIG.mapFields({ ...base, Barangay: "Anilao", Municipality: "Hagonoy" });
    expect(client._municipalityError).toContain("Hagonoy");
  });

  it("never saves a placeholder coordinate for a submission without a location", async () => {
    const { PUBLIC_FORM_CONFIG } = await import("./kobo-form-configs");
    const client = PUBLIC_FORM_CONFIG.mapFields({ ...base });
    expect(client.latitude).toBeNull();
    expect(client._locationNote).toBe("No address was given");
  });

  it("keeps the GPS pin of an older submission and needs no lookup", async () => {
    const { PUBLIC_FORM_CONFIG } = await import("./kobo-form-configs");
    const target = (await import("./geoHelper")).MALOLOS_BARANGAY_LIST.find((b) => b.name === "Anilao");
    const client = PUBLIC_FORM_CONFIG.mapFields({ ...base, _geolocation: [target.lat, target.lng] });
    expect(client.latitude).toBe(target.lat);
    expect(client.barangay).toBe("Anilao");
    expect(client._requiresLocation).toBe(false);
    expect(client.location_precision).toBe("gps-pin");
  });
});

describe("the live Kobo form's barangay choices", () => {
  // the 51 choice values of the Barangay question in the public form
  const KOBO_VALUES = [
    "anilao", "atlag", "babatnin", "bagna", "bagong_bayan", "balayong", "balite", "bangkal", "barihan", "bulihan",
    "bungahan", "caingin", "calero", "caliligawan", "canalate", "caniogan", "catmon", "cofradia", "dakila", "guinhawa",
    "ligas", "liang", "longos", "look_1st", "look_2nd", "lugam", "mabolo", "mambog", "masile", "matimbo", "mojon",
    "namayan", "niugan", "pamarawan", "panasahan", "pinagbakahan", "san_agustin", "san_gabriel", "san_juan", "san_pablo",
    "san_vicente", "santiago", "santisima_trinidad", "santo_cristo", "santo_ni_o", "santo_rosario", "santor",
    "sumapang_bata", "sumapang_matanda", "taal", "tikay",
  ];

  it("maps every choice value to a different Malolos barangay", () => {
    const mapped = KOBO_VALUES.map((value) => canonicalBarangayName(value));
    expect(mapped.every(Boolean)).toBe(true);
    expect(new Set(mapped).size).toBe(KOBO_VALUES.length);
  });

  it("uses the app's spelling for the poblacion barangays", () => {
    expect(canonicalBarangayName("santo_ni_o")).toBe("Santo Niño");
    expect(canonicalBarangayName("santo_rosario")).toBe("Santo Rosario");
    expect(canonicalBarangayName("san_vicente")).toBe("San Vicente");
  });

  it("reads a submission with the form's real keys", () => {
    const location = buildKoboLocation({ House_Number: "7", Street_Name: "Mabini St.", Barangay: "santo_ni_o", Municipality: "malolos" });
    expect(location.address).toBe("7, Mabini St., Santo Niño, Malolos, Bulacan, Philippines");
    expect(location.query).toBe("7, Mabini St., Santo Niño, Malolos, Bulacan, Philippines");
    expect(location.errors).toEqual([]);
  });
});

describe("classifyGeocode with several matches", () => {
  // pretend map: anything west of 120.85 is San Pablo, the rest is Tikay
  const detect = (lat, lon) => (lon < 120.85 ? "San Pablo" : "Tikay");

  it("uses the match inside the chosen barangay even when another barangay comes first", () => {
    const outcome = classifyGeocode({
      found: true,
      candidates: [
        { lat: 14.843, lon: 120.846, precision: "street" },
        { lat: 14.842, lon: 120.853, precision: "street" },
      ],
    }, "Tikay", detect);
    expect(outcome.status).toBe("street");
    expect(outcome.lon).toBe(120.853);
    expect(outcome.detectedBarangay).toBe("Tikay");
  });

  it("prefers a specific place over a street inside the barangay", () => {
    const outcome = classifyGeocode({
      found: true,
      candidates: [
        { lat: 14.842, lon: 120.853, precision: "street" },
        { lat: 14.841, lon: 120.854, precision: "house" },
      ],
    }, "Tikay", detect);
    expect(outcome.status).toBe("exact");
    expect(outcome.lat).toBe(14.841);
  });

  it("never accepts a match from another barangay", () => {
    const outcome = classifyGeocode({
      found: true,
      candidates: [{ lat: 14.843, lon: 120.846, precision: "house" }],
    }, "Tikay", detect);
    expect(outcome.status).toBe("other-barangay");
    expect(outcome.detectedBarangay).toBe("San Pablo");
  });
});
