import { normalizeName } from "./product-matching.ts";

/**
 * Bounded free_text → product resolver for list templates (Task 038w).
 *
 * NOT the general free-text layer (that's 038x, post-beta). Templates are a
 * small fixed set, so this stays conservative: exact normalized match wins,
 * then whole-token keyword containment, then prefix (catches plurals/
 * compounds like "burgerbolle" ⊂ "burgerboller"). It never does loose fuzzy
 * matching — a template item that can't be resolved honestly stays free_text.
 *
 * Deterministic ranking within a tier: priced offer first, then cheapest
 * unit price, then shortest name, then id. The backfill records which product
 * was chosen for each item so a human can spot a wrong link.
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

function rank(a: TemplateProductCandidate, b: TemplateProductCandidate): number {
  if (a.hasOffer !== b.hasOffer) return a.hasOffer ? -1 : 1;
  if (a.unitPrice != null && b.unitPrice != null && a.unitPrice !== b.unitPrice) {
    return a.unitPrice - b.unitPrice;
  }
  if (a.unitPrice != null && b.unitPrice == null) return -1;
  if (a.unitPrice == null && b.unitPrice != null) return 1;
  if (a.name.length !== b.name.length) return a.name.length - b.name.length;
  return a.id < b.id ? -1 : 1;
}

function pick(candidates: TemplateProductCandidate[]): TemplateProductCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(rank)[0];
}

function tokenSet(name: string): Set<string> {
  return new Set(name.split(" ").filter(Boolean));
}

export function resolveTemplateProduct(
  freeText: string,
  candidates: TemplateProductCandidate[],
): TemplateResolveResult {
  const term = normalizeName(freeText);
  if (!term) return { productId: null, method: null };

  // 1. Exact normalized match.
  const exact = candidates.filter((c) => normalizeName(c.name) === term);
  const exactBest = pick(exact);
  if (exactBest) return { productId: exactBest.id, method: "exact" };

  // 2. Keyword: every term token must appear as a whole token in the product
  //    name (avoids mid-word matches like "løg" ⊂ "hvidløg" or "æg" ⊂ "pålæg").
  const termTokens = tokenSet(term);
  const keyword = candidates.filter((c) => {
    const nameTokens = tokenSet(normalizeName(c.name));
    return termTokens.size > 0 && [...termTokens].every((t) => nameTokens.has(t));
  });
  const keywordBest = pick(keyword);
  if (keywordBest) return { productId: keywordBest.id, method: "keyword" };

  // 3. Prefix — last resort, catches plurals/compounds that keyword misses
  //    ("burgerbolle" ⊂ "burgerboller"). Prefix-only avoids mid-word matches
  //    like "løg" ⊂ "hvidløg" or "æg" ⊂ "pålæg".
  const prefix = candidates.filter((c) => normalizeName(c.name).startsWith(term));
  const prefixBest = pick(prefix);
  if (prefixBest) return { productId: prefixBest.id, method: "substring" };

  return { productId: null, method: null };
}
