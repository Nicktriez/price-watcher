import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtDate, fmtPrice } from "~/lib/format";
import { getPriceHistory, getProductById } from "~/server/queries";

function Sparkline({ points }: { points: { observed_at: string; price: string }[] }) {
  const width = 240;
  const height = 40;
  const pad = 4;
  const prices = points.map((p) => parseFloat(p.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((parseFloat(p.price) - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      class="block text-sky-700"
    >
      <polyline points={coords.join(" ")} fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
  );
}

export default function ProductPage() {
  const params = useParams();
  const product = createAsync(async () => (params.id ? getProductById(params.id) : null));
  const history = createAsync(async () => (params.id ? getPriceHistory(params.id, 30) : null));

  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <p class="mb-4">
        <A href="/" class="text-sky-700 hover:underline">
          Back to offers
        </A>
      </p>

      <Show when={product()} fallback={<p>Product not found.</p>}>
        {(p) => (
          <>
            <h1 class="mb-1 text-2xl font-semibold">{p().name}</h1>
            <Show when={p().brand}>
              <p class="text-sm text-gray-600">{p().brand}</p>
            </Show>

            <h2 class="mb-2 mt-6 text-lg font-semibold">Current offers</h2>
            <Show
              when={p().offers.length}
              fallback={<p class="text-gray-500">No current offers for this product.</p>}
            >
              <ul class="space-y-3">
                <For each={p().offers}>
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
                        <p class="font-semibold">
                          {fmtPrice(o.price)} {o.currency}
                        </p>
                        <Show when={o.pre_price}>
                          <p class="text-sm text-gray-500 line-through">
                            {fmtPrice(o.pre_price!)} {o.currency}
                          </p>
                        </Show>
                        <p class="text-sm text-gray-600">{o.chain_name ?? "Unknown chain"}</p>
                        <p class="text-xs text-gray-500">
                          Valid {fmtDate(o.valid_from)} – {fmtDate(o.valid_to)}
                        </p>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <h2 class="mb-2 mt-6 text-lg font-semibold">Price history (30 days)</h2>
            <Show
              when={history()?.length}
              fallback={<p class="text-gray-500">No price history yet.</p>}
            >
              <div class="rounded border border-gray-200 p-3">
                <Show when={(history()?.length ?? 0) >= 2}>
                  <Sparkline points={history()!} />
                </Show>
                <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  <For each={history()}>
                    {(h) => (
                      <li>
                        {fmtDate(h.observed_at)}: {fmtPrice(h.price)} kr
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}
