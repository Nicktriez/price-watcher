import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { classifyReceipt, type ClassifiedLine } from "./ocr-classifier.ts";

const execFileAsync = promisify(execFile);

const TESS_LANG = "dan";
const PSM_MODES = [3, 6] as const;
const ROTATIONS = [0, 90, 180, 270] as const;

const CHAIN_PATTERNS: [string, RegExp[]][] = [
  ["REMA 1000", [/\bREMA\s*1000/g, /Rema\s*[=]?\s*1000/g]],
  ["SPAR", [/\bSP[ÅA]R/g, /\bSPAR/g, /\bSPARINN/g, /sPAR/g]],
  ["Lidl", [/\bLIDL/g, /\bLidl/g, /Lid[ltd]\s*Plus/g, /[nv]ed\s*Lid[ltd]/g]],
  ["Netto", [/\bNETTO/g]],
  ["Bilka", [/\bBILKA/g]],
  ["Føtex", [/F[ØO]TEX/g]],
  ["MENY", [/\bMENY\b/g]],
  ["Kvickly", [/\bKVICKLY/g]],
  ["SuperBrugsen", [/SUPER\s*BRUGSEN/g, /SUPERBRUGSEN/g]],
  ["365discount", [/\b365/g]],
  ["Min Købmand", [/MIN\s*K[ØO]BMAND/g]],
];

const DATE_PATTERNS: { re: RegExp; twoDigit: boolean }[] = [
  { re: /(\d{1,2})\.(\d{1,2})\.(\d{4})/, twoDigit: false },
  { re: /(\d{1,2})\.(\d{1,2})\.(\d{2})\b/, twoDigit: true },
  { re: /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, twoDigit: false },
  { re: /(\d{4})-(\d{1,2})-(\d{1,2})/, twoDigit: false },
  { re: /(\d{2})[ ]+(\d{2})[ ]+(\d{4})/, twoDigit: false },
];

const TOTAL_LABELS = [
  "AT BETALE",
  "TIL BETALING",
  "BELØB",
  "I ALT",
  "TOTALT",
  "TOTAL",
  "SUM",
  "AT BETALE MED",
  "BETALING",
  "UDBETALING",
];

const PRICE_RE = /\d{1,4}(?:\.\d{3})*[,.]\d{2}/g;

export interface ReceiptField<T> {
  value: T | null;
  confidence: "high" | "medium" | "low";
  note?: string;
}

export interface ParsedItem {
  name: string | null;
  price: number | null;
  status: "clean" | "garbled" | "wrapped";
  quality: number;
  note?: string;
}

export interface ReceiptParse {
  image: string;
  best_rotation: number;
  store: ReceiptField<string>;
  date: ReceiptField<string>;
  total: ReceiptField<number>;
  items: ParsedItem[];
  item_recovery: number;
  footer_count: number;
}

function scoreText(text: string): number {
  const prices = (text.match(PRICE_RE) ?? []).length;
  const words = (text.match(/[A-ZÆØÅa-zæøå]{3,}/g) ?? []).length;
  const singleChars = (text.match(/\b\w\b/g) ?? []).length;
  return prices * 100 + words * 2 - singleChars * 2;
}

function parsePrice(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

async function runTesseract(image: string, psm: number): Promise<string> {
  const { stdout } = await execFileAsync("tesseract", [
    image,
    "stdout",
    "-l",
    TESS_LANG,
    "--psm",
    String(psm),
  ]);
  return stdout;
}

export function findStore(text: string): ReceiptField<string> {
  const hits: { chain: string; pos: number }[] = [];
  for (const [chain, patterns] of CHAIN_PATTERNS) {
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        if (chain === "SPAR") {
          const ctx = text.slice(
            Math.max(0, (match.index ?? 0) - 8),
            (match.index ?? 0) + match[0].length + 12,
          );
          if (/og\s+spar\b/i.test(ctx)) continue;
        }
        hits.push({ chain, pos: match.index ?? 0 });
      }
    }
  }
  if (hits.length === 0) {
    return { value: null, confidence: "low", note: "no chain name found in OCR text" };
  }
  const counts = new Map<string, number>();
  const firstPos = new Map<string, number>();
  for (const { chain, pos } of hits) {
    counts.set(chain, (counts.get(chain) ?? 0) + 1);
    firstPos.set(chain, Math.min(firstPos.get(chain) ?? Number.MAX_SAFE_INTEGER, pos));
  }
  let top = "";
  let bestCount = -1;
  let bestPos = Number.MAX_SAFE_INTEGER;
  for (const [chain, count] of counts) {
    const pos = firstPos.get(chain) ?? Number.MAX_SAFE_INTEGER;
    if (count > bestCount || (count === bestCount && pos < bestPos)) {
      top = chain;
      bestCount = count;
      bestPos = pos;
    }
  }
  const confidence = bestCount >= 2 || bestPos < 150 ? "high" : "medium";
  return { value: top, confidence };
}

export function findDate(text: string): ReceiptField<string> {
  const found: { raw: string; value: string }[] = [];
  const lines = text.split("\n").map((l) => l.trim());
  for (const line of lines) {
    for (const { re, twoDigit } of DATE_PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      let d = parseInt(m[1], 10);
      let mo = parseInt(m[2], 10);
      let y = parseInt(m[3], 10);
      if (twoDigit) y += 2000;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) {
        found.push({
          raw: line,
          value: `${String(d).padStart(2, "0")}.${String(mo).padStart(2, "0")}.${String(y).padStart(4, "0")}`,
        });
      }
    }
  }
  if (found.length === 0) {
    return { value: null, confidence: "low", note: "no date pattern recovered" };
  }
  const counts = new Map<string, number>();
  for (const f of found) counts.set(f.value, (counts.get(f.value) ?? 0) + 1);
  let best = "";
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  const cleanHits = found.filter((f) => f.raw.includes(best)).length;
  const confidence: "high" | "medium" | "low" = cleanHits === found.length ? "high" : "medium";
  return { value: best, confidence };
}

export function findTotal(text: string): ReceiptField<number> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
      .replace(/^[;:|=.,\s–—-]+/, "")
      .replace(/(?<=\d)[£€$*|^/\\]+(?=\d)/g, "")
      .replace(/[ÅÂ]/g, "A");
    for (const label of TOTAL_LABELS) {
      const m = line.match(
        new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.*)$`, "i"),
      );
      if (m) {
        const prices = m[1].match(PRICE_RE);
        if (prices) {
          const first = prices[0];
          const before = m[1].slice(0, m[1].indexOf(first));
          if (!/\d/.test(before)) {
            return { value: parsePrice(first), confidence: "high", note: label };
          }
        }
      }
      if (new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i").test(line)) {
        for (let k = i + 1; k < Math.min(i + 3, lines.length); k++) {
          const pm = lines[k].match(PRICE_RE);
          if (pm && lines[k].slice(0, pm.index).trim() === "") {
            return {
              value: parsePrice(pm[0]),
              confidence: "medium",
              note: `${label} | ${lines[k]}`,
            };
          }
        }
        for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
          const pm = lines[k].match(PRICE_RE);
          if (pm && lines[k].slice(0, pm.index).trim() === "") {
            return {
              value: parsePrice(pm[0]),
              confidence: "medium",
              note: `${lines[k]} | ${label}`,
            };
          }
          if ((lines[k].match(/[A-ZÆØÅa-zæøå]{3,}/g) ?? []).length >= 2) break;
        }
      }
    }
  }
  return { value: null, confidence: "low", note: "no total label with price recovered" };
}

function toParsedItem(line: ClassifiedLine): ParsedItem {
  let status: ParsedItem["status"] = "garbled";
  if (line.status === "clean") status = "clean";
  else if (line.status === "wrapped") status = "wrapped";
  return {
    name: line.name,
    price: line.price,
    status,
    quality: line.quality,
    ...(line.note ? { note: line.note } : {}),
  };
}

function mergeItems(variants: ClassifiedLine[][]): ParsedItem[] {
  const byName = new Map<string, ParsedItem[]>();
  for (const variantLines of variants) {
    for (const line of variantLines) {
      if (line.kind !== "item" || !line.name) continue;
      const list = byName.get(line.name.toLowerCase()) ?? [];
      list.push(toParsedItem(line));
      byName.set(line.name.toLowerCase(), list);
    }
  }
  const out: ParsedItem[] = [];
  for (const group of byName.values()) {
    const priced = group.filter((i) => i.price != null);
    if (priced.length > 0) {
      const byPrice = new Map<number, ParsedItem>();
      for (const item of priced) {
        const key = Math.round((item.price as number) * 100);
        if (!byPrice.has(key)) byPrice.set(key, item);
      }
      out.push(...byPrice.values());
    } else {
      out.push(group[0]);
    }
  }
  return out;
}

export async function ocrReceipt(imagePath: string): Promise<ReceiptParse> {
  const tmp = await mkdtemp(join(tmpdir(), "receipt-ocr-"));
  try {
    const rotated: { rot: (typeof ROTATIONS)[number]; file: string }[] = [];
    for (const rot of ROTATIONS) {
      const file = join(tmp, `r${rot}.png`);
      await sharp(imagePath).grayscale().rotate(rot).png().toFile(file);
      rotated.push({ rot, file });
    }

    let bestScore = -1;
    let bestRot: (typeof ROTATIONS)[number] = ROTATIONS[0];
    const ocrByRotation = new Map<number, { psm: number; text: string }[]>();
    for (const { rot, file } of rotated) {
      const variantTexts: { psm: number; text: string }[] = [];
      for (const psm of PSM_MODES) {
        const text = await runTesseract(file, psm);
        variantTexts.push({ psm, text });
        const score = scoreText(text);
        if (score > bestScore) {
          bestScore = score;
          bestRot = rot;
        }
      }
      ocrByRotation.set(rot, variantTexts);
    }

    const bestVariants = ocrByRotation.get(bestRot) ?? [];
    const parsed = bestVariants.map((v) => ({
      store: findStore(v.text),
      date: findDate(v.text),
      total: findTotal(v.text),
      classified: classifyReceipt(v.text),
    }));

    const store = mergeField(parsed.map((p) => p.store));
    const date = mergeField(parsed.map((p) => p.date));
    const total = mergeField(parsed.map((p) => p.total));

    const items = mergeItems(parsed.map((p) => p.classified.lines));
    const footer_count = Math.max(...parsed.map((p) => p.classified.footer_count), 0);
    const recovered = items.filter((i) => i.price != null).length;
    const item_recovery = items.length ? recovered / items.length : 0;

    return {
      image: imagePath,
      best_rotation: bestRot,
      store,
      date,
      total,
      items,
      item_recovery,
      footer_count,
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

function mergeField<T>(fields: ReceiptField<T>[]): ReceiptField<T> {
  const ranked: Record<string, ReceiptField<T>[]> = { high: [], medium: [], low: [] };
  for (const f of fields) ranked[f.confidence].push(f);
  let chosen: ReceiptField<T> | undefined;
  for (const conf of ["high", "medium", "low"]) {
    if (ranked[conf].length > 0) {
      chosen = ranked[conf][0];
      break;
    }
  }
  if (!chosen) chosen = fields[0];

  const values = new Set<string>();
  for (const f of fields) {
    if (f.value != null) values.add(String(f.value));
  }
  if (values.size > 1 && chosen.confidence === "high") {
    return {
      ...chosen,
      confidence: "low",
      note: `variants disagree on value: ${[...values].sort().join(", ")}`,
    };
  }
  return chosen;
}
