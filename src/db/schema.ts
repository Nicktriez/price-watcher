import type { JSONColumnType } from "kysely";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface ChainTable {
  id: string;
  name: string;
  tjek_dealer_id: string;
  website: string | null;
  logo_url: string | null;
  priority: number;
}

export interface StoreTable {
  id: string;
  chain_id: string;
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  lat: number | null;
  lon: number | null;
}

export interface ProductTable {
  id: string;
  name: string;
  brand: string | null;
  ean: string | null;
  unit: string | null;
  size_grams: number | null;
}

export interface OfferTable {
  id: string;
  product_id: string;
  store_id: string | null;
  catalog_id: string;
  dealer_id: string;
  heading: string;
  description: string | null;
  catalog_page: number | null;
  price: string;
  pre_price: string | null;
  currency: string;
  unit: string | null;
  size_from: number | null;
  size_to: number | null;
  pieces_from: number | null;
  pieces_max: number | null;
  image_url: string | null;
  unit_price: string | null;
  unit_price_unit: string | null;
  valid_from: string;
  valid_to: string;
  published_at: string | null;
  source: "tjek" | "crowd" | "receipt";
  trust_tier: "official" | "community" | "single";
  internal: boolean;
  raw_json: JSONColumnType<JsonObject>;
  created_at: string;
  updated_at: string;
}

export interface PricePointTable {
  id: string;
  offer_id: string | null;
  product_id: string;
  store_id: string | null;
  receipt_id: string | null;
  price: string;
  currency: string;
  observed_at: string;
  source: "offer" | "receipt";
}

export interface UserTable {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface LoginTokenTable {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface ReceiptTable {
  id: string;
  user_id: string;
  store_id: string | null;
  chain_id: string | null;
  store_name: string | null;
  receipt_date: string | null;
  total: string | null;
  currency: string;
  confidence: JSONColumnType<JsonObject> | null;
  image_path: string | null;
  source: "receipt" | "import";
  trust_tier: "community" | "single";
  created_at: string;
  updated_at: string;
}

export interface ReceiptItemTable {
  id: string;
  receipt_id: string;
  product_id: string | null;
  name: string;
  quantity: string | null;
  unit: string | null;
  price: string | null;
  raw_line: string;
  status: "clean" | "garbled" | "wrapped";
  confidence: "high" | "medium" | "low";
  created_at: string;
}

export interface ListTable {
  id: string;
  user_id: string | null;
  name: string;
  kind: "recipe" | "cleaning" | "custom";
  template_id: string | null;
}

export interface ListItemTable {
  id: string;
  list_id: string;
  product_id: string | null;
  free_text: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface Database {
  chain: ChainTable;
  store: StoreTable;
  product: ProductTable;
  offer: OfferTable;
  price_point: PricePointTable;
  user: UserTable;
  login_token: LoginTokenTable;
  receipt: ReceiptTable;
  receipt_item: ReceiptItemTable;
  list: ListTable;
  list_item: ListItemTable;
}
