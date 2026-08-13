export type FuelType = "petrol" | "diesel" | "ev";
export type EvCharging = "home" | "public";

export interface CarProfile {
  fuelType: FuelType;
  efficiency: number;
  evCharging: EvCharging | null;
}

export interface FuelPrices {
  petrol: number;
  diesel: number;
  evHome: number;
  evPublic: number;
}

export interface VerdictStore {
  storeId: string;
  storeName: string;
  basketTotal: number;
  fuelCost: number | null;
  totalWithFuel: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeFuelCost(
  distanceKm: number,
  car: CarProfile,
  prices: FuelPrices,
): number | null {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || car.efficiency <= 0) return null;

  let cost: number;
  if (car.fuelType === "petrol") {
    cost = (distanceKm / car.efficiency) * prices.petrol;
  } else if (car.fuelType === "diesel") {
    cost = (distanceKm / car.efficiency) * prices.diesel;
  } else {
    const rate = car.evCharging === "public" ? prices.evPublic : prices.evHome;
    cost = distanceKm * car.efficiency * rate;
  }
  return round2(cost);
}

export function buildVerdictText(ranked: VerdictStore[]): string | null {
  const withFuel = ranked.filter((s) => s.totalWithFuel != null);
  if (withFuel.length < 2) return null;

  const netWinner = withFuel.reduce((a, b) => (b.totalWithFuel! < a.totalWithFuel! ? b : a));
  const basketWinner = ranked.reduce((a, b) => (b.basketTotal < a.basketTotal ? b : a));

  if (netWinner.storeId === basketWinner.storeId) {
    return `Den billigste butik er også den bedste, når brændstof tæller med: ${netWinner.storeName} — ${netWinner.totalWithFuel} kr i alt (varer + brændstof).`;
  }

  const basketDiff = round2(netWinner.basketTotal - basketWinner.basketTotal);
  const fuelDiff = round2((basketWinner.fuelCost ?? 0) - (netWinner.fuelCost ?? 0));
  const netDiff = round2((basketWinner.totalWithFuel ?? 0) - (netWinner.totalWithFuel ?? 0));

  if (basketDiff > 0 && fuelDiff > 0) {
    return `${netWinner.storeName} er ${basketDiff} kr dyrere i varer, men ${fuelDiff} kr billigere i brændstof — netto ${netDiff} kr bedre end ${basketWinner.storeName}.`;
  }
  return `Den bedste handel inkl. brændstof er hos ${netWinner.storeName} — ${netWinner.totalWithFuel} kr i alt.`;
}
