import { describe, expect, it } from "vite-plus/test";
import {
  ageLabel,
  computeCrowdTier,
  isStaleSingle,
  normalizeProductName,
  pricesAgree,
  PRICE_TOLERANCE,
} from "./trust-tier.ts";

const r = (userId: string, price: number, hoursAgo = 1) => ({
  userId,
  price,
  reportedAt: new Date(Date.now() - hoursAgo * 3600_000),
});

describe("pricesAgree", () => {
  it("uses ±2% or ±1 kr, whichever is larger", () => {
    expect(pricesAgree(39.95, 39.9)).toBe(true); // diff 0.05 < ±1
    expect(pricesAgree(39.95, 40.75)).toBe(true); // diff 0.8 < ±1
    expect(pricesAgree(39.95, 41)).toBe(false); // diff 1.05 > ±1
    expect(pricesAgree(100, 102)).toBe(true); // diff 2 < 2% of 100
    expect(pricesAgree(100, 103)).toBe(false); // diff 3 > max(2, 1)
    expect(pricesAgree(12.34, 12.3400001)).toBe(true); // float drift
  });

  it("tolerance is config-driven", () => {
    expect(PRICE_TOLERANCE.relative).toBe(0.02);
    expect(PRICE_TOLERANCE.absoluteKr).toBe(1);
  });
});

describe("computeCrowdTier", () => {
  it("3 distinct users within tolerance flip to Community", () => {
    const tier = computeCrowdTier([r("a", 39.95), r("b", 39.9), r("c", 40.5)]);
    expect(tier.tier).toBe("community");
    expect(tier.distinctUsers).toBe(3);
    expect(tier.representativePrice).toBeCloseTo(39.95, 2);
  });

  it("the same user reporting 3x does NOT flip (stays Single)", () => {
    const tier = computeCrowdTier([r("a", 39.95), r("a", 39.9), r("a", 40.0)]);
    expect(tier.tier).toBe("single");
    expect(tier.distinctUsers).toBe(1);
  });

  it("2 distinct users stay Single", () => {
    expect(computeCrowdTier([r("a", 39.95), r("b", 39.9)]).tier).toBe("single");
  });

  it("disagreeing prices across 3 users stay Single", () => {
    const tier = computeCrowdTier([r("a", 39.95), r("b", 49.95), r("c", 59.95)]);
    expect(tier.tier).toBe("single");
  });

  it("uses each user's latest report only", () => {
    const tier = computeCrowdTier([
      r("a", 12.0, 100),
      r("a", 39.95, 1),
      r("b", 39.9),
      r("c", 40.1),
    ]);
    expect(tier.tier).toBe("community"); // a's old 12.00 is ignored, a,b,c agree ~40
  });

  it("returns null for no reports", () => {
    expect(computeCrowdTier([]).tier).toBeNull();
  });

  it("never returns official for crowd data", () => {
    const tier = computeCrowdTier([r("a", 10), r("b", 10), r("c", 10)]);
    expect(tier.tier).toBe("community");
  });
});

describe("staleness", () => {
  it("marks a single report stale after 24h", () => {
    const now = new Date("2026-08-14T12:00:00Z");
    expect(isStaleSingle("2026-08-13T12:00:00Z", now)).toBe(false);
    expect(isStaleSingle("2026-08-13T11:00:00Z", now)).toBe(true);
  });

  it("renders age as text", () => {
    const now = new Date("2026-08-14T12:00:00Z");
    expect(ageLabel("2026-08-14T11:59:30Z", now)).toBe("just now");
    expect(ageLabel("2026-08-14T11:55:00Z", now)).toBe("5 min old");
    expect(ageLabel("2026-08-14T10:00:00Z", now)).toBe("2 h old");
    expect(ageLabel("2026-08-14T09:00:00Z", now)).toBe("3 h old");
    expect(ageLabel("2026-08-12T12:00:00Z", now)).toBe("2 days old");
  });
});

describe("normalizeProductName", () => {
  it("groups free-text by trim + lowercase", () => {
    expect(normalizeProductName("  Økologiske Æbler ")).toBe("økologiske æbler");
    expect(normalizeProductName("økologiske æbler")).toBe("økologiske æbler");
  });
});
