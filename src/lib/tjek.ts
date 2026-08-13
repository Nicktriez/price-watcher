const DEFAULT_BASE_URL = "https://squid-api.tjek.com";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 price-watcher-spike";
const PAGE_LIMIT = 100;
const PAGE_DELAY_MS = 150;

if (!process.env.TJEK_BASE_URL) {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file; TJEK_BASE_URL comes from the environment or the default
  }
}

const BASE_URL = process.env.TJEK_BASE_URL ?? DEFAULT_BASE_URL;

export interface TjekOffer {
  id: string;
  heading: string;
  description: string | null;
  catalog_page: number | null;
  pricing: { price: number; pre_price: number | null; currency: string };
  quantity: {
    unit: { symbol: string | null };
    size: { from: number | null; to: number | null };
    pieces: { from: number | null; to: number | null; max: number | null };
  };
  images: { thumb: string | null; view: string | null; zoom: string | null };
  run_from: string;
  run_till: string;
  publish: string;
  catalog_id: string;
  dealer_id: string;
}

export interface TjekCatalog {
  id: string;
  label: string;
  page_count: number | null;
  offer_count: number;
  run_from: string | null;
  run_till: string | null;
  publish: string | null;
}

export interface TjekDealer {
  id: string;
  name: string;
  website: string | null;
}

interface CatalogPdfUrl {
  pdf_url: string | null;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Tjek API GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllPages<T>(buildPath: (offset: number) => string): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchJson<T[]>(buildPath(offset));
    items.push(...page);
    if (page.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
    await delay(PAGE_DELAY_MS);
  }
  return items;
}

export async function getDealers(): Promise<TjekDealer[]> {
  return fetchAllPages<TjekDealer>((offset) => `/v2/dealers?limit=${PAGE_LIMIT}&offset=${offset}`);
}

export async function getCatalogs(dealerId: string): Promise<TjekCatalog[]> {
  return fetchJson<TjekCatalog[]>(`/v2/catalogs?dealer_id=${encodeURIComponent(dealerId)}`);
}

export async function getOffers(catalogId: string): Promise<TjekOffer[]> {
  return fetchAllPages<TjekOffer>((offset) => {
    const params = new URLSearchParams({
      query: "*",
      catalog_id: catalogId,
      offset: String(offset),
      limit: String(PAGE_LIMIT),
    });
    return `/v2/offers/search?${params.toString()}`;
  });
}

export async function getCatalogPdfUrl(catalogId: string): Promise<string | null> {
  const { pdf_url } = await fetchJson<CatalogPdfUrl>(
    `/v2/catalogs/${encodeURIComponent(catalogId)}/download`,
  );
  return pdf_url;
}

export interface TjekStore {
  id: string;
  street: string | null;
  city: string | null;
  zip_code: string | null;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  dealer_id: string;
}

export async function getStores(dealerId: string): Promise<TjekStore[]> {
  return fetchAllPages<TjekStore>((offset) => {
    const params = new URLSearchParams({
      dealer_id: dealerId,
      limit: String(PAGE_LIMIT),
      offset: String(offset),
    });
    return `/v2/stores?${params.toString()}`;
  });
}
