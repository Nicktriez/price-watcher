import { describe, expect, it } from "vite-plus/test";
import { nominatimQueryUrl, parseGeocodeResponse } from "./geocode.ts";

describe("nominatimQueryUrl", () => {
  it("builds a structured Danish query", () => {
    const url = nominatimQueryUrl({ street: "Exnersgade 16", city: "Esbjerg", zip: "6700" });
    expect(url).toContain("format=json");
    expect(url).toContain("countrycodes=dk");
    expect(url).toContain("street=Exnersgade+16");
    expect(url).toContain("city=Esbjerg");
    expect(url).toContain(`postalcode=6700`);
  });

  it("omits missing fields", () => {
    const url = nominatimQueryUrl({ zip: "5000" });
    expect(url).not.toContain("street=");
    expect(url).not.toContain("city=");
    expect(url).toContain("postalcode=5000");
  });
});

describe("parseGeocodeResponse", () => {
  it("extracts lat/lon from the top result", () => {
    const body = JSON.stringify([
      { lat: "55.4643", lon: "8.4582" },
      { lat: "0", lon: "0" },
    ]);
    expect(parseGeocodeResponse(body)).toEqual({ lat: 55.4643, lon: 8.4582 });
  });

  it("returns null for empty or malformed responses", () => {
    expect(parseGeocodeResponse("[]")).toBeNull();
    expect(parseGeocodeResponse("not json")).toBeNull();
    expect(parseGeocodeResponse(JSON.stringify([{ lat: "abc", lon: "xyz" }]))).toBeNull();
  });
});
