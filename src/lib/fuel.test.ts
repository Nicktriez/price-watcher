import { describe, expect, it } from "vite-plus/test";
import { parseElspotAverage, parseOkFuelPrices } from "../server/fuel.ts";

describe("parseOkFuelPrices", () => {
  it("computes the national average across stations for petrol and diesel", () => {
    const body = JSON.stringify({
      items: [
        {
          prices: [
            { product_name: "Blyfri 95", price: 16.29 },
            { product_name: "Svovlfri Diesel", price: 17.19 },
          ],
        },
        {
          prices: [
            { product_name: "Blyfri 95", price: 16.99 },
            { product_name: "Svovlfri Diesel", price: 18.49 },
          ],
        },
      ],
    });
    expect(parseOkFuelPrices(body)).toEqual({ petrol: 16.64, diesel: 17.84 });
  });

  it("skips stations missing a product and returns null when nothing parses", () => {
    const body = JSON.stringify({
      items: [{ prices: [{ product_name: "Oktan 100", price: 18.49 }] }],
    });
    expect(parseOkFuelPrices(body)).toEqual({ petrol: null, diesel: null });
    expect(parseOkFuelPrices("not json")).toEqual({ petrol: null, diesel: null });
  });
});

describe("parseElspotAverage", () => {
  it("averages the latest day's spot prices in kr/kWh", () => {
    const body = JSON.stringify({
      records: [
        { HourDK: "2026-08-12T23:00:00", SpotPriceDKK: 690 },
        { HourDK: "2026-08-12T22:00:00", SpotPriceDKK: 610 },
        { HourDK: "2026-08-11T23:00:00", SpotPriceDKK: 500 },
      ],
    });
    expect(parseElspotAverage(body)).toBeCloseTo(0.65, 5);
  });

  it("returns null on malformed input", () => {
    expect(parseElspotAverage("not json")).toBeNull();
    expect(parseElspotAverage(JSON.stringify({ records: [] }))).toBeNull();
  });
});
