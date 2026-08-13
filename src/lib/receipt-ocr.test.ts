import { describe, expect, it } from "vite-plus/test";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { findDate, findStore, findTotal, ocrReceipt } from "./receipt-ocr.ts";

const RECEIPTS_DIR =
  process.env.RECEIPTS_DIR ??
  join(homedir(), "grocery-price-watcher-research", "research", "receipts");

describe("findStore", () => {
  it("recognizes the chain from receipt content", () => {
    expect(findStore("REMA 1000\nRema 1000, Haarby\nCVR-NR: 33252196").value).toBe("REMA 1000");
    expect(findStore("SPAR BROBY\nSTATIONSVEJ 30\nCVR.NR. 38714295").value).toBe("SPAR");
    expect(findStore("KIG FORBI WWW.NETTO.DK\nNetto er en del af Salling Group").value).toBe(
      "Netto",
    );
  });

  it("does not misread the 'og spar' loyalty verb as the SPAR chain", () => {
    expect(findStore("Tilmeld dig og spar ved Lidl Plus, og få rabat").value).not.toBe("SPAR");
  });
});

describe("findDate", () => {
  it("parses dates mid-line (BON lines)", () => {
    expect(findDate("Bon:569 11 08 2026 19:06:41").value).toBe("11.08.2026");
    expect(findDate("KS: 1 BON: 14396284 15.07.26 19,45").value).toBe("15.07.2026");
  });
});

describe("findTotal", () => {
  it("recovers the total from the label line", () => {
    const t = findTotal("AT BETALE 390,75");
    expect(t.value).toBeCloseTo(390.75);
    expect(t.confidence).toBe("high");
  });

  it("handles OCR letter noise (ÅT BETALE)", () => {
    expect(findTotal("ÅT BETALE 314,90").value).toBeCloseTo(314.9);
  });

  it("rejects a total with digit noise between label and price", () => {
    expect(findTotal("AT BETALE 776 227,92").value).toBeNull();
  });
});

const runOcr = describe.skipIf(!process.env.RUN_OCR_TESTS);

runOcr("full OCR over the 10 research receipts (RUN_OCR_TESTS=1)", () => {
  it("parses every receipt and reports per-receipt results", async () => {
    const files = readdirSync(RECEIPTS_DIR)
      .filter((f) => f.endsWith(".jpg"))
      .sort();
    expect(files.length).toBe(10);
    const rows: {
      receipt: string;
      store: string | null;
      date: string | null;
      total: number | null;
      items: number;
      recovery: number;
      footer: number;
      clean: number;
      wrapped: number;
    }[] = [];

    for (const file of files) {
      const r = await ocrReceipt(join(RECEIPTS_DIR, file));
      rows.push({
        receipt: file,
        store: r.store.value,
        date: r.date.value,
        total: r.total.value,
        items: r.items.length,
        recovery: r.item_recovery,
        footer: r.footer_count,
        clean: r.items.filter((i) => i.status === "clean").length,
        wrapped: r.items.filter((i) => i.status === "wrapped").length,
      });
    }

    console.log(
      "\nreceipt".padEnd(24) +
        "store".padEnd(11) +
        "date".padEnd(11) +
        "total".padEnd(8) +
        "items".padEnd(6) +
        "recovery".padEnd(9) +
        "footer".padEnd(7) +
        "clean/wrap",
    );
    for (const row of rows) {
      console.log(
        row.receipt.padEnd(24) +
          (row.store ?? "?").padEnd(11) +
          (row.date ?? "-").padEnd(11) +
          String(row.total ?? "-").padEnd(8) +
          String(row.items).padEnd(6) +
          (row.recovery * 100).toFixed(0) +
          "%".padEnd(8) +
          String(row.footer).padEnd(7) +
          `${row.clean}/${row.wrapped}`,
      );
    }

    expect(rows.every((r) => r.store !== null)).toBe(true);
    expect(rows.find((r) => r.receipt === "20260812_153655.jpg")?.total).toBeCloseTo(314.9);
    expect(rows.find((r) => r.receipt === "20260812_153543.jpg")?.total).toBeCloseTo(390.75);
    expect(rows.find((r) => r.receipt === "20260813_115236.jpg")?.total).toBeCloseTo(67.95);
    expect(rows.find((r) => r.receipt === "20260813_115152.jpg")?.footer).toBeGreaterThanOrEqual(9);
    expect(rows.find((r) => r.receipt === "20260813_115236.jpg")?.footer).toBeGreaterThanOrEqual(9);
    expect(rows.find((r) => r.receipt === "20260812_153543.jpg")?.wrapped).toBeGreaterThan(0);
  }, 300000);
});
