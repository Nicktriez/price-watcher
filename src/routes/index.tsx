import { A, createAsync, useSearchParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtPrice } from "~/lib/format";
import { getChains, getCurrentOffers } from "~/server/queries";

export default function Home() {
  const [params] = useSearchParams();
  const chains = createAsync(() => getChains());
  const offers = createAsync(() =>
    getCurrentOffers(typeof params.chain === "string" ? params.chain : null),
  );

  return (
    <main class="mx-auto max-w-4xl p-4 text-gray-900">
      <h1 class="mb-4 text-2xl font-semibold">Current offers</h1>

      <form method="get" class="mb-6 flex items-center gap-2">
        <label for="chain" class="text-sm text-gray-600">
          Chain
        </label>
        <select name="chain" id="chain" class="rounded border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">All chains</option>
          <For each={chains()}>
            {(c) => (
              <option value={c.id} selected={params.chain === c.id}>
                {c.name}
              </option>
            )}
          </For>
        </select>
        <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
          Filter
        </button>
      </form>

      <Show when={offers()?.length} fallback={<p class="text-gray-500">No current offers.</p>}>
        <ul class="grid gap-4 sm:grid-cols-2">
          <For each={offers()}>
            {(o) => (
              <li class="flex gap-3 rounded border border-gray-200 p-3">
                <Show
                  when={o.image_url}
                  fallback={<div class="h-20 w-20 shrink-0 rounded bg-gray-200" />}
                >
                  <img
                    src={o.image_url ?? undefined}
                    alt={o.heading}
                    class="h-20 w-20 shrink-0 rounded object-cover"
                  />
                </Show>
                <div>
                  <A
                    href={`/products/${o.product_id}`}
                    class="font-medium text-sky-700 hover:underline"
                  >
                    {o.product_name}
                  </A>
                  <p class="text-sm text-gray-600">{o.chain_name ?? "Unknown chain"}</p>
                  <p class="font-semibold">
                    {fmtPrice(o.price)} {o.currency}
                  </p>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </main>
  );
}
