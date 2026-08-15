import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import { CrowdReportFlag } from "~/components/CrowdReportFlag";
import { fmtPrice } from "~/lib/format";
import { getReportedItems } from "~/server/queries";

function TierBadge({ tier }: { tier: "community" | "single" }) {
  return (
    <span
      class={`inline-flex items-center gap-1 text-xs font-medium ${
        tier === "community" ? "text-amber-700" : "text-gray-500"
      }`}
    >
      <span aria-hidden="true">●</span>
      {tier === "community" ? "Fællesskab" : "Brugerrapporteret"}
    </span>
  );
}

export default function ReportedItems() {
  const items = createAsync(() => getReportedItems());

  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <h1 class="mb-1 text-2xl font-semibold">Rapporterede varer</h1>
      <p class="mb-6 text-sm text-gray-600">
        Hyldepriser folk har rapporteret, som endnu ikke er knyttet til et katalogprodukt. 3+
        uafhængige rapporter inden for tolerancen bliver en fællesskabspris; en enkelt rapport
        forbliver "brugerrapporteret" og bliver forældet efter 24 timer.
      </p>

      <Show
        when={items() && items()!.length}
        fallback={
          <p class="text-gray-500">
            Ingen fritekstrapporter endnu.{" "}
            <a href="/report" class="text-sky-700 hover:underline">
              Rapportér en pris
            </a>{" "}
            hvis du så en på hylden.
          </p>
        }
      >
        <ul class="space-y-2">
          <For each={items()}>
            {(g) => (
              <li
                class={`flex items-baseline justify-between gap-3 rounded border p-3 text-sm ${
                  g.tier === "single" && g.stale
                    ? "border-gray-200 bg-gray-50 text-gray-500"
                    : g.tier === "community"
                      ? "border-amber-200 bg-amber-50"
                      : "border-gray-200"
                }`}
              >
                <div>
                  <p class="font-medium">{g.name}</p>
                  <p class="text-gray-600">{g.storeName}</p>
                  <TierBadge tier={g.tier} />
                  <Show when={g.tier === "community"}>
                    <span class="ml-2 text-xs text-gray-500">
                      {g.userCount} independent reports
                    </span>
                  </Show>
                </div>
                <div class="text-right">
                  <span class="font-semibold">{fmtPrice(String(g.price))} kr</span>
                  <span class="ml-2 text-xs text-gray-500">{g.age}</span>
                  <Show when={g.tier === "single" && g.stale}>
                    <span class="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                      stale
                    </span>
                  </Show>
                  <div class="mt-1">
                    <CrowdReportFlag reportId={g.reportId} />
                  </div>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <p class="mt-6 text-xs text-gray-500">
        Fritekstrapporter grupperes efter navn (trim + små bogstaver), indtil moderering knytter dem
        til et produkt. Disse priser er brugerrapporterede og aldrig en rabat.
      </p>
    </main>
  );
}
