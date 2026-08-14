import { A, createAsync, useSearchParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import { getChains, getCurrentOffersPage } from "~/server/queries";

const PAGE_SIZE = 100;

export default function Home() {
  const [params] = useSearchParams();
  const chains = createAsync(() => getChains());
  const user = createAsync(() => getCurrentUser());

  const chain = () => (typeof params.chain === "string" ? params.chain : null);
  const page = () => {
    const raw = typeof params.page === "string" ? parseInt(params.page, 10) : NaN;
    return Number.isFinite(raw) && raw >= 1 ? raw : 1;
  };

  const data = createAsync(() => getCurrentOffersPage(chain(), page()));
  const offers = () => data()?.offers;
  const total = () => data()?.total ?? 0;

  const totalPages = () => Math.max(1, Math.ceil(total() / PAGE_SIZE));

  return (
    <main class="mx-auto max-w-4xl p-4 text-gray-900">
      <section class="mb-6 rounded border border-sky-200 bg-sky-50 p-4">
        <h1 class="text-xl font-semibold">
          {user() ? "Kom godt i gang" : "Byg din indkøbsliste og find de billigste priser"}
        </h1>
        <p class="mb-3 mt-1 text-sm text-gray-600">
          {user()
            ? "Opret en indkøbsliste, upload en kvittering, eller se hvor du sparer mest."
            : "Log ind for at oprette din egen indkøbsliste, uploade kvitteringer og sammenligne priser i butikkerne."}
        </p>
        <div class="flex flex-wrap gap-2">
          <Show
            when={user()}
            fallback={
              <a href="/signin" class="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white">
                Log ind
              </a>
            }
          >
            <a href="/lists" class="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white">
              Opret indkøbsliste
            </a>
            <a href="/upload" class="rounded bg-white px-4 py-2 text-sm font-medium text-sky-700">
              Upload kvittering
            </a>
            <a href="/spending" class="rounded bg-white px-4 py-2 text-sm font-medium text-sky-700">
              Se dit forbrug
            </a>
          </Show>
        </div>
      </section>

      <h2 class="mb-4 text-2xl font-semibold">Aktuelle tilbud</h2>

      <form method="get" class="mb-6 flex items-center gap-2">
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
          Filtrér
        </button>
      </form>

      <Show when={offers()?.length} fallback={<p class="text-gray-500">Ingen aktuelle tilbud.</p>}>
        <p class="mb-3 text-sm text-gray-600">
          Viser {offers()!.length} af {total()} tilbud (side {page()} af {totalPages()})
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
                  <A
                    href={`/products/${o.product_id}`}
                    class="font-medium text-sky-700 hover:underline"
                  >
                    {o.product_name}
                  </A>
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
              <A
                href={`/?page=${page() - 1}&chain=${chain() ?? ""}`}
                class="text-sky-700 hover:underline"
              >
                ← Forrige
              </A>
            </Show>
            <Show when={page() < totalPages()}>
              <A
                href={`/?page=${page() + 1}&chain=${chain() ?? ""}`}
                class="text-sky-700 hover:underline"
              >
                Næste →
              </A>
            </Show>
          </nav>
        </Show>
      </Show>
    </main>
  );
}
