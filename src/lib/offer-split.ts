/**
 * Split multi-product offer headings into individual alternatives.
 *
 * Danish supermarket deals often sell several alternatives in one offer:
 * "Coca-Cola, Fanta eller Tuborg Squash 24-pak" means "pay 69 kr, pick any".
 * Each alternative becomes its own product so users can add just one of them.
 *
 * Heuristic: a heading is an alternative list when it contains " eller "
 * (the Danish "or"). Alternatives are split on commas and " eller ". The last
 * alternative typically carries the shared size/pack suffix, which is kept.
 * Stray leading/trailing hyphens (hyphen-continuation like "Softkerne- eller
 * græskarkernerugbrød") are stripped so names don't end in "-".
 */
export function splitOfferHeading(heading: string): string[] {
  const trimmed = heading.trim();
  if (!/ eller /i.test(trimmed)) return [trimmed];

  const parts = trimmed
    .split(/\s*(?:,\s*|\s+eller\s+)/i)
    .map((p) => p.trim().replace(/^-+|-+$/g, ""))
    .filter((p) => p.length >= 2);

  return parts.length >= 2 ? parts : [trimmed];
}
