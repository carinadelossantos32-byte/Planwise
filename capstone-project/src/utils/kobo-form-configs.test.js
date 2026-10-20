import { describe, expect, it } from "vitest";
import { PUBLIC_FORM_CONFIG } from "./kobo-form-configs";

describe("PUBLIC_FORM_CONFIG.mapFields", () => {
  it("maps the new address fields and prepares a full forward-geocoding query", () => {
    const client = PUBLIC_FORM_CONFIG.mapFields({
      _id: 123,
      House_Number: "12",
      Street_Name: "Rizal Street",
      Barangay: "san_agustin",
      Municipality: "malolos",
    });

    expect(client).toMatchObject({
      address: "12, Rizal Street, San Agustin, Malolos, Bulacan, Philippines",
      house_number: "12",
      street_name: "Rizal Street",
      barangay: "San Agustin",
      municipality: "Malolos",
      latitude: null,
      longitude: null,
      location_geocode_status: "pending",
      _geocodeQuery: "12, Rizal Street, San Agustin, Malolos, Bulacan, Philippines",
    });
  });

  it("geocodes a locality even when the optional house number is blank", () => {
    const client = PUBLIC_FORM_CONFIG.mapFields({
      _id: 124,
      Street_Name: "Rizal Street",
      Barangay: "San Agustin",
      Municipality: "Malolos",
    });

    expect(client.address).toBe("Rizal Street, San Agustin, Malolos, Bulacan, Philippines");
    expect(client._geocodeQuery).toBe(client.address);
    expect(client.location_geocode_status).toBe("pending");
    expect(client.latitude).toBeNull();
    expect(client.longitude).toBeNull();
  });

  it("does not attempt geocoding with only a house number and no locality", () => {
    const client = PUBLIC_FORM_CONFIG.mapFields({
      _id: 126,
      House_Number: "12",
    });

    expect(client._geocodeQuery).toBe("");
    expect(client.latitude).toBeNull();
    expect(client.longitude).toBeNull();
  });

  it("geocodes address fields instead of using a stale Kobo GPS pin", () => {
    const client = PUBLIC_FORM_CONFIG.mapFields({
      _id: 125,
      _geolocation: [14.8436, 120.8114, 0, 5],
      House_Number: "12",
      Street_Name: "Rizal Street",
      Barangay: "san_agustin",
      Municipality: "malolos",
    });

    expect(client).toMatchObject({
      address: "12, Rizal Street, San Agustin, Malolos, Bulacan, Philippines",
      latitude: null,
      longitude: null,
      location_geocode_status: "pending",
      _geocodeQuery: "12, Rizal Street, San Agustin, Malolos, Bulacan, Philippines",
    });
  });
});
