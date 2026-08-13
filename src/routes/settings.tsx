import { createAsync, Navigate, useNavigate, useSearchParams } from "@solidjs/router";
import { Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import { clearHomeAddress, getHomeInfo, saveHomeAddress } from "~/server/distance";

export default function Settings() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = createAsync(() => getCurrentUser());
  const home = createAsync(() => getHomeInfo());
  const saved = () => typeof params.ok === "string";
  const cleared = () => typeof params.cleared === "string";

  const handleSave = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const raw = data.get("address");
    const address = typeof raw === "string" ? raw : "";
    const result = await saveHomeAddress(address);
    if (result.ok) navigate("/settings?ok=1");
  };

  const handleClear = async () => {
    if (!window.confirm("Fjern din hjemmeadresse? Den bruges kun til at beregne køreafstande."))
      return;
    await clearHomeAddress();
    navigate("/settings?cleared=1");
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
        </main>
      </Show>
    </Show>
  );
}
