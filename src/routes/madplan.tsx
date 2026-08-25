import { useSearchParams } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";
import { fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import { generateMadplan } from "~/server/lists";
import Redirect from "~/components/Redirect";

export default function Madplan() {
  const user = createMemo(() => getCurrentUser());
  const [params] = useSearchParams();

  const budget = () => {
    const raw = typeof params.budget === "string" ? parseInt(params.budget, 10) : NaN;
    return Number.isFinite(raw) && raw > 0 ? raw : 500;
  };
  const days = () => {
    const raw = typeof params.days === "string" ? parseInt(params.days, 10) : NaN;
    return Number.isInteger(raw) && raw >= 1 ? Math.min(raw, 7) : 7;
  };

  const plan = createMemo(async () => (user() ? generateMadplan(budget(), days()) : null));

  const summary = () => {
    const p = plan();
    if (!p) return "";
    const lines = p.meals.map((m) => `${m.name} (${fmtPrice(String(m.cost))} kr)`).join(", ");
    return `Madplan for ${p.requestedDays} dage under ${budget()} kr:\n${lines}\nTotal: ${fmtPrice(String(p.planTotal))} kr${p.cheapestStore ? `\nBilligst at handle hele ugen: ${p.cheapestStore.storeName} (${fmtPrice(String(p.cheapestStore.total))} kr)` : ""}`;
  };

  const copy = async () => {
    await navigator.clipboard.writeText(summary());
    window.alert("Madplan kopieret!");
  };

  return (
    <Show
      when={user() !== undefined}
      fallback={<main class="mx-auto max-w-3xl p-4 text-gray-900" />}
    >
      <Show
        when={user()}
        fallback={
          <main class="mx-auto max-w-3xl p-4 text-gray-900">
            <Redirect href="/signin" />
          </main>
        }
      >
        <main class="mx-auto max-w-3xl p-4 text-gray-900">
          <h1 class="mb-1 text-2xl font-semibold">Ugens madplan</h1>
          <p class="mb-6 text-sm text-gray-600">
            Planlæg en uge med mad inden for et budget — og se hvor du skal handle.
          </p>

          <form method="get" class="mb-6 flex items-center gap-2">
            <label for="budget" class="text-sm text-gray-600">
              Budget (kr)
            </label>
            <input
              type="number"
              name="budget"
              id="budget"
              value={budget()}
              min="1"
              class="w-24 rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <label for="days" class="ml-2 text-sm text-gray-600">
              Dage
            </label>
            <input
              type="number"
              name="days"
              id="days"
              value={days()}
              min="1"
              max="7"
              class="w-20 rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
              Planlæg ugen
            </button>
          </form>

          <Show when={plan()} fallback={<p class="text-gray-500">Lader planen…</p>}>
            {(p) => (
              <div class="rounded border border-gray-200 p-4">
                <Show when={p().daysFilled > 0}>
                  <div class="mb-4 rounded border border-sky-200 bg-sky-50 p-3">
                    <p class="text-lg font-semibold">
                      {p().requestedDays}-dages madplan for {budget()} kr —{" "}
                      {fmtPrice(String(p().planTotal))} kr
                    </p>
                    <Show when={!p().fits}>
                      <p class="mt-1 text-sm text-amber-700">
                        Kun {p().daysFilled} af {p().requestedDays} dage passer i budgettet —
                        overvej at hæve budgettet for at dække hele ugen.
                      </p>
                    </Show>
                    <Show when={p().cheapestStore}>
                      <p class="mt-1 text-sm text-gray-700">
                        Billigst at handle hele ugen:{" "}
                        <span class="font-medium">
                          {p().cheapestStore!.storeName} (
                          {fmtPrice(String(p().cheapestStore!.total))} kr)
                        </span>
                      </p>
                    </Show>
                    <Show when={p().fits && !p().cheapestStore}>
                      <p class="mt-1 text-sm text-gray-500">
                        Vi kan endnu ikke pege på én butik til hele ugen — for få af ugens varer har
                        priser i tilbuddene. Hver rets pris er den billigste på tværs af butikker.
                      </p>
                    </Show>
                  </div>

                  <ul class="mb-4 space-y-1 text-sm">
                    <For each={p().meals}>
                      {(m) => (
                        <li class="flex justify-between border-b border-gray-100 py-1">
                          <span>{m.name}</span>
                          <span class="font-medium">{fmtPrice(String(m.cost))} kr</span>
                        </li>
                      )}
                    </For>
                  </ul>

                  <button
                    type="button"
                    onClick={copy}
                    class="rounded border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    Kopiér madplan
                  </button>
                </Show>
                <Show when={p().daysFilled === 0}>
                  <p class="text-gray-500">
                    Der var ingen retter, der kunne prissættes inden for {budget()} kr. Prøv at hæve
                    budgettet.
                  </p>
                </Show>
              </div>
            )}
          </Show>
        </main>
      </Show>
    </Show>
  );
}
