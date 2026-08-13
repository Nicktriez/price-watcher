import { describe, expect, it } from "vite-plus/test";
import { assembleMadplan } from "./madplan.ts";

const meals = [
  { templateId: "a", name: "Lasagne", cost: 80 },
  { templateId: "b", name: "Kødsovs", cost: 65 },
  { templateId: "c", name: "Taco-fredag", cost: 55 },
  { templateId: "d", name: "Burger-fredag", cost: 70 },
  { templateId: "e", name: "Frikadeller", cost: 45 },
];

describe("assembleMadplan", () => {
  it("fills the cheapest meals first, cheapest first, without exceeding the budget", () => {
    const plan = assembleMadplan(meals, 300, 7);
    // 45+55+65+70 = 235, +80 = 315 > 300
    expect(plan.daysFilled).toBe(4);
    expect(plan.total).toBe(235);
    expect(plan.fits).toBe(false);
    expect(plan.meals.map((m) => m.name)).toEqual([
      "Frikadeller",
      "Taco-fredag",
      "Kødsovs",
      "Burger-fredag",
    ]);
  });

  it("respects the budget cap and the day count", () => {
    const plan = assembleMadplan(meals, 150, 7);
    expect(plan.daysFilled).toBe(2); // 45+55=100, +65=165 > 150
    expect(plan.total).toBe(100);
  });

  it("fills exactly the requested days when the budget allows", () => {
    const plan = assembleMadplan(meals, 500, 3);
    expect(plan.daysFilled).toBe(3);
    expect(plan.fits).toBe(true);
    expect(plan.total).toBe(165);
    expect(plan.meals.map((m) => m.cost)).toEqual([45, 55, 65]);
  });

  it("returns an empty plan when no meal fits", () => {
    const plan = assembleMadplan(meals, 20, 3);
    expect(plan.meals).toEqual([]);
    expect(plan.daysFilled).toBe(0);
    expect(plan.total).toBe(0);
  });
});
