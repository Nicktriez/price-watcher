export interface AddressInput {
  street?: string | null;
  city?: string | null;
  zip?: string | null;
}

export interface GeoCoord {
  lat: number;
  lon: number;
}

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "price-watcher-dev (local testing)";

export function nominatimQueryUrl(address: AddressInput): string {
  const params = new URLSearchParams({ format: "json", limit: "1", countrycodes: "dk" });
  if (address.street) params.set("street", address.street);
  if (address.city) params.set("city", address.city);
  if (address.zip) params.set("postalcode", address.zip);
  return `${NOMINATIM_SEARCH}?${params.toString()}`;
}

export function parseGeocodeResponse(body: string): GeoCoord | null {
  let results: unknown;
  try {
    results = JSON.parse(body);
  } catch {
    return null;
  }
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0] as { lat?: string; lon?: string };
  const lat = parseFloat(first.lat ?? "");
  const lon = parseFloat(first.lon ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

export async function geocodeAddress(address: AddressInput): Promise<GeoCoord | null> {
  if (!address.street && !address.city && !address.zip) return null;
  const res = await fetch(nominatimQueryUrl(address), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) return null;
  return parseGeocodeResponse(await res.text());
}
