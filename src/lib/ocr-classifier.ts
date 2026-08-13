const JUNK_IN_DIGITS = /(?<=\d)[£€$*|^/\\]+(?=\d)/g;
const PREFIX_NOISE =
  /^(?:[;:|=.,'&_+\s–—-]+|(?:rr|re|ree|ae|de|er|ee|ig|tr|tren|by|dv|fa|og|en|adlgg|å|j|i|s|g)\b\s*)+/i;
const METADATA_LINE = /\bBON\s*[:;]|\bKS\s*[:;]|\bKASSE\s*[:;]/;
const WORD_RE = /[A-ZÆØÅa-zæøå]{3,}/g;
const LETTER_RE = /[A-ZÆØÅa-zæøå]/;
const PRICE_RE_G = /\d{1,4}(?:\.\d{3})*[,.]\d{2}/g;

const EXACT_LABELS = new Set([
  "MEGETMEREDISCOUNT",
  "MEGETMERE",
  "TILMELDDIGOGSPARVEDLIDLPLUS",
  "VEDLIDLPLUS",
  "VEDLIDL",
  "OGSPARVEDLIDLPLUS",
  "SPARVEDLIDLPLUS",
  "TILWELDDIG",
  "TILWELD",
  "DISCOUNT",
  "MEJSEBOLDE",
]);

const CONTAINS_LABELS = [
  "KONTANT",
  "GAVEKORT",
  "UDBETALING",
  "NYSALDO",
  "NYSALIG",
  "BETALING",
  "BETALE",
  "INKMOMS",
  "PENGETILBAGE",
  "TILBAGE",
  "VEDLIDL",
  "TILMELD",
  "TILWELD",
  "MEGETMERE",
  "DISCOUNT",
  "UANKØRT",
  "UANKORT",
  "AFRUNDING",
  "SALDO",
  "SALDDT",
  "SALIG",
  "SALID",
  "SALDT",
  "SALDE",
  "MOMS",
];

const LABELS_NORM = [
  "ATBETALE",
  "TILBETALING",
  "BELØB",
  "IALT",
  "TOTALT",
  "TOTAL",
  "SUM",
  "UDBETALING",
  "KONTANT",
  "DANKORT",
  "MOBILEPAY",
  "GAVEKORT",
  "NYSALDO",
  "NYSALIG",
  "SALIDT",
  "HERAFMOMS",
  "CHERAFMOMS",
  "THERAFMOMS",
  "AMERAFMOMS",
  "MOMS",
  "BETJENTAF",
  "EKSPEDIENT",
  "KASSE",
  "KASSENR",
  "BON",
  "BONUS",
  "CVR",
  "CVRNR",
  "CVÆNR",
  "UVRENR",
  "TELF",
  "TLF",
  "TELEFON",
  "ÅBNINGSTIDER",
  "ALLEDAGE",
  "TILMELD",
  "AFRUNDING",
  "PENGETILBAGE",
  "INKMOMS",
  "RABAT",
  "RABÅT",
  "RABOT",
  "PANT",
  "FLASKEPANT",
  "SUBTOTAL",
  "MELLEMSUM",
  "KURV",
  "POSE",
  "KVITTERING",
  "MODTAGET",
  "HÆVET",
  "MEDLEM",
  "MILJØ",
  "BALANCE",
  "FRAKORT",
  "BANKKORT",
  "ORIGINAL",
  "BESTILT",
  "FAKTURA",
];

const FOOTER_PATTERNS: RegExp[] = [
  /\bwww\s*\./i,
  /\bhttps?:\/\//i,
  /\b[A-ZÆØÅ0-9]+\.(?:dk|net|com)\b/i,
  /er en del af/i,
  /salling group/i,
  /salling fondene/i,
  /fondsejet/i,
  /overskud/i,
  /kan returneres/i,
  /returner/i,
  /reklamation/i,
  /kvittering/i,
  /fremvisning/i,
  /undtagelser/i,
  /op til \d+ dage/i,
  /åbningstider/i,
  /alle dage/i,
  /alle ugens/i,
  /ugens \d/i,
];

export type OcrKind = "item" | "footer";
export type OcrStatus = "clean" | "garbled" | "wrapped" | "crumple";

export interface ClassifiedLine {
  raw: string;
  name: string | null;
  price: number | null;
  kind: OcrKind;
  status: OcrStatus;
  quality: number;
  note?: string;
}

export interface ReceiptClassification {
  lines: ClassifiedLine[];
  item_count: number;
  clean_count: number;
  wrapped_count: number;
  crumple_count: number;
  garbled_count: number;
  footer_count: number;
  item_recovery: number;
}

function cleanLine(raw: string): string {
  return raw.replace(JUNK_IN_DIGITS, "").trim().replace(/\s+/g, " ");
}

function cleanWords(name: string): string[] {
  return name.match(WORD_RE) ?? [];
}

function nameQuality(name: string): number {
  const letters = (name.match(/[A-ZÆØÅa-zæøå]/g) ?? []).length;
  const nonSpace = name.replace(/\s/g, "").length;
  return nonSpace === 0 ? 0 : letters / nonSpace;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parsePrice(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

function normalizeLabel(name: string): string {
  const n = name
    .trim()
    .replace(/[=–—\-:;,.]/g, "")
    .toUpperCase()
    .replace(/[^A-ZÆØÅ0-9]/g, "")
    .replace(/^[0-9]+/, "");
  return n;
}

function isLabel(name: string): boolean {
  const n = normalizeLabel(name);
  if (!n) return true;
  if (EXACT_LABELS.has(n)) return true;
  if (n.startsWith("PANT") || n.startsWith("RABAT") || n.startsWith("RABÅT")) return true;
  if (n.startsWith("BETJENTAF") || n.startsWith("EKSPEDIENT")) return true;
  for (const lab of CONTAINS_LABELS) {
    if (n.includes(lab)) return true;
  }
  for (const lab of LABELS_NORM) {
    if (n.startsWith(lab)) {
      const rest = n.slice(lab.length);
      if (rest === "" || !/[A-ZÆØÅ]{2,}/.test(rest)) return true;
    }
  }
  return false;
}

export function isFooterLine(line: string): boolean {
  return FOOTER_PATTERNS.some((p) => p.test(line));
}

function stripName(line: string): string | null {
  const name = line.replace(PREFIX_NOISE, "").trim();
  if (!name || !LETTER_RE.test(name)) return null;
  return name;
}

function extractName(line: string, priceEnd: number): string | null {
  let name = line
    .slice(0, priceEnd)
    .trim()
    .replace(/[=–—\-:;,.]+$/, "")
    .trim();
  name = name.replace(/\s+(?:x|å|a|stk)?\s*\d{1,4}[,.]\d{2}\s*$/i, "").trim();
  name = name.replace(PREFIX_NOISE, "").trim();
  if (!name || !LETTER_RE.test(name)) return null;
  return name;
}

interface JoinedPrice {
  name: string;
  price: number;
  usedIndex: number;
}

function joinNextPrice(rawLines: string[], i: number): JoinedPrice | null {
  for (let j = i + 1; j < Math.min(i + 3, rawLines.length); j++) {
    const next = cleanLine(rawLines[j]);
    if (!next) continue;
    if (METADATA_LINE.test(next)) break;
    const matches = [...next.matchAll(PRICE_RE_G)];
    if (matches.length === 0) {
      if (isLabel(next)) break;
      continue;
    }
    const last = matches[matches.length - 1];
    const before = stripName(next.slice(0, last.index));
    if (before !== null) break;
    return {
      name: rawLines[i].trim(),
      price: parsePrice(last[0]),
      usedIndex: j,
    };
  }
  return null;
}

export function classifyReceipt(text: string): ReceiptClassification {
  const rawLines = text.split("\n");
  const lines: ClassifiedLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const line = cleanLine(raw);
    if (!line || METADATA_LINE.test(line)) continue;

    if (isLabel(line)) continue;

    if (isFooterLine(line)) {
      lines.push({ raw, name: null, price: null, kind: "footer", status: "garbled", quality: 0 });
      continue;
    }

    const matches = [...line.matchAll(PRICE_RE_G)];
    if (matches.length > 0) {
      const last = matches[matches.length - 1];
      const price = parsePrice(last[0]);
      const name = extractName(line, last.index ?? 0);
      if (name) {
        const qual = nameQuality(name);
        const ok = qual >= 0.5 && cleanWords(name).length > 0;
        lines.push({
          raw,
          name,
          price,
          kind: "item",
          status: ok ? "clean" : "crumple",
          quality: round2(qual),
          ...(ok ? {} : { note: "price recovered, name garbled" }),
        });
      }
      continue;
    }

    const name = stripName(line);
    if (!name) continue;

    const joined = joinNextPrice(rawLines, i);
    if (joined) {
      lines.push({
        raw,
        name: joined.name,
        price: joined.price,
        kind: "item",
        status: "wrapped",
        quality: round2(nameQuality(joined.name)),
        note: "price joined from next line",
      });
      i = joined.usedIndex;
    } else {
      lines.push({
        raw,
        name,
        price: null,
        kind: "item",
        status: "garbled",
        quality: round2(nameQuality(name)),
        note: "name recovered, price not read",
      });
    }
  }

  const items = lines.filter((l) => l.kind === "item");
  const clean = items.filter((l) => l.status === "clean").length;
  const wrapped = items.filter((l) => l.status === "wrapped").length;
  const crumple = items.filter((l) => l.status === "crumple").length;
  const garbled = items.filter((l) => l.status === "garbled").length;
  const recovered = clean + wrapped;

  return {
    lines,
    item_count: items.length,
    clean_count: clean,
    wrapped_count: wrapped,
    crumple_count: crumple,
    garbled_count: garbled,
    footer_count: lines.filter((l) => l.kind === "footer").length,
    item_recovery: items.length ? recovered / items.length : 0,
  };
}
