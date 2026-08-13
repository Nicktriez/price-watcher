import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_CAR_PROFILE, validateCarProfile } from "./car-profile.ts";

describe("validateCarProfile", () => {
  it("accepts a valid petrol profile", () => {
    expect(validateCarProfile({ fuelType: "petrol", efficiency: 15 })).toEqual({
      fuelType: "petrol",
      efficiency: 15,
      evCharging: null,
    });
  });

  it("accepts a valid EV profile with a charging location", () => {
    expect(validateCarProfile({ fuelType: "ev", efficiency: 0.18, evCharging: "home" })).toEqual({
      fuelType: "ev",
      efficiency: 0.18,
      evCharging: "home",
    });
  });

  it("rejects bad fuel types, efficiency, and missing EV charging", () => {
    expect(validateCarProfile({ fuelType: "hydrogen", efficiency: 15 })).toBe("invalid-fuel-type");
    expect(validateCarProfile({ fuelType: "petrol", efficiency: -3 })).toBe("invalid-efficiency");
    expect(validateCarProfile({ fuelType: "petrol", efficiency: "abc" })).toBe(
      "invalid-efficiency",
    );
    expect(validateCarProfile({ fuelType: "ev", efficiency: 0.18 })).toBe("missing-ev-charging");
    expect(validateCarProfile({ fuelType: "ev", efficiency: 0.18, evCharging: "work" })).toBe(
      "invalid-ev-charging",
    );
  });

  it("has a labeled Danish default", () => {
    expect(DEFAULT_CAR_PROFILE).toEqual({ fuelType: "petrol", efficiency: 15, evCharging: null });
  });
});
