import { describe, expect, it } from "vite-plus/test";
import { parseRouteDistance, roundTrip, routeUrl } from "./osrm.ts";

describe("routeUrl", () => {
  it("builds a lon,lat;lon,lat driving route", () => {
    const url = routeUrl({ lat: 55.3959, lon: 10.3851 }, { lat: 55.4381, lon: 10.3868 });
    expect(url).toBe(
      "https://router.project-osrm.org/route/v1/driving/10.3851,55.3959;10.3868,55.4381?overview=false",
    );
  });
});

describe("parseRouteDistance", () => {
  it("extracts meters and converts to km", () => {
    const body = JSON.stringify({ code: "Ok", routes: [{ distance: 6401.9 }] });
    expect(parseRouteDistance(body)).toBeCloseTo(6.402, 3);
  });

  it("returns null for errors or empty routes", () => {
    expect(parseRouteDistance(JSON.stringify({ code: "NoRoute" }))).toBeNull();
    expect(parseRouteDistance("not json")).toBeNull();
    expect(parseRouteDistance(JSON.stringify({ routes: [] }))).toBeNull();
  });
});

describe("roundTrip", () => {
  it("doubles the one-way distance", () => {
    expect(roundTrip(6.4)).toBeCloseTo(12.8, 5);
  });
});
