"use server";

import { randomUUID } from "node:crypto";
import { db } from "~/db/client";
import { computeBasketCosts, type OfferSource } from "~/lib/basket-cost";
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

  const rows = await db
    .selectFrom("list_item")
    .select(["product_id", "quantity", "unit"])
    .where("list_id", "=", listId)
    .where("product_id", "is not", null)
    .execute();
  const items = rows.map((r) => ({
    productId: r.product_id as string,
    quantity: r.quantity,
    unit: r.unit,
  }));
  if (items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.productId))];

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

  return computeBasketCosts({ items, offers, storeNames, baselines });
}
