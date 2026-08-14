"use server";

import { sql } from "kysely";
import { db } from "~/db/client";
import { crowdAwardDelta } from "~/lib/crowd-points";
import { computeCrowdTier, normalizeProductName, type TierReport } from "~/lib/trust-tier";

interface GroupRow {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string | null;
  price: string;
  reported_at: string;
  points_awarded: string;
}

/**
 * Re-evaluate one (store, product | normalized-name) crowd group and award the
 * upgrade-only delta to every report that just earned a tier (Task 031
 * trigger: re-tier on submit). Never re-awards — a report already at its tier
 * gets nothing. Returns the per-report delta so the submit handler can tell
 * the reporter what they earned.
 */
export async function awardCrowdGroup(
  storeId: string,
  productId: string | null,
  productName: string | null,
): Promise<Record<string, number>> {
  const rows = (await db
    .selectFrom("crowd_report")
    .select([
      "id",
      "user_id",
      "product_id",
      "product_name",
      "price",
      "reported_at",
      "points_awarded",
    ])
    .where("store_id", "=", storeId)
    .execute()) as unknown as GroupRow[];

  const group = productId
    ? rows.filter((r) => r.product_id === productId)
    : rows.filter(
        (r) =>
          r.product_id == null &&
          r.product_name != null &&
          normalizeProductName(r.product_name) === normalizeProductName(productName ?? ""),
      );

  const tier = computeCrowdTier(
    group.map(
      (r): TierReport => ({
        userId: r.user_id,
        price: parseFloat(r.price),
        reportedAt: r.reported_at,
      }),
    ),
  );
  const tierLabel = tier.tier ?? "single";

  const deltas: Record<string, number> = {};
  const perUser = new Map<string, number>();
  for (const row of group) {
    const delta = crowdAwardDelta(tierLabel, parseFloat(row.points_awarded));
    if (delta <= 0) continue;
    deltas[row.id] = delta;
    perUser.set(row.user_id, (perUser.get(row.user_id) ?? 0) + delta);
    await db
      .updateTable("crowd_report")
      .set({
        points_awarded: String(parseFloat(row.points_awarded) + delta),
        last_awarded_tier: tierLabel,
      })
      .where("id", "=", row.id)
      .execute();
  }
  for (const [userId, points] of perUser) {
    await db
      .updateTable("user")
      .set({ points: sql`points + ${points}` })
      .where("id", "=", userId)
      .execute();
  }
  return deltas;
}
