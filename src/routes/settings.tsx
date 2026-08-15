import { createAsync, Navigate, useSearchParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import type { FuelType } from "~/lib/car-profile";
import { getCurrentUser } from "~/server/auth";
import { clearCarProfile, getCarProfile, saveCarProfile } from "~/server/car-profile";
import { clearHomeAddress, getHomeInfo, saveHomeAddress } from "~/server/distance";

function fuelTypeLabel(fuelType: FuelType): string {
  return fuelType === "petrol" ? "benzin" : fuelType === "diesel" ? "diesel" : "elbil";
}

export default function Settings() {
  const [params] = useSearchParams();
  const user = createAsync(() => getCurrentUser());
  const home = createAsync(() => getHomeInfo());
  const car = createAsync(() => getCarProfile());
  const [carFuel, setCarFuel] = createSignal<FuelType>("petrol");
  const [carEv, setCarEv] = createSignal<string>("home");
  const saved = () => typeof params.ok === "string";
  const cleared = () => typeof params.cleared === "string";

  const handleSave = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const raw = data.get("address");
    const address = typeof raw === "string" ? raw : "";
    const result = await saveHomeAddress(address);
    if (result.ok) window.location.href = "/settings?ok=1";
  };

  const handleClear = async () => {
    if (!window.confirm("Fjern din hjemmeadresse? Den bruges kun til at beregne køreafstande."))
      return;
    await clearHomeAddress();
    window.location.href = "/settings?cleared=1";
  };

  const handleCarSave = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const fRaw = data.get("fuelType");
    const fuel = typeof fRaw === "string" ? fRaw : "petrol";
    const effRaw = data.get("efficiency");
    const evRaw = data.get("evCharging");
    const result = await saveCarProfile({
      fuelType: fuel,
      efficiency: typeof effRaw === "string" ? effRaw : null,
      evCharging: typeof evRaw === "string" ? evRaw : null,
    });
    if (result.ok) window.location.href = "/settings?car=1";
  };

  const handleCarClear = async () => {
    if (!window.confirm("Fjern din bilprofil? Så bruges standardindstillingen igen.")) return;
    await clearCarProfile();
    window.location.href = "/settings?carcleared=1";
  };

  return (
    <Show
      when={user() !== undefined}
      fallback={<main class="mx-auto max-w-md p-4 text-gray-900" />}
    >
      <Show
        when={user()}
        fallback={
          <main class="mx-auto max-w-md p-4 text-gray-900">
            <Navigate href="/signin" />
          </main>
        }
      >
        <main class="mx-auto max-w-md p-4 text-gray-900">
          <h1 class="mb-4 text-2xl font-semibold">Indstillinger</h1>

          <Show when={saved()}>
            <p class="mb-4 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
              Adresse gemt.
            </p>
          </Show>
          <Show when={cleared()}>
            <p class="mb-4 rounded border border-gray-200 bg-gray-50 p-2 text-sm text-gray-600">
              Adresse fjernet.
            </p>
          </Show>
          <Show when={typeof params.car === "string"}>
            <p class="mb-4 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
              Bilprofil gemt.
            </p>
          </Show>
          <Show when={typeof params.carcleared === "string"}>
            <p class="mb-4 rounded border border-gray-200 bg-gray-50 p-2 text-sm text-gray-600">
              Bilprofil fjernet.
            </p>
          </Show>

          <section class="rounded border border-gray-200 p-4">
            <h2 class="mb-2 text-lg font-semibold">Hjemmeadresse</h2>
            <p class="mb-3 text-sm text-gray-600">
              Bruges <span class="font-medium">kun</span> til at beregne køreafstand til butikkerne
              — den vises aldrig offentligt og deles aldrig.
            </p>
            <Show when={home()?.address}>
              <p class="mb-3 text-sm text-gray-800">
                Gemt adresse: <span class="font-medium">{home()?.address}</span>
              </p>
            </Show>
            <Show when={home() && !home()?.hasCoords && home()?.address}>
              <p class="mb-3 text-sm text-amber-700">
                Adressen kunne ikke geokodes — køreafstande er derfor ikke tilgængelige. Prøv at
                gemme igen med en mere præcis adresse.
              </p>
            </Show>
            <form onSubmit={handleSave} class="space-y-2">
              <input
                type="text"
                name="address"
                placeholder="Fx Anderupvej 132, 5270 Odense N"
                class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
                Gem adresse
              </button>
            </form>
            <Show when={home()?.address}>
              <button
                type="button"
                onClick={handleClear}
                class="mt-2 text-xs text-red-600 hover:underline"
              >
                Fjern adresse
              </button>
            </Show>
          </section>

          <section class="mt-6 rounded border border-gray-200 p-4">
            <h2 class="mb-2 text-lg font-semibold">Bilprofil</h2>
            <p class="mb-3 text-sm text-gray-600">
              Bruges <span class="font-medium">kun</span> til at beregne køreomkostninger — den er
              privat og vises aldrig offentligt.
            </p>
            <Show when={car()}>
              <p class="mb-3 text-sm text-gray-800">
                {car()!.set
                  ? `Gemte indstillinger: ${fuelTypeLabel(car()!.profile.fuelType)}, ${
                      car()!.profile.efficiency
                    } ${car()!.profile.fuelType === "ev" ? "kWh/km" : "km/l"}${
                      car()!.profile.evCharging
                        ? `, ${car()!.profile.evCharging === "home" ? "hjemme" : "offentlig"}`
                        : ""
                    }`
                  : `Standardindstilling (ikke sat): ${fuelTypeLabel(car()!.profile.fuelType)}, ${car()!.profile.efficiency} km/l — sæt din bil for at få korrekte beregninger.`}
              </p>
            </Show>
            <form onSubmit={handleCarSave} class="space-y-2">
              <div>
                <label for="fuelType" class="mb-1 block text-sm text-gray-600">
                  Brændstoftype
                </label>
                <select
                  name="fuelType"
                  id="fuelType"
                  value={carFuel()}
                  onChange={(e) => setCarFuel(e.currentTarget.value as FuelType)}
                  class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="petrol">Benzin</option>
                  <option value="diesel">Diesel</option>
                  <option value="ev">Elbil</option>
                </select>
              </div>
              <div>
                <label for="efficiency" class="mb-1 block text-sm text-gray-600">
                  {carFuel() === "ev" ? "Forbrug (kWh/km)" : "Forbrug (km/l)"}
                </label>
                <input
                  type="number"
                  name="efficiency"
                  id="efficiency"
                  step="any"
                  min="0"
                  placeholder={carFuel() === "ev" ? "Fx 0.18" : "Fx 15"}
                  class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <Show when={carFuel() === "ev"}>
                <div>
                  <label for="evCharging" class="mb-1 block text-sm text-gray-600">
                    Opladning
                  </label>
                  <select
                    name="evCharging"
                    id="evCharging"
                    value={carEv()}
                    onChange={(e) => setCarEv(e.currentTarget.value)}
                    class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option value="home">Hjemme</option>
                    <option value="public">Offentlig hurtigladning</option>
                  </select>
                </div>
              </Show>
              <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
                Gem bilprofil
              </button>
            </form>
            <Show when={car()?.set}>
              <button
                type="button"
                onClick={handleCarClear}
                class="mt-2 text-xs text-red-600 hover:underline"
              >
                Fjern bilprofil
              </button>
            </Show>
          </section>
        </main>
      </Show>
    </Show>
  );
}
