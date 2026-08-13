export interface GeoPoint {
  lat: number;
  lon: number;
}

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export function routeUrl(origin: GeoPoint, destination: GeoPoint): string {
  return `${OSRM_BASE}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;
}

export function parseRouteDistance(body: string): number | null {
  let data: { routes?: { distance?: number }[] };
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  const distance = data.routes?.[0]?.distance;
  if (typeof distance !== "number" || !Number.isFinite(distance)) return null;
  return distance / 1000;
}

export function roundTrip(distanceKm: number): number {
  return distanceKm * 2;
}

export async function getRouteDistance(
  origin: GeoPoint,
  destination: GeoPoint,
): Promise<number | null> {
  const res = await fetch(routeUrl(origin, destination), {
    headers: { "User-Agent": "price-watcher-dev (local testing)" },
  });
  if (!res.ok) return null;
  return parseRouteDistance(await res.text());
}
