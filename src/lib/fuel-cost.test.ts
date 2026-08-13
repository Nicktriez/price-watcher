import { describe, expect, it } from "vite-plus/test";
import { buildVerdictText, computeFuelCost } from "./fuel-cost.ts";

const car = (
  fuelType: "petrol" | "diesel" | "ev",
  efficiency: number,
  evCharging: "home" | "public" | null,
) => ({
  fuelType,
  efficiency,
  evCharging,
});

const prices = { petrol: 16.29, diesel: 17.19, evHome: 2.52, evPublic: 5.5 };

describe("computeFuelCost", () => {
  it("computes petrol cost from round-trip km and km/l", () => {
    // 20 km round-trip, 15 km/l, 16.29 kr/l -> 21.72
    expect(computeFuelCost(20, car("petrol", 15, null), prices)).toBeCloseTo(21.72, 2);
  });

  it("computes diesel cost", () => {
    expect(computeFuelCost(20, car("diesel", 18, null), prices)).toBeCloseTo(19.1, 2);
  });

  it("computes EV home and public costs with kWh/km", () => {
    // 20 km * 0.18 kWh/km * 2.52 = 9.07 (home); * 5.5 = 19.8 (public)
    expect(computeFuelCost(20, car("ev", 0.18, "home"), prices)).toBeCloseTo(9.07, 2);
    expect(computeFuelCost(20, car("ev", 0.18, "public"), prices)).toBeCloseTo(19.8, 2);
  });

  it("returns null for invalid distance or efficiency", () => {
    expect(computeFuelCost(-5, car("petrol", 15, null), prices)).toBeNull();
    expect(computeFuelCost(20, car("petrol", 0, null), prices)).toBeNull();
  });
});

describe("buildVerdictText", () => {
  it("rewards the net winner when a far cheap store loses on fuel", () => {
    const ranked = [
      { storeId: "near", storeName: "Netto", basketTotal: 100, fuelCost: 10, totalWithFuel: 110 },
      { storeId: "far", storeName: "Føtex", basketTotal: 70, fuelCost: 60, totalWithFuel: 130 },
    ];
    const text = buildVerdictText(ranked)!;
    expect(text).toContain("Netto");
    expect(text).toContain("30 kr dyrere i varer");
    expect(text).toContain("50 kr billigere i brændstof");
    expect(text).toContain("netto 20 kr bedre end Føtex");
  });

  it("states when the cheapest basket store also wins with fuel", () => {
    const ranked = [
      { storeId: "a", storeName: "Netto", basketTotal: 70, fuelCost: 10, totalWithFuel: 80 },
      { storeId: "b", storeName: "Føtex", basketTotal: 100, fuelCost: 30, totalWithFuel: 130 },
    ];
    expect(buildVerdictText(ranked)).toContain("Netto — 80 kr i alt");
  });

  it("returns null when fewer than two stores have fuel data", () => {
    const ranked = [
      { storeId: "a", storeName: "A", basketTotal: 70, fuelCost: null, totalWithFuel: null },
    ];
    expect(buildVerdictText(ranked)).toBeNull();
  });
});
