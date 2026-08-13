import { normalizeName } from "./product-matching.ts";

const NON_INGREDIENT_PATTERNS = [
  /\b(?:personer|pers\.?)\b/i,
  /\b\d+\s*(?:min|minutter)\b/i,
  /\b(?:tilberedningstid|ovn|grader|celsius|fremgangsmåde|ingredienser|tilbehør|der skal bruges|sådan gør du)\b/i,
];

const METHOD_START =
  /^\s*(?:kog|steg|bag|skær|tilsæt|hæld|dryp|smag|vend|pensl|pil|krydr|sauter|gril|afkøl|mariner|drys|top)\w*/i;

export function splitIngredients(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length < 200)
    .filter((l) => !NON_INGREDIENT_PATTERNS.some((p) => p.test(l)))
    .filter((l) => !METHOD_START.test(l));
}

const KNOWN_UNITS = new Set([
  "g",
  "kg",
  "ml",
  "l",
  "dl",
  "cl",
  "tsk",
  "spsk",
  "stk",
  "dåser",
  "dåse",
  "liter",
  "poser",
  "pose",
  "bæger",
  "bægre",
  "skiver",
  "fed",
  "bundt",
  "plade",
  "pakker",
  "pakke",
  "flaske",
  "flasker",
  "glas",
  "kartoner",
  "karton",
]);

export interface ParsedIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
}

export function parseIngredientQuantity(line: string): ParsedIngredient {
  const match = line.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zæøå]+)\b/);
  if (!match) {
    return { name: line.trim(), amount: null, unit: null };
  }
  const amount = parseFloat(match[1].replace(",", "."));
  const firstWord = match[2].toLowerCase();
  const unit = KNOWN_UNITS.has(firstWord) ? match[2] : null;
  const rest = line.slice(match[0].length).trim();
  const name = unit ? rest || line.trim() : `${match[2]} ${rest}`.trim();
  return { name, amount, unit };
}

export function suggestProducts(
  products: { id: string; name: string }[],
  ingredientName: string,
): { id: string; name: string }[] {
  const key = normalizeName(ingredientName);
  if (!key) return [];

  const exact = products.filter((p) => normalizeName(p.name) === key);
  if (exact.length > 0) return exact.slice(0, 3);

  const contains = products.filter((p) => {
    const normalized = normalizeName(p.name);
    return normalized.includes(key) || key.includes(normalized);
  });
  return contains.slice(0, 3);
}
