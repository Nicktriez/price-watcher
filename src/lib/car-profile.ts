export type FuelType = "petrol" | "diesel" | "ev";
export type EvCharging = "home" | "public";

export interface CarProfile {
  fuelType: FuelType;
  efficiency: number;
  evCharging: EvCharging | null;
}

export interface CarProfileInput {
  fuelType?: string | null;
  efficiency?: string | number | null;
  evCharging?: string | null;
}

export const DEFAULT_CAR_PROFILE: CarProfile = {
  fuelType: "petrol",
  efficiency: 15, // km/l — a reasonable Danish default
  evCharging: null,
};

export type CarProfileError =
  | "invalid-fuel-type"
  | "invalid-efficiency"
  | "missing-efficiency"
  | "missing-ev-charging"
  | "invalid-ev-charging";

export function validateCarProfile(input: CarProfileInput): CarProfile | CarProfileError {
  if (input.fuelType !== "petrol" && input.fuelType !== "diesel" && input.fuelType !== "ev") {
    return "invalid-fuel-type";
  }
  const fuelType = input.fuelType;

  const efficiency =
    typeof input.efficiency === "string" && input.efficiency.trim() !== ""
      ? Number(input.efficiency)
      : typeof input.efficiency === "number"
        ? input.efficiency
        : NaN;
  if (!Number.isFinite(efficiency) || efficiency <= 0) return "invalid-efficiency";

  if (fuelType === "ev") {
    if (input.evCharging == null || input.evCharging.trim() === "") return "missing-ev-charging";
    if (input.evCharging !== "home" && input.evCharging !== "public") return "invalid-ev-charging";
    return { fuelType, efficiency, evCharging: input.evCharging };
  }
  return { fuelType, efficiency, evCharging: null };
}
