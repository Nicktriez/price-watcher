import { createAsync, Navigate, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import { getStoreDistances } from "~/server/distance";
import { getBasketCosts, getList } from "~/server/lists";

export default function StoreComparison() {
  const params = useParams();
  const user = createAsync(() => getCurrentUser());
  const distances = createAsync(async () => (user() ? getStoreDistances(user()!.id) : []));

  const data = createAsync(async () => {
    if (!user() || !params.id) return null;
    const list = await getList(params.id);
    if (!list) return null;
    const costs = await getBasketCosts(params.id, user()!.id);
    return { list, costs };
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
              const priced = d()
                .costs.filter((c) => c.basketTotal > 0)
                .sort((a, b) => a.basketTotal - b.basketTotal);
              const mostExpensive = priced.length
                ? Math.max(...priced.map((p) => p.basketTotal))
                : 0;
              const winner = priced[0];
              const noPriceEverywhere = d().list.items.filter(
                (item) =>
                  !d().costs.some((c) =>
                    c.lines.some((l) => l.productId === item.productId && l.price != null),
                  ),
              ).length;

              return (
                <>
                  <p class="mb-2 text-sm">
                    <a href={`/lists/${d().list.id}`} class="text-sky-700 hover:underline">
                      ← Back to list
                    </a>
                  </p>
                  <h1 class="mb-1 text-2xl font-semibold">Where to shop: {d().list.name}</h1>
                  <p class="mb-6 text-sm text-gray-600">
                    Basket prices for this week — offers + user-reported prices.
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
                      when={winner}
                      fallback={
                        <p class="text-gray-500">
                          No stores have prices for these items yet. Prices come from current offers
                          and uploaded receipts.
                        </p>
                      }
                    >
                      <div class="mb-4 rounded border border-sky-200 bg-sky-50 p-4">
                        <p class="text-lg font-semibold text-gray-900">
                          Your basket is cheapest at {winner.storeName} —{" "}
                          {fmtPrice(String(winner.basketTotal))} kr
                          {mostExpensive > winner.basketTotal
                            ? `, ${fmtPrice(String(mostExpensive - winner.basketTotal))} kr less than the most expensive option`
                            : ""}
                          .
                        </p>
                      </div>

                      <table class="mb-4 w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-300 text-left text-xs uppercase text-gray-500">
                            <th class="py-2 pr-2">Store</th>
                            <th class="py-2 pr-2 text-right">Total</th>
                            <th class="py-2 pr-2 text-right">Driving (round trip)</th>
                            <th class="py-2 pr-2 text-right">vs. most expensive</th>
                            <th class="py-2 text-right">Offers / user-reported</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={priced}>
                            {(store) => {
                              const savings = mostExpensive - store.basketTotal;
                              const baselineHeavy =
                                store.baselineTotal > 0 &&
                                store.baselineTotal / store.basketTotal >= 0.5;
                              const distance = distances()?.find(
                                (d) => d.chainId === store.storeId,
                              );
                              return (
                                <tr class="border-b border-gray-100">
                                  <td class="py-2 pr-2">
                                    <span class="font-medium">{store.storeName}</span>
                                    {store.storeId === winner.storeId && (
                                      <span class="ml-2 rounded bg-sky-600 px-1.5 py-0.5 text-xs text-white">
                                        cheapest
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
                                    {distance?.roundTripKm != null
                                      ? `${fmtPrice(String(distance.roundTripKm))} km`
                                      : "—"}
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
                      <Show when={distances()?.length === 0}>
                        <p class="mb-2 text-sm text-gray-500">
                          <a href="/settings" class="text-sky-700 hover:underline">
                            Set your home address
                          </a>{" "}
                          to see driving distances (round trip) per store.
                        </p>
                      </Show>
                      <p class="text-xs text-gray-500">
                        Blue = current offers. Amber = user-reported prices from receipts — not
                        official offers. Driving distances are round-trip to the nearest store.
                        Fuel-adjusted totals come later.
                      </p>
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
