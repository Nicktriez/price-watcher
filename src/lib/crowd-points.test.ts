import { describe, expect, it } from "vite-plus/test";
import { computeCrowdAward, crowdAwardDelta, CROWD_POINTS } from "./crowd-points.ts";

describe("computeCrowdAward", () => {
  it("rewards verified (community) reports and nothing for unverified (single)", () => {
    expect(computeCrowdAward("single")).toBe(0);
    expect(computeCrowdAward("community")).toBeGreaterThan(0);
  });

  it("values are config-driven", () => {
    expect(CROWD_POINTS.community).toBe(15);
    expect(CROWD_POINTS.single).toBe(0);
  });
});

describe("crowdAwardDelta", () => {
  it("awarding single first then community pays only the delta (never re-awards base)", () => {
    const singleAward = computeCrowdAward("single"); // 0
    const communityDelta = crowdAwardDelta("community", singleAward);
    expect(communityDelta).toBe(computeCrowdAward("community"));
  });

  it("does not re-award once a report is already at community", () => {
    expect(crowdAwardDelta("community", computeCrowdAward("community"))).toBe(0);
  });

  it("never goes negative", () => {
    expect(crowdAwardDelta("single", computeCrowdAward("community"))).toBe(0);
  });
});
