import { describe, expect, it } from "vite-plus/test";
import { validateCrowdReport } from "./crowd-report.ts";

describe("validateCrowdReport", () => {
  it("accepts store + product + price", () => {
    const r = validateCrowdReport({ storeId: "s1", productId: "p1", price: 19.95 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.report).toEqual({ storeId: "s1", productId: "p1", productName: null, price: 19.95 });
    }
  });

  it("accepts the free-text fallback when no product exists", () => {
    const r = validateCrowdReport({ storeId: "s1", productName: "Økologiske æbler", price: 12 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.report.productId).toBeNull();
      expect(r.report.productName).toBe("Økologiske æbler");
    }
  });

  it("rejects a missing store", () => {
    const r = validateCrowdReport({ storeId: "  ", productId: "p1", price: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("butik");
  });

  it("rejects when neither product nor name is given", () => {
    const r = validateCrowdReport({ storeId: "s1", price: 10 });
    expect(r.ok).toBe(false);
  });

  it("rejects zero, negative, and absurd prices", () => {
    expect(validateCrowdReport({ storeId: "s1", productId: "p1", price: 0 }).ok).toBe(false);
    expect(validateCrowdReport({ storeId: "s1", productId: "p1", price: -5 }).ok).toBe(false);
    expect(validateCrowdReport({ storeId: "s1", productId: "p1", price: 500_000 }).ok).toBe(false);
    expect(validateCrowdReport({ storeId: "s1", productId: "p1", price: Number.NaN }).ok).toBe(
      false,
    );
  });
});
