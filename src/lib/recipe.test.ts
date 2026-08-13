import { describe, expect, it } from "vite-plus/test";
import { parseIngredientQuantity, splitIngredients, suggestProducts } from "./recipe.ts";

describe("splitIngredients", () => {
  it("splits on newlines and drops empty lines", () => {
    const text = "250 g spaghetti\n\n400 g hakket oksekød\n\nsalt\n";
    expect(splitIngredients(text)).toEqual(["250 g spaghetti", "400 g hakket oksekød", "salt"]);
  });

  it("drops servings, timing, and section header lines", () => {
    const text = "Ingredienser\n2 personer\n15 min\n250 g spaghetti\nFremgangsmåde\n";
    expect(splitIngredients(text)).toEqual(["250 g spaghetti"]);
  });

  it("drops method-step lines that start with a verb", () => {
    const text = "Kog pastaen i saltet vand\n250 g spaghetti\nTilsæt fløden\n";
    expect(splitIngredients(text)).toEqual(["250 g spaghetti"]);
  });

  it("keeps ingredients that start with a quantity or noun", () => {
    const text = "1 løg\n400 g hakket oksekød\nrøræg\n";
    expect(splitIngredients(text)).toEqual(["1 løg", "400 g hakket oksekød", "røræg"]);
  });
});

describe("parseIngredientQuantity", () => {
  it("parses amount + known unit", () => {
    expect(parseIngredientQuantity("250 g spaghetti")).toEqual({
      name: "spaghetti",
      amount: 250,
      unit: "g",
    });
    expect(parseIngredientQuantity("400 g hakket oksekød")).toEqual({
      name: "hakket oksekød",
      amount: 400,
      unit: "g",
    });
    expect(parseIngredientQuantity("2 dåser hakkede tomater")).toEqual({
      name: "hakkede tomater",
      amount: 2,
      unit: "dåser",
    });
  });

  it("parses a leading count with no unit", () => {
    expect(parseIngredientQuantity("1 løg")).toEqual({ name: "løg", amount: 1, unit: null });
  });

  it("leaves unitless, amountless lines as plain names", () => {
    expect(parseIngredientQuantity("salt")).toEqual({ name: "salt", amount: null, unit: null });
    expect(parseIngredientQuantity("peber")).toEqual({ name: "peber", amount: null, unit: null });
  });
});

describe("suggestProducts", () => {
  const products = [
    { id: "p1", name: "Løg" },
    { id: "p2", name: "Rødløg" },
    { id: "p3", name: "Schulstad brød 470g" },
    { id: "p4", name: "Skyllemiddel" },
  ];

  it("prefers an exact normalized match", () => {
    const suggestions = suggestProducts(products, "løg");
    expect(suggestions[0]?.id).toBe("p1");
  });

  it("falls back to contains matches", () => {
    const suggestions = suggestProducts(products, "brød");
    expect(suggestions.some((s) => s.id === "p3")).toBe(true);
  });

  it("returns empty when nothing matches", () => {
    expect(suggestProducts(products, "wasabi")).toEqual([]);
  });
});
