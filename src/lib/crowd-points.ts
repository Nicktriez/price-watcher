export type CrowdTier = "single" | "community";

/**
 * Points for crowd price reports — config-driven (like Task 016's
 * BASE_POINTS/MAX_CLEAN_BONUS). Aligned with the trust tier: a lone
 * unverified report is worth nothing (don't reward spam); a report that
 * reaches Community (>=3 distinct users within tolerance) is worth points.
 */
export const CROWD_POINTS = {
  single: 0, // no points for an unverified report
  community: 15, // a report that helped the group reach Community
} as const;

export function computeCrowdAward(tier: CrowdTier): number {
  return CROWD_POINTS[tier];
}

/**
 * Upgrade-only award delta: how much to award now for a report whose group
 * currently has `tier`, given what it was already awarded. Never re-awards
 * the base — once a report is at Community it stays paid.
 */
export function crowdAwardDelta(tier: CrowdTier, previouslyAwarded: number): number {
  return Math.max(0, computeCrowdAward(tier) - previouslyAwarded);
}
