import { useSearchParams } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";
import { fmtPrice, fmtSize } from "~/lib/format";
import { getChains, getCurrentOffersPage } from "~/server/queries";

const PAGE_SIZE = 100;

export default function Offers() {
  const [params] = useSearchParams();
  const chains = createMemo(() => getChains());

  const chain = () => (typeof params.chain === "string" ? params.chain : null);
  const q = () => (typeof params.q === "string" ? params.q : "");
  const page = () => {
    const raw = typeof params.page === "string" ? parseInt(params.page, 10) : NaN;
    return Number.isFinite(raw) && raw >= 1 ? raw : 1;
  };

  const data = createMemo(() => getCurrentOffersPage(chain(), page(), 100, q()));
  const offers = () => data()?.offers;
  const total = () => data()?.total ?? 0;

  const totalPages = () => Math.max(1, Math.ceil(total() / PAGE_SIZE));

  return (
    <main class="mx-auto max-w-4xl p-4 text-gray-900">
      <h1 class="mb-4 text-2xl font-semibold">Aktuelle tilbud</h1>

      <form method="get" class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          name="q"
          value={q()}
          placeholder="Søg på varenavn…"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-1"
        />
        <label for="chain" class="text-sm text-gray-600">
          Kæde
        </label>
        <select name="chain" id="chain" class="rounded border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">Alle kæder</option>
          <For each={chains()}>
            {(c) => (
              <option value={c.id} selected={params.chain === c.id}>
                {c.name}
              </option>
            )}
          </For>
        </select>
        <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
          Søg
        </button>
        <Show when={q() !== ""}>
          <a
            href={chain() ? `/offers?chain=${chain()}` : "/offers"}
            class="text-sm text-sky-700 hover:underline"
          >
            Ryd
          </a>
        </Show>
      </form>

      <Show
        when={offers()?.length}
        fallback={
          <p class="text-gray-500">
            {q() !== "" ? "Ingen tilbud matcher din søgning." : "Ingen aktuelle tilbud."}
          </p>
        }
      >
        <p class="mb-3 text-sm text-gray-600">
          Viser {offers()!.length} af {total()} tilbud (side {page()} af {totalPages()})
          {q() !== "" ? ` — søgning på "${q()}"` : ""}
        </p>
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
                  <a
                    href={`/products/${o.product_id}`}
                    class="font-medium text-sky-700 hover:underline"
                  >
                    {o.product_name}
                  </a>
                  <Show when={o.size_from != null}>
                    <p class="text-sm text-gray-600">
                      {fmtSize(o.size_from!, o.unit)}
                      <Show when={o.unit_price != null && o.unit_price_unit != null}>
                        <span class="ml-2 text-xs text-gray-500">
                          {fmtPrice(String(o.unit_price))} {o.unit_price_unit}
                        </span>
                      </Show>
                    </p>
                  </Show>
                  <p class="text-sm text-gray-600">{o.chain_name ?? "Ukendt kæde"}</p>
                  <p class="font-semibold">
                    {fmtPrice(o.price)} {o.currency}
                  </p>
                </div>
              </li>
            )}
          </For>
        </ul>
        <Show when={totalPages() > 1}>
          <nav class="mt-6 flex items-center justify-center gap-4">
            <Show when={page() > 1}>
              <a
                href={`/offers?page=${page() - 1}&chain=${chain() ?? ""}&q=${encodeURIComponent(q())}`}
                class="text-sky-700 hover:underline"
              >
                ← Tidligere
              </a>
            </Show>
            <Show when={page() < totalPages()}>
              <a
                href={`/offers?page=${page() + 1}&chain=${chain() ?? ""}&q=${encodeURIComponent(q())}`}
                class="text-sky-700 hover:underline"
              >
                Næste →
              </a>
            </Show>
          </nav>
        </Show>
      </Show>
    </main>
  );
}
