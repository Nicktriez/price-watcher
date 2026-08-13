import { describe, expect, it } from "vite-plus/test";
import { computeAward, computeStreak } from "./receipt-points.ts";

describe("computeAward", () => {
  it("gives base points plus a clean-parse bonus scaled by recovery", () => {
    expect(computeAward(1, 0)).toBe(20); // 100% recovery -> base 10 + clean 10
    expect(computeAward(0, 0)).toBe(10); // no recovery -> base only
    expect(computeAward(0.5, 0)).toBe(15);
  });

  it("adds a streak bonus on day 2+", () => {
    expect(computeAward(0.5, 5)).toBe(20);
  });

  it("clamps the recovery ratio", () => {
    expect(computeAward(2, 0)).toBe(20);
    expect(computeAward(-1, 0)).toBe(10);
  });
});

describe("computeStreak", () => {
  it("starts a streak at 1 with no bonus", () => {
    expect(computeStreak(0, null, "2026-08-10")).toEqual({ streak: 1, streakBonus: 0 });
  });

  it("grows the streak on consecutive days and grants the bonus", () => {
    expect(computeStreak(1, "2026-08-10", "2026-08-11")).toEqual({ streak: 2, streakBonus: 5 });
    expect(computeStreak(2, "2026-08-11", "2026-08-12")).toEqual({ streak: 3, streakBonus: 5 });
  });

  it("keeps the streak unchanged when uploading the same day", () => {
    expect(computeStreak(3, "2026-08-12", "2026-08-12")).toEqual({ streak: 3, streakBonus: 5 });
  });

  it("resets the streak when a day is missed", () => {
    expect(computeStreak(3, "2026-08-10", "2026-08-12")).toEqual({ streak: 1, streakBonus: 0 });
  });
});
