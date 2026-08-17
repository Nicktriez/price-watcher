import { normalizeName } from "./product-matching.ts";

/**
 * Bounded free_text → product resolver for list templates (Tasks 038w + 038x).
 *
 * NOT the general free-text layer (post-beta). Templates are a small fixed
 * set, so this stays conservative: exact normalized match wins, then
 * whole-token keyword containment, then prefix (catches plurals/compounds like
 * "burgerbolle" ⊂ "burgerboller"). It never does loose fuzzy matching — a
 * template item that can't be resolved honestly stays free_text.
 *
 * Ranking (038x fix): candidates are ranked by NAME AFFINITY first — how much
 * of the candidate's name the term covers (term tokens / name tokens). A
 * product whose name IS the term ("BKI Kaffe") beats one where the term is a
 * small qualifier in a long brand name ("Starbucks protein-drik med kaffe").
 * Unit price is only a tiebreak WITHIN the same affinity class, so
 * "cheapest per kg" can never pick a cheaper-but-unrelated product. A wrong
 * link is worse than no link: when unsure, the resolver leaves the item
 * free_text. The backfill records which product was chosen for each item so a
 * human can spot a bad link.
 */

export interface TemplateProductCandidate {
  id: string;
  name: string;
  /** true when the product has at least one current (valid_to >= now) offer */
  hasOffer: boolean;
  /** cheapest current unit price in kr (parsed), null when unknown */
  unitPrice: number | null;
}

export type ResolveMethod = "exact" | "keyword" | "substring" | null;

export interface TemplateResolveResult {
  productId: string | null;
  method: ResolveMethod;
}

function tokenSet(name: string): Set<string> {
  return new Set(name.split(" ").filter(Boolean));
}

/**
 * How dominant the term is in the candidate's name: term token count over the
 * name's token count. 1 = the name IS the term; low values = the term is a
 * small part of a long name. This is the "is this actually the product"
 * measure — cheaper-per-unit must never outrank a better name match (038x).
 */
function affinity(candidate: TemplateProductCandidate, termTokens: Set<string>): number {
  const nameTokens = tokenSet(normalizeName(candidate.name));
  if (nameTokens.size === 0) return 0;
  return termTokens.size / nameTokens.size;
}

function rank(
  a: TemplateProductCandidate,
  b: TemplateProductCandidate,
  termTokens: Set<string>,
): number {
  const aAff = affinity(a, termTokens);
  const bAff = affinity(b, termTokens);
  if (aAff !== bAff) return bAff - aAff; // higher name affinity first
  if (a.hasOffer !== b.hasOffer) return a.hasOffer ? -1 : 1;
  if (a.unitPrice != null && b.unitPrice != null && a.unitPrice !== b.unitPrice) {
    return a.unitPrice - b.unitPrice;
  }
  if (a.unitPrice != null && b.unitPrice == null) return -1;
  if (a.unitPrice == null && b.unitPrice != null) return 1;
  if (a.name.length !== b.name.length) return a.name.length - b.name.length;
  return a.id < b.id ? -1 : 1;
}

function pick(
  candidates: TemplateProductCandidate[],
  termTokens: Set<string>,
): TemplateProductCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => rank(a, b, termTokens))[0];
}

export function resolveTemplateProduct(
  freeText: string,
  candidates: TemplateProductCandidate[],
): TemplateResolveResult {
  const term = normalizeName(freeText);
  if (!term) return { productId: null, method: null };
  const termTokens = tokenSet(term);

  // 1. Exact normalized match.
  const exact = candidates.filter((c) => normalizeName(c.name) === term);
  const exactBest = pick(exact, termTokens);
  if (exactBest) return { productId: exactBest.id, method: "exact" };

  // 2. Keyword: every term token must appear as a whole token in the product
  //    name (avoids mid-word matches like "løg" ⊂ "hvidløg" or "æg" ⊂ "pålæg").
  const keyword = candidates.filter((c) => {
    const nameTokens = tokenSet(normalizeName(c.name));
    return termTokens.size > 0 && [...termTokens].every((t) => nameTokens.has(t));
  });
  const keywordBest = pick(keyword, termTokens);
  if (keywordBest) return { productId: keywordBest.id, method: "keyword" };

  // 3. Prefix — last resort, catches plurals/compounds that keyword misses
  //    ("burgerbolle" ⊂ "burgerboller"). Prefix-only avoids mid-word matches
  //    like "løg" ⊂ "hvidløg" or "æg" ⊂ "pålæg".
  const prefix = candidates.filter((c) => normalizeName(c.name).startsWith(term));
  const prefixBest = pick(prefix, termTokens);
  if (prefixBest) return { productId: prefixBest.id, method: "substring" };

  return { productId: null, method: null };
}
