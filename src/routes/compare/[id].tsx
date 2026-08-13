import { createAsync, Navigate, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import { getList } from "~/server/lists";
import { getStoreVerdicts } from "~/server/verdict";

function Sparkline({ values }: { values: number[] }) {
  const width = 90;
  const height = 24;
  const pad = 3;
  if (values.length < 2) {
    return <span class="text-xs text-gray-400">for lidt data</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      class="inline-block text-sky-700"
    >
      <polyline points={points} fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
  );
}

export default function StoreComparison() {
  const params = useParams();
  const user = createAsync(() => getCurrentUser());

  const data = createAsync(async () => {
    if (!user() || !params.id) return null;
    const list = await getList(params.id);
    if (!list) return null;
    const verdict = await getStoreVerdicts(params.id, user()!.id);
    return { list, verdict };
  });

  return (
    <Show
      when={user() !== undefined}
      fallback={<main class="mx-auto max-w-3xl p-4 text-gray-900" />}
    >
      <Show
        when={user()}
        fallback={
          <main class="mx-auto max-w-3xl p-4 text-gray-900">
            <Navigate href="/signin" />
          </main>
        }
      >
        <main class="mx-auto max-w-3xl p-4 text-gray-900">
          <Show when={data()} fallback={<p>List not found.</p>}>
            {(d) => {
              const ranked = d().verdict.ranked;
              const netWinner = d().verdict.netWinner;
              const verdictText = d().verdict.verdictText;
              const basketWinner = ranked[0];
              const mostExpensive = ranked.length
                ? Math.max(...ranked.map((p) => p.basketTotal))
                : 0;
              const anyFuel = ranked.some((s) => s.hasFuelFigure);
              const noPriceEverywhere = d().verdict.unpricedItems;

              return (
                <>
                  <p class="mb-2 text-sm">
                    <a href={`/lists/${d().list.id}`} class="text-sky-700 hover:underline">
                      ← Back to list
                    </a>
                  </p>
                  <h1 class="mb-1 text-2xl font-semibold">Where to shop: {d().list.name}</h1>
                  <p class="mb-6 text-sm text-gray-600">
                    Basket prices + round-trip fuel for this week.
                  </p>

                  <Show
                    when={d().list.items.length}
                    fallback={
                      <p class="text-gray-500">
                        This list is empty.{" "}
                        <a href="/lists" class="text-sky-700 hover:underline">
                          Add items or use a template
                        </a>
                        .
                      </p>
                    }
                  >
                    <Show
                      when={basketWinner}
                      fallback={
                        <p class="text-gray-500">
                          No stores have prices for these items yet. Prices come from current offers
                          and uploaded receipts.
                        </p>
                      }
                    >
                      <div class="mb-4 rounded border border-sky-200 bg-sky-50 p-4">
                        <Show
                          when={verdictText}
                          fallback={
                            <p class="text-lg font-semibold text-gray-900">
                              Your basket is cheapest at {basketWinner.storeName} —{" "}
                              {fmtPrice(String(basketWinner.basketTotal))} kr
                              {mostExpensive > basketWinner.basketTotal
                                ? `, ${fmtPrice(String(mostExpensive - basketWinner.basketTotal))} kr less than the most expensive option`
                                : ""}
                              .
                            </p>
                          }
                        >
                          <p class="text-lg font-semibold text-gray-900">{verdictText}</p>
                        </Show>
                        {d().verdict.carDefault && anyFuel && (
                          <p class="mt-1 text-sm text-gray-600">
                            Brændstof beregnet med standardbilprofil (benzin, 15 km/l).{" "}
                            <a href="/settings" class="text-sky-700 hover:underline">
                              Sæt din bil under Indstillinger
                            </a>{" "}
                            for præcise tal.
                          </p>
                        )}
                      </div>

                      <table class="mb-4 w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-300 text-left text-xs uppercase text-gray-500">
                            <th class="py-2 pr-2">Store</th>
                            <th class="py-2 pr-2 text-right">Basket</th>
                            <th class="py-2 pr-2 text-right">Fuel (round trip)</th>
                            <th class="py-2 pr-2 text-right">Total w/ fuel</th>
                            <th class="py-2 pr-2 text-right">vs. most expensive</th>
                            <th class="py-2 text-right">Offers / user-reported</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={ranked}>
                            {(store) => {
                              const savings = mostExpensive - store.basketTotal;
                              const baselineHeavy =
                                store.baselineTotal > 0 &&
                                store.baselineTotal / store.basketTotal >= 0.5;
                              const isNetWinner =
                                netWinner != null && store.storeId === netWinner.storeId;
                              return (
                                <tr class="border-b border-gray-100">
                                  <td class="py-2 pr-2">
                                    <span class="font-medium">{store.storeName}</span>
                                    {isNetWinner && (
                                      <span class="ml-2 rounded bg-sky-600 px-1.5 py-0.5 text-xs text-white">
                                        net winner
                                      </span>
                                    )}
                                    {!isNetWinner && store.storeId === basketWinner.storeId && (
                                      <span class="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">
                                        cheapest basket
                                      </span>
                                    )}
                                    {baselineHeavy && (
                                      <span class="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                                        partly from user-reported prices
                                      </span>
                                    )}
                                  </td>
                                  <td class="py-2 pr-2 text-right font-semibold">
                                    {fmtPrice(String(store.basketTotal))} kr
                                  </td>
                                  <td class="py-2 pr-2 text-right text-gray-600">
                                    <Show when={store.hasFuelFigure} fallback={<span>—</span>}>
                                      <span>
                                        {store.fuelCost != null
                                          ? `${fmtPrice(String(store.fuelCost))} kr`
                                          : "—"}
                                        {store.roundTripKm != null && (
                                          <span class="block text-xs text-gray-400">
                                            {fmtPrice(String(store.roundTripKm))} km
                                          </span>
                                        )}
                                      </span>
                                    </Show>
                                  </td>
                                  <td class="py-2 pr-2 text-right">
                                    <Show
                                      when={store.hasFuelFigure}
                                      fallback={
                                        <span class="text-gray-400">
                                          {fmtPrice(String(store.basketTotal))} kr
                                          <span class="block text-xs">varer</span>
                                        </span>
                                      }
                                    >
                                      <span class="font-semibold">
                                        {store.totalWithFuel != null
                                          ? `${fmtPrice(String(store.totalWithFuel))} kr`
                                          : "—"}
                                      </span>
                                    </Show>
                                  </td>
                                  <td class="py-2 pr-2 text-right text-gray-600">
                                    {savings > 0 ? `−${fmtPrice(String(savings))} kr` : "—"}
                                  </td>
                                  <td class="py-2 text-right text-xs">
                                    <span class="text-sky-700">
                                      {fmtPrice(String(store.offerTotal))} kr
                                    </span>
                                    <span class="text-gray-400"> + </span>
                                    <span class="text-amber-700">
                                      {fmtPrice(String(store.baselineTotal))} kr
                                    </span>
                                  </td>
                                </tr>
                              );
                            }}
                          </For>
                        </tbody>
                      </table>

                      <Show when={noPriceEverywhere > 0}>
                        <p class="mb-2 text-sm text-gray-500">
                          {noPriceEverywhere} item{noPriceEverywhere === 1 ? "" : "s"} in your
                          basket couldn't be priced anywhere (no current offer, no receipt
                          baseline).
                        </p>
                      </Show>
                      <Show when={!anyFuel && ranked.some((s) => !s.hasFuelFigure)}>
                        <p class="mb-2 text-sm text-gray-500">
                          <a href="/settings" class="text-sky-700 hover:underline">
                            Set your home address
                          </a>{" "}
                          and car profile to see fuel-adjusted totals.
                        </p>
                      </Show>
                      <Show when={anyFuel && ranked.some((s) => !s.hasFuelFigure)}>
                        <p class="mb-2 text-sm text-gray-500">
                          Stores without a fuel figure (no known address/distance or fuel price) are
                          shown after stores with full data — their total is basket-only.
                        </p>
                      </Show>
                      <p class="text-xs text-gray-500">
                        Blue = current offers. Amber = user-reported prices from receipts — not
                        official offers. Fuel cost uses the national average price and your car
                        profile; driving distances are round-trip to the nearest store.
                      </p>

                      <section class="mt-4 rounded border border-gray-200 p-3">
                        <h2 class="mb-2 text-sm font-semibold">Fuel prices (national average)</h2>
                        <ul class="space-y-2 text-sm">
                          <Show
                            when={
                              d().verdict.fuelPrices.petrol != null ||
                              d().verdict.fuelPrices.diesel != null ||
                              d().verdict.fuelPrices.evKwh != null
                            }
                          >
                            <li class="flex items-center justify-between gap-4">
                              <span class="w-40">
                                Benzin:{" "}
                                {d().verdict.fuelPrices.petrol != null
                                  ? `${fmtPrice(String(d().verdict.fuelPrices.petrol))} kr/l`
                                  : "—"}
                              </span>
                              <Sparkline
                                values={d()
                                  .verdict.fuelHistory.filter((h) => h.fuelType === "petrol")
                                  .map((h) => h.price)}
                              />
                            </li>
                            <li class="flex items-center justify-between gap-4">
                              <span class="w-40">
                                Diesel:{" "}
                                {d().verdict.fuelPrices.diesel != null
                                  ? `${fmtPrice(String(d().verdict.fuelPrices.diesel))} kr/l`
                                  : "—"}
                              </span>
                              <Sparkline
                                values={d()
                                  .verdict.fuelHistory.filter((h) => h.fuelType === "diesel")
                                  .map((h) => h.price)}
                              />
                            </li>
                            <li class="flex items-center justify-between gap-4">
                              <span class="w-40">
                                El (kWh):{" "}
                                {d().verdict.fuelPrices.evKwh != null
                                  ? `${fmtPrice(String(d().verdict.fuelPrices.evKwh))} kr/kWh`
                                  : "—"}
                              </span>
                              <Sparkline
                                values={d()
                                  .verdict.fuelHistory.filter((h) => h.fuelType === "ev_kwh")
                                  .map((h) => h.price)}
                              />
                            </li>
                          </Show>
                          <Show
                            when={
                              d().verdict.fuelPrices.petrol == null &&
                              d().verdict.fuelPrices.diesel == null &&
                              d().verdict.fuelPrices.evKwh == null
                            }
                          >
                            <li class="text-gray-500">
                              Ingen brændstofpriser endnu — de hentes dagligt.
                            </li>
                          </Show>
                        </ul>
                      </section>
                    </Show>
                  </Show>
                </>
              );
            }}
          </Show>
        </main>
      </Show>
    </Show>
  );
}
