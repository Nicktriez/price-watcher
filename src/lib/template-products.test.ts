import { describe, expect, it } from "vite-plus/test";
import { resolveTemplateProduct, type TemplateProductCandidate } from "./template-products.ts";

const c = (
  id: string,
  name: string,
  hasOffer: boolean,
  unitPrice: number | null = null,
): TemplateProductCandidate => ({ id, name, hasOffer, unitPrice });

describe("resolveTemplateProduct", () => {
  it("resolves an exact normalized match", () => {
    const r = resolveTemplateProduct("Kartofler", [
      c("a", "Kartofler", true),
      c("b", "Nye danske kartofler", true),
    ]);
    expect(r).toEqual({ productId: "a", method: "exact" });
  });

  it("prefers a priced offer over an unoffered exact match", () => {
    const r = resolveTemplateProduct("Løg", [c("no", "Løg", false), c("yes", "Løg", true)]);
    expect(r.productId).toBe("yes");
  });

  it("picks the cheapest unit price among offered matches", () => {
    const r = resolveTemplateProduct("Mælk", [
      c("cheap", "Mælk", true, 9.95),
      c("pricey", "Mælk", true, 12.5),
      c("none", "Mælk", true, null),
    ]);
    expect(r.productId).toBe("cheap");
  });

  it("is deterministic (id tie-break) when all else ties", () => {
    const r = resolveTemplateProduct("Æg", [c("z", "Æg", false), c("a", "Æg", false)]);
    expect(r.productId).toBe("a");
  });

  it("matches whole tokens only — does NOT match 'løg' to 'hvidløg'", () => {
    const r = resolveTemplateProduct("Løg", [c("garlic", "Hvidløg", true)]);
    expect(r.productId).toBeNull();
  });

  it("does NOT match 'æg' to 'pålæg'", () => {
    const r = resolveTemplateProduct("Æg", [c("paelæg", "Pålæg", true)]);
    expect(r.productId).toBeNull();
  });

  it("keyword tier matches all term tokens present (reordering/extra words)", () => {
    const r = resolveTemplateProduct("revet ost", [c("a", "Coop revet ost", true)]);
    expect(r).toEqual({ productId: "a", method: "keyword" });
  });

  it("keyword tier does NOT partially match ('hakket svinekød' must contain svinekød)", () => {
    const r = resolveTemplateProduct("Hakket svinekød", [
      c("beef", "Hakket oksekød", true),
      c("pork", "Dansk hakket grisekød", true),
    ]);
    expect(r.productId).toBeNull();
  });

  it("prefix tier catches plurals/compounds like 'burgerbolle' ⊂ 'burgerboller'", () => {
    const r = resolveTemplateProduct("Burgerbolle", [c("a", "Burgerboller", true)]);
    expect(r).toEqual({ productId: "a", method: "substring" });
  });

  it("keyword tier handles measurement/brand-suffixed names ('salling Lasagneplader')", () => {
    const r = resolveTemplateProduct("Lasagneplader", [c("a", "salling Lasagneplader", true)]);
    expect(r).toEqual({ productId: "a", method: "keyword" });
  });

  it("returns null when nothing resolves (leave free_text)", () => {
    const r = resolveTemplateProduct("Opvaskesvampe", [
      c("a", "Opvaskemiddel", true),
      c("b", "Køkkenrulle", true),
    ]);
    expect(r).toEqual({ productId: null, method: null });
  });

  it("normalizes brand prefix + measurement suffixes (REMA 1000 Salat → salat)", () => {
    const r = resolveTemplateProduct("Salat", [c("a", "REMA 1000 Salat", true)]);
    expect(r).toEqual({ productId: "a", method: "exact" });
  });

  describe("038x: wrong-link traps (name affinity beats cheapest unit price)", () => {
    it("Kaffe does NOT resolve to a cheaper protein-drink — name affinity wins", () => {
      const r = resolveTemplateProduct("Kaffe", [
        c("starbucks", "Starbucks protein-drik med kaffe", true, 45.45),
        c("bki", "BKI Kaffe", true, 91.43),
        c("peterlarsen", "Peter Larsen Kaffe", true, 105),
      ]);
      expect(r.productId).toBe("bki"); // term dominates 2/3 of the name, not 1/5
    });

    it("Løg prefers a plain onion over a branded-but-cheaper one", () => {
      const r = resolveTemplateProduct("Løg", [
        c("branded", "Coop løg fra Månsson", true, 10),
        c("plain", "Løg", true, 20),
      ]);
      expect(r.productId).toBe("plain");
    });

    it("Mælk prefers plain milk over a milk-based drink", () => {
      const r = resolveTemplateProduct("Mælk", [
        c("drink", "Choko kakaomælk", true, 12), // token 'kakaomælk' ≠ 'mælk' — not even a keyword match
        c("larra", "Arla Lactofree mælk", true, 15),
      ]);
      expect(r.productId).toBe("larra");
    });

    it("does not let an offered unrelated product beat a correct unoffered one (wrong link > no link)", () => {
      const r = resolveTemplateProduct("Kaffe", [
        c("drink", "Starbucks protein-drik med kaffe", true, 45.45),
        c("peterlarsen", "Peter Larsen Kaffe", false, 105),
      ]);
      expect(r.productId).toBe("peterlarsen");
    });

    it("unit price still breaks ties within the same affinity class", () => {
      const r = resolveTemplateProduct("Kaffe", [
        c("expensive", "BKI Kaffe", true, 120),
        c("cheap", "BKI Kaffe", true, 80),
      ]);
      expect(r.productId).toBe("cheap");
    });
  });
});
