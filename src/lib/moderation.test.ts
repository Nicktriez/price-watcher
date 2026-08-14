import { describe, expect, it } from "vite-plus/test";
import {
  distinctFlaggers,
  isExpiredSingle,
  isFlagHidden,
  shouldAutoMute,
  CROWD_EXPIRY_MS,
  FLAG_HIDE_THRESHOLD,
} from "./moderation.ts";

const flag = (u: string) => ({ flaggerUserId: u });

describe("distinct flaggers", () => {
  it("counts distinct users, not rows", () => {
    expect(distinctFlaggers([flag("a"), flag("a"), flag("a")])).toBe(1);
    expect(distinctFlaggers([flag("a"), flag("b"), flag("c")])).toBe(3);
  });
});

describe("isFlagHidden", () => {
  it("hides only at N distinct flaggers", () => {
    expect(isFlagHidden([flag("a"), flag("b")])).toBe(false);
    expect(isFlagHidden([flag("a"), flag("b"), flag("c")])).toBe(true);
  });

  it("a single user flagging N times does NOT hide", () => {
    expect(isFlagHidden([flag("a"), flag("a"), flag("a")])).toBe(false);
    expect(FLAG_HIDE_THRESHOLD).toBe(3);
  });
});

describe("shouldAutoMute", () => {
  it("mutes after enough flag-hidden reports", () => {
    expect(shouldAutoMute(1)).toBe(false);
    expect(shouldAutoMute(2)).toBe(true);
  });
});

describe("isExpiredSingle", () => {
  it("expires only Single reports older than the window", () => {
    const now = new Date("2026-08-21T12:00:00Z");
    expect(isExpiredSingle("2026-08-14T12:00:00Z", "single", now)).toBe(false); // exactly 7 days
    expect(isExpiredSingle("2026-08-13T12:00:00Z", "single", now)).toBe(true); // > 7 days
    expect(isExpiredSingle("2026-08-01T12:00:00Z", "community", now)).toBe(false); // community never expires
    expect(isExpiredSingle("2026-08-13T12:00:00Z", null, now)).toBe(false);
    expect(CROWD_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
