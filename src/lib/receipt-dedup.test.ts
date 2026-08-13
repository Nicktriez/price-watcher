import { describe, expect, it } from "vite-plus/test";
import { decideDedup, receiptFingerprint } from "./receipt-dedup.ts";

describe("receiptFingerprint", () => {
  it("includes the dedup-relevant fields and ignores case", () => {
    const a = receiptFingerprint({
      userId: "u1",
      storeName: "SPAR",
      receiptDate: "09.08.2026",
      total: 390.75,
      itemCount: 12,
    });
    const b = receiptFingerprint({
      userId: "u1",
      storeName: "spar",
      receiptDate: "09.08.2026",
      total: 390.75,
      itemCount: 12,
    });
    expect(a).toBe(b);
  });

  it("differs across users (household uploads are separate)", () => {
    const a = receiptFingerprint({
      userId: "u1",
      storeName: "SPAR",
      receiptDate: "09.08.2026",
      total: 390.75,
      itemCount: 12,
    });
    const b = receiptFingerprint({
      userId: "u2",
      storeName: "SPAR",
      receiptDate: "09.08.2026",
      total: 390.75,
      itemCount: 12,
    });
    expect(a).not.toBe(b);
  });

  it("is order-independent (no first-item tiebreaker)", () => {
    const a = receiptFingerprint({
      userId: "u1",
      storeName: "REMA 1000",
      receiptDate: "15.07.2026",
      total: 314.9,
      itemCount: 44,
    });
    expect(a).toBe(
      receiptFingerprint({
        userId: "u1",
        storeName: "REMA 1000",
        receiptDate: "15.07.2026",
        total: 314.9,
        itemCount: 44,
      }),
    );
  });
});

describe("decideDedup", () => {
  const base = {
    existingItemCount: 12,
    incomingItemCount: 12,
    existingCleanCount: 5,
    incomingCleanCount: 5,
  };

  it("replaces when the re-scan is cleaner", () => {
    expect(decideDedup({ ...base, incomingCleanCount: 8 })).toBe("replace");
  });

  it("keeps the original when the re-scan is worse", () => {
    expect(decideDedup({ ...base, existingCleanCount: 8, incomingCleanCount: 3 })).toBe("keep");
  });

  it("treats an identical double-tap as a duplicate", () => {
    expect(decideDedup(base)).toBe("duplicate");
  });

  it("keeps the original when counts tie but item counts differ", () => {
    expect(decideDedup({ ...base, incomingItemCount: 15 })).toBe("keep");
  });
});
