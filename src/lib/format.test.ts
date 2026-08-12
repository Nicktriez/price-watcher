import { describe, expect, it } from "vite-plus/test";
import { fmtDate, fmtPrice } from "./format.ts";

describe("fmtPrice", () => {
  it("strips trailing zeroes from whole and decimal prices", () => {
    expect(fmtPrice("12.00")).toBe("12");
    expect(fmtPrice("25")).toBe("25");
    expect(fmtPrice("2.50")).toBe("2.5");
    expect(fmtPrice("39.95")).toBe("39.95");
  });
});

describe("fmtDate", () => {
  it("renders the date part of an ISO timestamp", () => {
    expect(fmtDate("2026-08-15T21:59:59+0000")).toBe("2026-08-15");
    expect(fmtDate("2026-08-05T10:00:00.000Z")).toBe("2026-08-05");
  });
});
