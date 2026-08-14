import { createAsync, Navigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import { searchProducts } from "~/server/lists";
import { searchStores, submitCrowdReport, type CrowdReportResult } from "~/server/report";

export default function Report() {
  const user = createAsync(() => getCurrentUser());

  // Search results live in plain signals (debounced fetch), NOT resources —
  // a pending resource read re-suspends the route's Suspense boundary and
  // blurs the input on each keystroke.
  const [storeQuery, setStoreQuery] = createSignal("");
  const [selectedStore, setSelectedStore] = createSignal<{ id: string; name: string } | null>(null);
  const [stores, setStores] = createSignal<
    { id: string; name: string; address: string | null; city: string | null; zip: string | null }[]
  >([]);
  let storeTimer: ReturnType<typeof setTimeout> | undefined;
  const handleStoreInput = (value: string) => {
    setStoreQuery(value);
    clearTimeout(storeTimer);
    const query = value.trim();
    storeTimer = setTimeout(async () => {
      setStores(query ? await searchStores(query) : []);
    }, 150);
  };

  const [productQuery, setProductQuery] = createSignal("");
  const [selectedProduct, setSelectedProduct] = createSignal<{ id: string; name: string } | null>(
    null,
  );
  const [useFreeText, setUseFreeText] = createSignal(false);
  const [freeText, setFreeText] = createSignal("");
  const [products, setProducts] = createSignal<
    { id: string; name: string; brand: string | null }[]
  >([]);
  let productTimer: ReturnType<typeof setTimeout> | undefined;
  const handleProductInput = (value: string) => {
    setProductQuery(value);
    clearTimeout(productTimer);
    const query = value.trim();
    productTimer = setTimeout(async () => {
      setProducts(query ? await searchProducts(query) : []);
    }, 150);
  };

  const [price, setPrice] = createSignal("");
  const [photo, setPhoto] = createSignal<File | null>(null);
  const [result, setResult] = createSignal<CrowdReportResult | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (submitting()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("storeId", selectedStore()!.id);
      if (selectedProduct()) fd.set("productId", selectedProduct()!.id);
      if (useFreeText() && freeText()) fd.set("productName", freeText());
      fd.set("price", price());
      if (photo()) fd.set("photo", photo()!);
      setResult(await submitCrowdReport(fd));
    } finally {
      setSubmitting(false);
    }
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
            <Navigate href="/signin" />
          </main>
        }
      >
        <main class="mx-auto max-w-3xl p-4 text-gray-900">
          <h1 class="mb-1 text-2xl font-semibold">Report a shelf price</h1>
          <p class="mb-6 text-sm text-gray-600">
            Saw a price in a store that isn't in any offer? Report it — it helps others (and you)
            spot real prices.
          </p>

          <form onSubmit={handleSubmit} class="space-y-5">
            <div>
              <label for="store-search" class="mb-1 block text-sm text-gray-600">
                Store
              </label>
              <Show
                when={selectedStore()}
                fallback={
                  <>
                    <input
                      type="text"
                      id="store-search"
                      value={storeQuery()}
                      onInput={(e) => {
                        handleStoreInput(e.currentTarget.value);
                        setSelectedStore(null);
                      }}
                      placeholder="Search by store name or city…"
                      class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <Show when={stores().length}>
                      <ul class="mt-1 rounded border border-gray-200">
                        <For each={stores()}>
                          {(s) => (
                            <li>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStore({ id: s.id, name: s.name });
                                  setStoreQuery(s.name);
                                }}
                                class="w-full px-3 py-1.5 text-left text-sm hover:bg-sky-50"
                              >
                                {s.name}
                                <span class="text-gray-500">
                                  {s.city ? ` · ${s.city}` : ""}
                                  {s.address ? ` · ${s.address}` : ""}
                                </span>
                              </button>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                  </>
                }
              >
                {(s) => (
                  <div class="flex items-center justify-between rounded border border-gray-300 px-3 py-1.5 text-sm">
                    <span>{s().name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStore(null);
                        setStoreQuery("");
                      }}
                      class="text-sky-700 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </Show>
            </div>

            <div>
              <label for="product-search" class="mb-1 block text-sm text-gray-600">
                Product
              </label>
              <Show
                when={!useFreeText()}
                fallback={
                  <div>
                    <input
                      type="text"
                      id="free-text"
                      value={freeText()}
                      onInput={(e) => setFreeText(e.currentTarget.value)}
                      placeholder="Name of the product…"
                      class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseFreeText(false);
                        setSelectedProduct(null);
                      }}
                      class="mt-1 text-sm text-sky-700 hover:underline"
                    >
                      Search the catalog instead
                    </button>
                  </div>
                }
              >
                <Show
                  when={selectedProduct()}
                  fallback={
                    <>
                      <input
                        type="text"
                        id="product-search"
                        value={productQuery()}
                        onInput={(e) => {
                          handleProductInput(e.currentTarget.value);
                          setSelectedProduct(null);
                        }}
                        placeholder="Search by product name…"
                        class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                      />
                      <Show when={products().length}>
                        <ul class="mt-1 rounded border border-gray-200">
                          <For each={products()}>
                            {(p) => (
                              <li>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProduct({ id: p.id, name: p.name });
                                    setProductQuery(p.name);
                                  }}
                                  class="w-full px-3 py-1.5 text-left text-sm hover:bg-sky-50"
                                >
                                  {p.name}
                                  {p.brand ? <span class="text-gray-500"> · {p.brand}</span> : ""}
                                </button>
                              </li>
                            )}
                          </For>
                        </ul>
                      </Show>
                      <Show when={productQuery().trim().length > 1 && products().length === 0}>
                        <button
                          type="button"
                          onClick={() => setUseFreeText(true)}
                          class="mt-1 text-sm text-sky-700 hover:underline"
                        >
                          Can't find it? Report it with a free-text name
                        </button>
                      </Show>
                    </>
                  }
                >
                  {(p) => (
                    <div class="flex items-center justify-between rounded border border-gray-300 px-3 py-1.5 text-sm">
                      <span>{p().name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(null);
                          setProductQuery("");
                        }}
                        class="text-sky-700 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </Show>
              </Show>
            </div>

            <div>
              <label for="price" class="mb-1 block text-sm text-gray-600">
                Price (kr)
              </label>
              <input
                type="number"
                id="price"
                min="0"
                step="0.01"
                value={price()}
                onInput={(e) => setPrice(e.currentTarget.value)}
                placeholder="e.g. 12.95"
                required
                class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label for="photo" class="mb-1 block text-sm text-gray-600">
                Photo (optional evidence)
              </label>
              <input
                type="file"
                id="photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.currentTarget.files?.[0] ?? null)}
                class="w-full text-sm"
              />
              <p class="mt-1 text-xs text-gray-500">
                Optional — a price alone is useful. A photo helps later verification.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting() || !selectedStore() || price() === ""}
              class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {submitting() ? "Reporting…" : "Report price"}
            </button>
          </form>

          <Show when={result()}>
            {(r) => (
              <div
                class={`mt-6 rounded border p-3 text-sm ${
                  r().ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <Show
                  when={r().ok}
                  fallback={<p class="font-medium text-red-700">{r().message}</p>}
                >
                  <p class="font-medium text-green-700">{r().message}</p>
                  <p class="mt-2 text-xs text-gray-600">
                    User-reported — this price is never shown as an offer or a discount, only as a
                    single user report (it may become a community price once several people agree).
                  </p>
                </Show>
              </div>
            )}
          </Show>

          <p class="mt-6 text-xs text-gray-500">
            Your report is stored with a timestamp and tied to your account (for anti-spam and
            points). It never enters the offer feed and is never marked "official".
          </p>
        </main>
      </Show>
    </Show>
  );
}
