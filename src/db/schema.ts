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
  size: number | null;
  size_to: number | null;
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
  email: string | null;
  created_at: string;
  updated_at: string;
  points: number;
  receipt_count: number;
  current_streak: number;
  last_receipt_date: string | null;
  home_address: string | null;
  home_lat: number | null;
  home_lon: number | null;
  fuel_type: "petrol" | "diesel" | "ev" | null;
  efficiency: number | null;
  ev_charging: "home" | "public" | null;
  muted: boolean;
  user_handle: string | null;
}

export interface PasskeyCredentialTable {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: string;
  transports: JsonValue | null;
  created_at: string;
  last_used_at: string | null;
}

export interface WebauthnChallengeTable {
  id: string;
  user_id: string | null;
  challenge_hash: string;
  user_handle: string | null;
  expires_at: string;
  created_at: string;
}

export interface UserStoreDistanceTable {
  user_id: string;
  store_id: string;
  distance_km: number;
  round_trip_km: number;
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
  points_awarded: number;
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

export interface FuelPriceTable {
  id: string;
  fuel_type: "petrol" | "diesel" | "ev_kwh";
  price: string;
  observed_at: string;
  source: string;
}

export interface ListTable {
  id: string;
  user_id: string | null;
  name: string;
  kind: "recipe" | "cleaning" | "custom";
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListTemplateTable {
  id: string;
  name: string;
  kind: "recipe" | "cleaning" | "custom";
  position: number;
  created_at: string;
}

export interface ListTemplateItemTable {
  id: string;
  template_id: string;
  product_id: string | null;
  free_text: string | null;
  quantity: number | null;
  unit: string | null;
  position: number;
  created_at: string;
}

export interface ListItemTable {
  id: string;
  list_id: string;
  product_id: string | null;
  free_text: string | null;
  quantity: number | null;
  unit: string | null;
  position: number;
  created_at: string;
}

export interface CrowdReportTable {
  id: string;
  user_id: string;
  store_id: string;
  product_id: string | null;
  product_name: string | null;
  price: string;
  currency: string;
  photo_path: string | null;
  reported_at: string;
  created_at: string;
  points_awarded: string;
  last_awarded_tier: "single" | "community" | null;
  status: "active" | "hidden";
}

export interface CrowdReportFlagTable {
  id: string;
  crowd_report_id: string;
  flagger_user_id: string;
  reason: string;
  created_at: string;
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
  list_template: ListTemplateTable;
  list_template_item: ListTemplateItemTable;
  user_store_distance: UserStoreDistanceTable;
  fuel_price: FuelPriceTable;
  crowd_report: CrowdReportTable;
  crowd_report_flag: CrowdReportFlagTable;
  passkey_credential: PasskeyCredentialTable;
  webauthn_challenge: WebauthnChallengeTable;
}
