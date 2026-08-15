import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { CrowdReportFlag } from "~/components/CrowdReportFlag";
import { fmtDate, fmtPrice } from "~/lib/format";
import { ageLabel } from "~/lib/trust-tier";
import { getPriceHistory, getProductById, getProductCrowdPrices } from "~/server/queries";

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

function TrustBadge({ tier }: { tier: "official" | "community" | "single" }) {
  return (
    <span
      class={`inline-flex items-center gap-1 text-xs font-medium ${
        tier === "official"
          ? "text-green-700"
          : tier === "community"
            ? "text-amber-700"
            : "text-gray-500"
      }`}
    >
      <span aria-hidden="true">{tier === "official" ? "✓" : "●"}</span>
      {tier === "official"
        ? "Officielt tilbud"
        : tier === "community"
          ? "Community"
          : "Brugerrapporteret"}
    </span>
  );
}

export default function ProductPage() {
  const params = useParams();
  const product = createAsync(async () => (params.id ? getProductById(params.id) : null));
  const history = createAsync(async () => (params.id ? getPriceHistory(params.id, 30) : null));
  const crowd = createAsync(async () => (params.id ? getProductCrowdPrices(params.id) : []));

  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <p class="mb-4">
        <A href="/offers" class="text-sky-700 hover:underline">
          ← Tilbage til tilbud
        </A>
      </p>

      <Show when={product()} fallback={<p>Produktet blev ikke fundet.</p>}>
        {(p) => (
          <>
            <h1 class="mb-1 text-2xl font-semibold">{p().name}</h1>
            <Show when={p().brand}>
              <p class="text-sm text-gray-600">{p().brand}</p>
            </Show>

            <h2 class="mb-2 mt-6 text-lg font-semibold">Aktuelle tilbud</h2>
            <Show
              when={p().offers.length}
              fallback={<p class="text-gray-500">Ingen aktuelle tilbud på dette produkt.</p>}
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
                        <TrustBadge tier="official" />
                        <p class="font-semibold">
                          {fmtPrice(o.price)} {o.currency}
                        </p>
                        <Show when={o.pre_price}>
                          <p class="text-sm text-gray-500 line-through">
                            {fmtPrice(o.pre_price!)} {o.currency}
                          </p>
                        </Show>
                        <p class="text-sm text-gray-600">{o.chain_name ?? "Ukendt kæde"}</p>
                        <p class="text-xs text-gray-500">
                          Valid {fmtDate(o.valid_from)} – {fmtDate(o.valid_to)}
                        </p>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <h2 class="mb-2 mt-6 text-lg font-semibold">Brugerrapporterede priser</h2>
            <p class="mb-2 text-xs text-gray-500">
              Priser fra kvitteringer uploadet af brugere — ikke officielle tilbud.
            </p>
            <Show
              when={p().baselines.length}
              fallback={<p class="text-gray-500">Ingen brugerrapporterede priser endnu.</p>}
            >
              <ul class="space-y-2 rounded border border-amber-200 bg-amber-50 p-3">
                <For each={p().baselines}>
                  {(b) => (
                    <li class="flex items-baseline justify-between gap-3 text-sm">
                      <div>
                        <TrustBadge tier={b.trustTier} />
                        <span class="ml-2 text-gray-700">{b.storeName ?? "Ukendt butik"}</span>
                      </div>
                      <div class="text-right">
                        <span class="font-semibold">{fmtPrice(b.price)} kr</span>
                        <span class="ml-2 text-xs text-gray-500">
                          {ageLabel(b.observedAt)} · {fmtDate(b.observedAt)}
                        </span>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <h2 class="mb-2 mt-6 text-lg font-semibold">Priser fra fællesskabet</h2>
            <p class="mb-2 text-xs text-gray-500">
              Priser folk så på hylden i dag. 3+ uafhængige rapporter inden for tolerancen bliver en
              Community-pris; en enkelt rapport forbliver "brugerrapporteret" og bliver forældet
              efter 24 timer.
            </p>
            <Show
              when={crowd() && crowd()!.length}
              fallback={<p class="text-gray-500">No crowd shelf prices for this product yet.</p>}
            >
              <ul class="space-y-2">
                <For each={crowd()}>
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
                        <TrustBadge tier={g.tier} />
                        <span class="ml-2 text-gray-700">{g.storeName}</span>
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

            <h2 class="mb-2 mt-6 text-lg font-semibold">Prishistorik (30 dage)</h2>
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
