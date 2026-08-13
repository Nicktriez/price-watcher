"use server";

import { db } from "~/db/client";
import {
  DEFAULT_CAR_PROFILE,
  validateCarProfile,
  type CarProfile,
  type CarProfileInput,
} from "~/lib/car-profile";
import { getCurrentUser } from "./auth.ts";

export interface CarProfileView {
  set: boolean;
  profile: CarProfile;
}

export async function getCarProfile(): Promise<CarProfileView> {
  const user = await getCurrentUser();
  if (!user) throw new Error("sign-in-required");
  const row = await db
    .selectFrom("user")
    .select(["fuel_type", "efficiency", "ev_charging"])
    .where("id", "=", user.id)
    .executeTakeFirst();

  const hasProfile = row?.fuel_type != null && row?.efficiency != null;
  if (!hasProfile) {
    return { set: false, profile: DEFAULT_CAR_PROFILE };
  }
  const profile = validateCarProfile({
    fuelType: row.fuel_type,
    efficiency: row.efficiency,
    evCharging: row.ev_charging,
  });
  return { set: true, profile: typeof profile === "string" ? DEFAULT_CAR_PROFILE : profile };
}

export async function saveCarProfile(input: CarProfileInput): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("sign-in-required");
  const profile = validateCarProfile(input);
  if (typeof profile === "string") return { ok: false };

  await db
    .updateTable("user")
    .set({
      fuel_type: profile.fuelType,
      efficiency: profile.efficiency,
      ev_charging: profile.evCharging,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", user.id)
    .execute();
  return { ok: true };
}

export async function clearCarProfile(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("sign-in-required");
  await db
    .updateTable("user")
    .set({
      fuel_type: null,
      efficiency: null,
      ev_charging: null,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", user.id)
    .execute();
}
