"use server";

import { randomUUID } from "node:crypto";
import { db } from "~/db/client";
import { computeBasketCosts, type OfferSource } from "~/lib/basket-cost";
import { assembleMadplan, type MealOption } from "~/lib/madplan";
import { computeCrowdTier, type TierReport } from "~/lib/trust-tier";
import { getCurrentUser } from "./auth.ts";

export type ListKind = "recipe" | "cleaning" | "custom";

export interface ListSummary {
  id: string;
  name: string;
  kind: ListKind;
  itemCount: number;
}

export interface ListItemRow {
  id: string;
  productId: string | null;
  productName: string | null;
  freeText: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface ListDetail {
  id: string;
  name: string;
  kind: ListKind;
  items: ListItemRow[];
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("sign-in-required");
  return user;
}

async function ownedList(userId: string, listId: string): Promise<string | null> {
  const row = await db
    .selectFrom("list")
    .select("id")
    .where("id", "=", listId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return row?.id ?? null;
}

export async function getMyLists(): Promise<ListSummary[]> {
  const user = await requireUser();
  const rows = await db
    .selectFrom("list")
    .leftJoin("list_item", "list_item.list_id", "list.id")
    .select(["list.id", "list.name", "list.kind", db.fn.count("list_item.id").as("item_count")])
    .where("list.user_id", "=", user.id)
    .groupBy("list.id")
    .orderBy("list.created_at", "asc")
    .execute();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind as ListKind,
    itemCount: Number(r.item_count),
  }));
}

export async function createList(nameInput: string, kind: ListKind = "custom"): Promise<string> {
  const user = await requireUser();
  const name = nameInput.trim();
  if (!name) throw new Error("name-required");
  const id = randomUUID();
  const now = new Date().toISOString();
  await db
    .insertInto("list")
    .values({
      id,
      user_id: user.id,
      name,
      kind,
      template_id: null,
      created_at: now,
      updated_at: now,
    })
    .execute();
  return id;
}

export async function renameList(listId: string, nameInput: string): Promise<void> {
  const user = await requireUser();
  if (!(await ownedList(user.id, listId))) throw new Error("not-found");
  const name = nameInput.trim();
  if (!name) throw new Error("name-required");
  await db
    .updateTable("list")
    .set({ name, updated_at: new Date().toISOString() })
    .where("id", "=", listId)
    .execute();
}

export async function deleteList(listId: string): Promise<void> {
  const user = await requireUser();
  if (!(await ownedList(user.id, listId))) throw new Error("not-found");
  await db.deleteFrom("list_item").where("list_id", "=", listId).execute();
  await db.deleteFrom("list").where("id", "=", listId).execute();
}

export async function getList(listId: string): Promise<ListDetail | null> {
  const user = await requireUser();
  if (!(await ownedList(user.id, listId))) return null;

  const list = await db
    .selectFrom("list")
    .select(["id", "name", "kind"])
    .where("id", "=", listId)
    .executeTakeFirst();
  if (!list) return null;

  const items = await db
    .selectFrom("list_item")
    .leftJoin("product", "product.id", "list_item.product_id")
    .select((eb) => [
      "list_item.id",
      "list_item.product_id",
      "list_item.free_text",
      "list_item.quantity",
      "list_item.unit",
      eb.ref("product.name").as("product_name"),
    ])
    .where("list_item.list_id", "=", listId)
    .orderBy("list_item.position", "asc")
    .orderBy("list_item.created_at", "asc")
    .execute();

  return {
    id: list.id,
    name: list.name,
    kind: list.kind as ListKind,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      freeText: i.free_text,
      quantity: i.quantity,
      unit: i.unit,
    })),
  };
}

interface AddItemInput {
  productId?: string;
  freeText?: string;
  quantity?: number | null;
  unit?: string | null;
}

export async function addListItem(listId: string, input: AddItemInput): Promise<string> {
  const user = await requireUser();
  if (!(await ownedList(user.id, listId))) throw new Error("not-found");

  const freeText = input.freeText?.trim() ?? null;
  const productId = input.productId ?? null;
  if (!productId && !freeText) throw new Error("item-required");

  const positionRow = await db
    .selectFrom("list_item")
    .select(db.fn.max("position").as("max_pos"))
    .where("list_id", "=", listId)
    .executeTakeFirst();
  const position = ((positionRow?.max_pos ?? 0) as number) + 1;
  const now = new Date().toISOString();

  const id = randomUUID();
  await db
    .insertInto("list_item")
    .values({
      id,
      list_id: listId,
      product_id: productId,
      free_text: freeText,
      quantity: input.quantity ?? null,
      unit: input.unit?.trim() ?? null,
      position,
      created_at: now,
    })
    .execute();
  return id;
}

export async function updateListItem(
  listId: string,
  itemId: string,
  patch: { quantity?: number | null; unit?: string | null; freeText?: string | null },
): Promise<void> {
  const user = await requireUser();
  if (!(await ownedList(user.id, listId))) throw new Error("not-found");
  await db
    .updateTable("list_item")
    .set({
      quantity: patch.quantity ?? null,
      unit: patch.unit?.trim() ?? null,
      free_text: patch.freeText?.trim() ?? null,
    })
    .where("id", "=", itemId)
    .where("list_id", "=", listId)
    .execute();
}

export async function removeListItem(listId: string, itemId: string): Promise<void> {
  const user = await requireUser();
  if (!(await ownedList(user.id, listId))) throw new Error("not-found");
  await db.deleteFrom("list_item").where("id", "=", itemId).where("list_id", "=", listId).execute();
}

export async function reorderListItems(listId: string, orderedItemIds: string[]): Promise<void> {
  const user = await requireUser();
  if (!(await ownedList(user.id, listId))) throw new Error("not-found");
  for (let i = 0; i < orderedItemIds.length; i++) {
    await db
      .updateTable("list_item")
      .set({ position: i + 1 })
      .where("id", "=", orderedItemIds[i])
      .where("list_id", "=", listId)
      .execute();
  }
}

export async function searchProducts(
  queryInput: string,
): Promise<{ id: string; name: string; brand: string | null }[]> {
  const query = queryInput.trim();
  if (!query) return [];
  const rows = await db
    .selectFrom("product")
    .select(["id", "name", "brand"])
    .where("name", "ilike", `%${query}%`)
    .orderBy("name", "asc")
    .limit(10)
    .execute();
  return rows.map((r) => ({ id: r.id, name: r.name, brand: r.brand }));
}

export interface TemplatePreview {
  id: string;
  name: string;
  kind: ListKind;
  itemCount: number;
  firstItems: string[];
}

export async function getTemplates(): Promise<TemplatePreview[]> {
  const templates = await db
    .selectFrom("list_template")
    .select(["id", "name", "kind"])
    .orderBy("position", "asc")
    .execute();

  const previews: TemplatePreview[] = [];
  for (const t of templates) {
    const items = await db
      .selectFrom("list_template_item")
      .leftJoin("product", "product.id", "list_template_item.product_id")
      .select(["list_template_item.free_text", "product.name"])
      .where("list_template_item.template_id", "=", t.id)
      .orderBy("list_template_item.position", "asc")
      .execute();
    previews.push({
      id: t.id,
      name: t.name,
      kind: t.kind as ListKind,
      itemCount: items.length,
      firstItems: items
        .map((i) => i.name ?? i.free_text ?? "")
        .filter(Boolean)
        .slice(0, 3),
    });
  }
  return previews;
}

export async function useTemplate(templateId: string): Promise<string> {
  const user = await requireUser();

  return db.transaction().execute(async (trx) => {
    const template = await trx
      .selectFrom("list_template")
      .select(["id", "name", "kind"])
      .where("id", "=", templateId)
      .executeTakeFirst();
    if (!template) throw new Error("not-found");

    const items = await trx
      .selectFrom("list_template_item")
      .select(["product_id", "free_text", "quantity", "unit"])
      .where("template_id", "=", template.id)
      .orderBy("position", "asc")
      .execute();

    const listId = randomUUID();
    const now = new Date().toISOString();
    await trx
      .insertInto("list")
      .values({
        id: listId,
        user_id: user.id,
        name: template.name,
        kind: template.kind as ListKind,
        template_id: template.id,
        created_at: now,
        updated_at: now,
      })
      .execute();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await trx
        .insertInto("list_item")
        .values({
          id: randomUUID(),
          list_id: listId,
          product_id: item.product_id,
          free_text: item.product_id ? null : item.free_text,
          quantity: item.quantity,
          unit: item.unit,
          position: i + 1,
          created_at: now,
        })
        .execute();
    }

    return listId;
  });
}

export async function getBasketCosts(listId: string, userId: string) {
  if (!(await ownedList(userId, listId))) throw new Error("not-found");

  // Include free-text items (product_id NULL) — they flow through as
  // "no-price" and are counted honestly on the compare page (Task 038g).
  // Product-linked items without their own unit/quantity fall back to the
  // product's measurement (Task 038n) so the kr/kg / kr/l conversion can run.
  const rows = await db
    .selectFrom("list_item")
    .leftJoin("product", "product.id", "list_item.product_id")
    .select((eb) => [
      "list_item.product_id",
      "list_item.quantity",
      "list_item.unit",
      eb.ref("product.unit").as("product_unit"),
      eb.ref("product.size").as("product_size"),
    ])
    .where("list_item.list_id", "=", listId)
    .execute();
  const items = rows.map((r) => {
    const hasOwnUnit = r.unit != null && r.unit !== "";
    // Explicit unit/quantity wins; otherwise default to the product measurement.
    const unit = hasOwnUnit ? r.unit : r.product_unit;
    const quantity = r.quantity ?? (hasOwnUnit ? null : r.product_size);
    return { productId: r.product_id, quantity, unit };
  });
  if (items.length === 0) return [];

  return computeBasketCostsForItems(items);
}

export async function computeBasketCostsForItems(
  items: { productId: string | null; quantity: number | null; unit: string | null }[],
) {
  const productIds = [
    ...new Set(items.map((i) => i.productId).filter((p): p is string => p != null)),
  ];

  // A list with only free-text items has no product ids — skip the queries
  // (empty `IN ()` is invalid SQL) and price everything as no-price.
  if (productIds.length === 0) {
    return computeBasketCosts({ items, offers: {}, storeNames: {}, baselines: {} });
  }

  const offerRows = await db
    .selectFrom("offer")
    .innerJoin("chain", "chain.tjek_dealer_id", "offer.dealer_id")
    .select((eb) => [
      "offer.product_id",
      "offer.price",
      "offer.unit",
      "offer.size_from",
      "offer.unit_price",
      "offer.unit_price_unit",
      eb.ref("chain.id").as("chain_id"),
      eb.ref("chain.name").as("chain_name"),
    ])
    .where("offer.product_id", "in", productIds)
    .where("offer.valid_to", ">=", new Date().toISOString())
    .execute();

  const offers: Record<string, OfferSource[]> = {};
  const storeNames: Record<string, string> = {};
  for (const o of offerRows) {
    (offers[o.chain_id] ??= []).push({
      productId: o.product_id,
      price: parseFloat(o.price),
      unit: o.unit,
      sizeFrom: o.size_from,
      unitPrice: o.unit_price == null ? null : parseFloat(o.unit_price),
      unitPriceUnit: o.unit_price_unit,
    });
    storeNames[o.chain_id] = o.chain_name;
  }

  const baselineRows = await db
    .selectFrom("price_point")
    .select(["product_id", db.fn.avg("price").as("avg")])
    .where("source", "=", "receipt")
    .where("product_id", "in", productIds)
    .groupBy("product_id")
    .execute();
  const baselines: Record<string, number> = {};
  for (const b of baselineRows) baselines[b.product_id] = parseFloat(String(b.avg));

  const crowdRows = await db
    .selectFrom("crowd_report")
    .innerJoin("store", "store.id", "crowd_report.store_id")
    .innerJoin("chain", "chain.id", "store.chain_id")
    .innerJoin("user", "user.id", "crowd_report.user_id")
    .select((eb) => [
      eb.ref("store.chain_id").as("chain_id"),
      eb.ref("chain.name").as("chain_name"),
      eb.ref("crowd_report.product_id").as("product_id"),
      eb.ref("crowd_report.user_id").as("user_id"),
      eb.ref("crowd_report.price").as("price"),
      eb.ref("crowd_report.reported_at").as("reported_at"),
    ])
    .where("crowd_report.product_id", "in", productIds)
    .where("crowd_report.product_id", "is not", null)
    .where("crowd_report.status", "=", "active")
    .where("user.muted", "=", false)
    .execute();

  // Community crowd prices are aggregated per chain (the compare's shopping
  // destination), so a chain with crowd prices but no offer still appears.
  const crowdGroups = new Map<string, Map<string, TierReport[]>>();
  for (const c of crowdRows) {
    if (c.product_id == null) continue;
    storeNames[c.chain_id] = c.chain_name;
    const chainGroup = crowdGroups.get(c.chain_id) ?? new Map<string, TierReport[]>();
    const productGroup = chainGroup.get(c.product_id) ?? [];
    productGroup.push({
      userId: c.user_id,
      price: parseFloat(c.price),
      reportedAt: c.reported_at,
    });
    chainGroup.set(c.product_id, productGroup);
    crowdGroups.set(c.chain_id, chainGroup);
  }
  const crowdPrices: Record<string, Record<string, number>> = {};
  for (const [chainId, productGroups] of crowdGroups) {
    for (const [productId, reports] of productGroups) {
      const tier = computeCrowdTier(reports);
      if (tier.tier === "community" && tier.representativePrice != null) {
        (crowdPrices[chainId] ??= {})[productId] = tier.representativePrice;
      }
    }
  }

  return computeBasketCosts({ items, offers, storeNames, baselines, crowdPrices });
}

export interface MadplanResult {
  meals: { templateId: string; name: string; cost: number }[];
  planTotal: number;
  daysFilled: number;
  requestedDays: number;
  fits: boolean;
  cheapestStore: { storeId: string; storeName: string; total: number } | null;
}

export async function generateMadplan(
  budgetInput: number,
  daysInput: number,
): Promise<MadplanResult> {
  const budget = Number.isFinite(budgetInput) && budgetInput > 0 ? budgetInput : 500;
  const days = Number.isInteger(daysInput) && daysInput >= 1 ? Math.min(daysInput, 7) : 7;

  const templates = await db.selectFrom("list_template").select(["id", "name"]).execute();

  const mealOptions: MealOption[] = [];
  for (const template of templates) {
    const items = await db
      .selectFrom("list_template_item")
      .select(["product_id", "quantity", "unit"])
      .where("template_id", "=", template.id)
      .where("product_id", "is not", null)
      .execute();
    if (items.length === 0) continue;
    const costs = await computeBasketCostsForItems(
      items.map((i) => ({ productId: i.product_id as string, quantity: i.quantity, unit: i.unit })),
    );
    const priced = costs
      .filter((c) => c.basketTotal > 0)
      .sort((a, b) => a.basketTotal - b.basketTotal);
    if (priced.length === 0) continue;
    mealOptions.push({ templateId: template.id, name: template.name, cost: priced[0].basketTotal });
  }

  const plan = assembleMadplan(mealOptions, budget, days);

  const combinedItems = new Map<
    string,
    { productId: string; quantity: number; unit: string | null }
  >();
  for (const meal of plan.meals) {
    const items = await db
      .selectFrom("list_template_item")
      .select(["product_id", "quantity", "unit"])
      .where("template_id", "=", meal.templateId)
      .where("product_id", "is not", null)
      .execute();
    for (const i of items) {
      const key = i.product_id as string;
      const existing = combinedItems.get(key);
      const qty = i.quantity ?? 1;
      if (existing) {
        existing.quantity += qty;
      } else {
        combinedItems.set(key, { productId: key, quantity: qty, unit: i.unit });
      }
    }
  }

  let cheapestStore: MadplanResult["cheapestStore"] = null;
  if (combinedItems.size > 0) {
    const combinedCosts = await computeBasketCostsForItems([...combinedItems.values()]);
    const priced = combinedCosts.filter((c) => c.basketTotal > 0);
    const itemsInBasket = combinedItems.size;
    const decentCoverage = priced
      .filter((c) => (c.offerItems + c.baselineItems) / itemsInBasket >= 0.5)
      .sort((a, b) => a.basketTotal - b.basketTotal);
    if (decentCoverage.length > 0) {
      cheapestStore = {
        storeId: decentCoverage[0].storeId,
        storeName: decentCoverage[0].storeName,
        total: decentCoverage[0].basketTotal,
      };
    }
  }

  return {
    meals: plan.meals.map((m) => ({ templateId: m.templateId, name: m.name, cost: m.cost })),
    planTotal: plan.total,
    daysFilled: plan.daysFilled,
    requestedDays: days,
    fits: plan.fits,
    cheapestStore,
  };
}
