import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtDate, fmtPrice } from "~/lib/format";
import { getStoreById } from "~/server/queries";

export default function StorePage() {
  const params = useParams();
  const store = createAsync(async () => (params.id ? getStoreById(params.id) : null));

  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <p class="mb-4">
        <A href="/offers" class="text-sky-700 hover:underline">
          ← Tilbage til tilbud
        </A>
      </p>

      <Show when={store()} fallback={<p>Store not found.</p>}>
        {(s) => (
          <>
            <h1 class="mb-1 text-2xl font-semibold">{s().name}</h1>
            <p class="mb-6 text-sm text-gray-600">{s().chain_name}</p>

            <h2 class="mb-2 text-lg font-semibold">Current offers</h2>
            <Show
              when={s().offers.length}
              fallback={<p class="text-gray-500">No current offers at this store.</p>}
            >
              <ul class="space-y-3">
                <For each={s().offers}>
                  {(o) => (
                    <li class="flex gap-3 rounded border border-gray-200 p-3">
                      <Show
                        when={o.image_url}
                        fallback={<div class="h-20 w-20 shrink-0 rounded bg-gray-200" />}
                      >
                        <img
                          src={o.image_url ?? undefined}
                          alt={o.product_name}
                          class="h-20 w-20 shrink-0 rounded object-cover"
                        />
                      </Show>
                      <div>
                        <p class="font-medium">{o.product_name}</p>
                        <p class="font-semibold">
                          {fmtPrice(o.price)} {o.currency}
                        </p>
                        <p class="text-xs text-gray-500">
                          Valid {fmtDate(o.valid_from)} – {fmtDate(o.valid_to)}
                        </p>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}
