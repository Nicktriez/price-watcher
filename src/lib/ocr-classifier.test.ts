import { describe, expect, it } from "vite-plus/test";
import { classifyReceipt, isFooterLine, type ClassifiedLine } from "./ocr-classifier.ts";
import ocrFixtures from "./__fixtures__/ocr-receipts.json";

interface OcrFixture {
  receipt: string;
  psm: number;
  text: string;
}

const fixtures = ocrFixtures as unknown as OcrFixture[];

const findVariant = (receipt: string, psm: number): string => {
  const f = fixtures.find((x) => x.receipt === receipt && x.psm === psm);
  if (!f) throw new Error(`no fixture ${receipt} psm ${psm}`);
  return f.text;
};

describe("isFooterLine", () => {
  it("classifies Netto boilerplate as footer", () => {
    expect(isFooterLine("KIG FORBI WWW. NETTO.DK")).toBe(true);
    expect(isFooterLine("WWW.SUPPORT.NETTO.DK")).toBe(true);
    expect(isFooterLine("Varer kan returneres op til 14 dage efter køb")).toBe(true);
    expect(isFooterLine("7-22 ALLE UGENS. 7 DAGE")).toBe(true);
    expect(isFooterLine("Netto er en del af Salling Group")).toBe(true);
    expect(isFooterLine("Salling Fondene. Og fondsejet går til overskud")).toBe(true);
  });

  it("does not classify product lines as footer", () => {
    expect(isFooterLine("GESTUS PIZZA SKINKE/CHAMPIGNON")).toBe(false);
    expect(isFooterLine("REMA 1000 KAFFE")).toBe(false);
    expect(isFooterLine("FLASKEBON")).toBe(false);
    expect(isFooterLine("PISKEFLØDE")).toBe(false);
  });
});

describe("classifyReceipt — wrapped line-joining", () => {
  it("recovers the price on the next line (SPAR long-name)", () => {
    const r = classifyReceipt("GESTUS PIZZA SKINKE/CHAMPIGNON\n\n2.429,95 59,90\n");
    const wrapped = r.lines.filter((l) => l.status === "wrapped");
    expect(wrapped).toHaveLength(1);
    expect(wrapped[0].name).toBe("GESTUS PIZZA SKINKE/CHAMPIGNON");
    expect(wrapped[0].price).toBeCloseTo(59.9);
    expect(wrapped[0].kind).toBe("item");
  });

  it("joins a qty x unitprice line (SPAR thermal layout)", () => {
    const r = classifyReceipt("SILKLINE CARE TOILETPAPIR 6 RL\n4 A 19,95 12,80\n");
    const wrapped = r.lines.filter((l) => l.status === "wrapped");
    expect(wrapped).toHaveLength(1);
    expect(wrapped[0].name).toBe("SILKLINE CARE TOILETPAPIR 6 RL");
    expect(wrapped[0].price).toBeCloseTo(12.8);
  });

  it("does not join a total/payment line as a wrapped item", () => {
    const r = classifyReceipt("GESTUS SURDEJSBOLLE\n\nAT BETALE 25,05\n");
    const wrapped = r.lines.filter((l) => l.status === "wrapped");
    expect(wrapped).toHaveLength(0);
  });
});

describe("classifyReceipt — crumple", () => {
  it("flags price-visible-but-name-garbled items as crumple, not clean", () => {
    const r = classifyReceipt("ÆT 29,20\nad 8000 50,00\n");
    const crumple = r.lines.filter((l) => l.status === "crumple");
    expect(crumple).toHaveLength(2);
    expect(r.clean_count).toBe(0);
  });
});

describe("Netto footer exclusion (honest recovery)", () => {
  const r = classifyReceipt(findVariant("20260813_115152.jpg", 3));

  it("excludes Netto boilerplate from item counts", () => {
    expect(r.footer_count).toBeGreaterThanOrEqual(9);
    const footerRaw = r.lines.filter((l) => l.kind === "footer").map((l) => l.raw.toUpperCase());
    expect(footerRaw.some((x) => x.includes("WWW"))).toBe(true);
    expect(footerRaw.some((x) => x.includes("ALL E UGENS") || x.includes("UGENS"))).toBe(true);
    expect(footerRaw.some((x) => x.includes("RETURNERES"))).toBe(true);
    expect(footerRaw.some((x) => x.includes("SALLING FONDENE"))).toBe(true);
  });

  it("is honest: product recovery on Netto is near zero once footer is excluded", () => {
    expect(r.item_recovery).toBeLessThan(0.1);
    const items = r.lines.filter((l) => l.kind === "item");
    expect(items.every((l) => l.status !== "clean")).toBe(true);
  });
});

describe("all 10 fixture receipts", () => {
  it("classifies every receipt variant and reports distinct modes", () => {
    const rows: {
      receipt: string;
      psm: number;
      r: {
        item_count: number;
        clean_count: number;
        wrapped_count: number;
        crumple_count: number;
        garbled_count: number;
        footer_count: number;
        item_recovery: number;
      };
    }[] = [];
    for (const f of fixtures) {
      const r = classifyReceipt(f.text);
      rows.push({
        receipt: f.receipt,
        psm: f.psm,
        r: {
          item_count: r.item_count,
          clean_count: r.clean_count,
          wrapped_count: r.wrapped_count,
          crumple_count: r.crumple_count,
          garbled_count: r.garbled_count,
          footer_count: r.footer_count,
          item_recovery: r.item_recovery,
        },
      });
    }

    console.log(
      "\nreceipt".padEnd(24) + "psm " + "items clean wrap crumple garbled footer recovery",
    );
    for (const row of rows) {
      const r = row.r;
      console.log(
        row.receipt.padEnd(24) +
          String(row.psm).padEnd(4) +
          String(r.item_count).padEnd(6) +
          String(r.clean_count).padEnd(6) +
          String(r.wrapped_count).padEnd(5) +
          String(r.crumple_count).padEnd(8) +
          String(r.garbled_count).padEnd(8) +
          String(r.footer_count).padEnd(7) +
          (r.item_recovery * 100).toFixed(0) +
          "%",
      );
    }

    expect(rows.length).toBe(20);
    const netto = rows.filter((x) => x.receipt.startsWith("20260813_115"));
    expect(netto.some((x) => x.r.footer_count > 0)).toBe(true);
    const spar = rows.filter((x) => x.receipt.includes("153351") || x.receipt.includes("153543"));
    expect(spar.some((x) => x.r.wrapped_count > 0)).toBe(true);
    const rema = rows.filter((x) => x.receipt.includes("153655") || x.receipt.includes("153739"));
    expect(rema.some((x) => x.r.crumple_count > 0)).toBe(true);
  });

  it("never scores a footer line as a recovered item", () => {
    for (const f of fixtures) {
      const r = classifyReceipt(f.text);
      for (const line of r.lines) {
        if (line.kind === "footer") {
          expect(line.status).not.toBe("clean");
        }
      }
    }
  });
});

describe("type guard: footer lines are never clean items", () => {
  it("keeps ClassifiedLine.kind consistent", () => {
    const r = classifyReceipt(findVariant("20260813_115152.jpg", 3));
    const footers = r.lines.filter(
      (l): l is ClassifiedLine & { kind: "footer" } => l.kind === "footer",
    );
    expect(footers.length).toBe(r.footer_count);
    const items = r.lines.filter((l) => l.kind === "item");
    expect(items.length).toBe(r.item_count);
  });
});
