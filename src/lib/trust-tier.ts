export type TrustTier = "official" | "community" | "single";

/**
 * Tolerance for "these two prices agree" (GasBuddy-style):
 * within ±2% OR ±1 kr, whichever is larger. Config-driven here so the
 * community flip threshold is explicit and testable.
 */
export const PRICE_TOLERANCE = {
  relative: 0.02, // ±2%
  absoluteKr: 1, // or ±1 kr, whichever is larger
} as const;

/** A Single report older than this is stale (visually distinguished, never hidden). */
export const SINGLE_STALE_MS = 24 * 60 * 60 * 1000;

/** Community needs this many DISTINCT reporters agreeing within tolerance. */
export const COMMUNITY_MIN_REPORTERS = 3;

export interface TierReport {
  userId: string;
  price: number;
  reportedAt: string | Date;
}

export interface CrowdTierResult {
  tier: "community" | "single" | null;
  representativePrice: number | null;
  distinctUsers: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Free-text grouping key (Task 029 free-text fallback): reports without a
 * product_id group by normalized name (trim + lowercase) so agreeing free-text
 * reports can reach Community together. Product-linked reports group by
 * product_id instead. Two spellings not grouping is an accepted risk until
 * moderation (Task 032) links them.
 */
export function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

export function pricesAgree(a: number, b: number): boolean {
  // Compare in øre (rounded) so float drift never breaks "agree".
  const diff = Math.abs(round2(a) - round2(b));
  const tolerance = Math.max(Math.max(a, b) * PRICE_TOLERANCE.relative, PRICE_TOLERANCE.absoluteKr);
  return diff <= tolerance;
}

/**
 * Compute the crowd tier for a group of reports (same store+product key).
 * Anti-gaming: each reporter counts once, using their LATEST report. The tier
 * flips to Community when >= COMMUNITY_MIN_REPORTERS distinct users agree
 * within tolerance. Never Official — crowd data can't reach the feed tier.
 */
export function computeCrowdTier(reports: TierReport[]): CrowdTierResult {
  const byUser = new Map<string, TierReport>();
  for (const r of reports) {
    const prev = byUser.get(r.userId);
    if (!prev || new Date(r.reportedAt).getTime() > new Date(prev.reportedAt).getTime()) {
      byUser.set(r.userId, r);
    }
  }
  const latest = [...byUser.values()];
  if (latest.length === 0) return { tier: null, representativePrice: null, distinctUsers: 0 };

  // Find the largest cluster of distinct reporters agreeing with a reference price.
  let bestCluster: number[] = [];
  for (const ref of latest) {
    const cluster = latest.filter((r) => pricesAgree(r.price, ref.price)).map((r) => r.price);
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }

  if (bestCluster.length >= COMMUNITY_MIN_REPORTERS) {
    const sorted = [...bestCluster].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return { tier: "community", representativePrice: round2(median), distinctUsers: latest.length };
  }

  return {
    tier: "single",
    representativePrice: round2(latest[0].price),
    distinctUsers: latest.length,
  };
}

export function isStaleSingle(at: string | Date, now: Date = new Date()): boolean {
  return now.getTime() - new Date(at).getTime() > SINGLE_STALE_MS;
}

export function ageLabel(at: string | Date, now: Date = new Date()): string {
  const ms = Math.max(0, now.getTime() - new Date(at).getTime());
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min old`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h old`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} old`;
}

export interface FreeTextReportRow {
  storeId: string;
  storeName: string;
  productName: string;
  userId: string;
  price: number;
  reportedAt: string | Date;
}

export interface FreeTextPriceGroup {
  storeId: string;
  storeName: string;
  name: string;
  tier: "community" | "single";
  price: number;
  userCount: number;
  reportedAt: string;
  age: string;
  stale: boolean;
}

/**
 * Group free-text crowd reports (product_id IS NULL) by store + normalized
 * product name so agreeing reports can reach Community without moderation
 * (Task 030 decision a). Same tier rules as the product-linked path. The
 * group's normalized `name` is the seam Task 032 uses to link to a product.
 */
export function computeFreeTextGroups(
  rows: FreeTextReportRow[],
  now: Date = new Date(),
): FreeTextPriceGroup[] {
  const byKey = new Map<
    string,
    { storeId: string; storeName: string; name: string; reports: TierReport[]; latest: Date }
  >();
  for (const r of rows) {
    const key = `${r.storeId}|${normalizeProductName(r.productName)}`;
    const entry = byKey.get(key) ?? {
      storeId: r.storeId,
      storeName: r.storeName,
      name: normalizeProductName(r.productName),
      reports: [],
      latest: new Date(0),
    };
    entry.reports.push({ userId: r.userId, price: r.price, reportedAt: r.reportedAt });
    const at = new Date(r.reportedAt);
    if (at.getTime() > entry.latest.getTime()) entry.latest = at;
    byKey.set(key, entry);
  }

  const groups: FreeTextPriceGroup[] = [];
  for (const entry of byKey.values()) {
    const tier = computeCrowdTier(entry.reports);
    if (tier.tier == null || tier.representativePrice == null) continue;
    groups.push({
      storeId: entry.storeId,
      storeName: entry.storeName,
      name: entry.name,
      tier: tier.tier,
      price: tier.representativePrice,
      userCount: tier.distinctUsers,
      reportedAt: entry.latest.toISOString(),
      age: ageLabel(entry.latest, now),
      stale: tier.tier === "single" && isStaleSingle(entry.latest, now),
    });
  }

  groups.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return groups;
}
