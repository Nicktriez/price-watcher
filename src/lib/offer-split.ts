/**
 * Split multi-product offer headings into individual alternatives.
 *
 * Danish supermarket deals often sell several alternatives in one offer:
 * "Coca-Cola, Fanta eller Tuborg Squash 24-pak" means "pay 69 kr, pick any".
 * Each alternative becomes its own product so users can add just one of them.
 *
 * Heuristic: a heading is an alternative list when it contains " eller "
 * (the Danish "or") separating STANDALONE product names. Alternatives are
 * split on commas and " eller ". The last alternative typically carries the
 * shared size/pack suffix, which is kept.
 *
 * Guard — hyphen-continuation (ONE product, do NOT split): when the token
 * immediately before " eller " ends with a hyphen, the phrase is a single
 * product described with an "or" modifier, e.g. "Softkerne- eller
 * græskarkernerugbrød" = "rye bread with soft OR pumpkin kernels" — one kind
 * of bread, not a pick-one deal. Splitting it fragments the catalog.
 */
export function splitOfferHeading(heading: string): string[] {
  const trimmed = heading.trim();
  if (!/ eller /i.test(trimmed)) return [trimmed];

  // Hyphen-continuation: a token before " eller " ends in "-" (and the
  // heading doesn't open with a comma-separated list that ends that way).
  if (/(?:^|,\s*)\S*-\s+eller\s/i.test(trimmed)) return [trimmed];

  const parts = trimmed
    .split(/\s*(?:,\s*|\s+eller\s+)/i)
    .map((p) => p.trim().replace(/^-+|-+$/g, ""))
    .filter((p) => p.length >= 2);

  return parts.length >= 2 ? parts : [trimmed];
}
