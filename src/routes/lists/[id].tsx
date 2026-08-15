import { createAsync, Navigate, useNavigate, useParams } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import {
  addListItem,
  deleteList,
  getList,
  removeListItem,
  renameList,
  reorderListItems,
  searchProducts,
  updateListItem,
} from "~/server/lists";

export default function ListDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const user = createAsync(() => getCurrentUser());
  const [version, setVersion] = createSignal(0);
  const refresh = () => setVersion((v) => v + 1);

  const list = createAsync(async () => {
    version();
    return user() ? getList(params.id!) : null;
  });

  const [q, setQ] = createSignal("");
  const [qty, setQty] = createSignal("");
  const [unit, setUnit] = createSignal("");
  // Search results live in a plain signal (debounced fetch), NOT a resource:
  // a resource read that goes pending re-suspends the route's Suspense
  // boundary, which detaches the DOM and blurs the input on every keystroke.
  const [results, setResults] = createSignal<{ id: string; name: string; brand: string | null }[]>(
    [],
  );
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  const handleSearchInput = (value: string) => {
    setQ(value);
    clearTimeout(searchTimer);
    const query = value.trim();
    searchTimer = setTimeout(async () => {
      setResults(query ? await searchProducts(query) : []);
    }, 150);
  };

  const addProduct = async (productId: string) => {
    await addListItem(params.id!, {
      productId,
      quantity: qty() ? Number(qty()) : null,
      unit: unit() || null,
    });
    setQ("");
    setQty("");
    setUnit("");
    refresh();
  };

  const addFreeText = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const raw = data.get("name");
    const name = (typeof raw === "string" ? raw : "").trim();
    if (!name) return;
    const qRaw = data.get("quantity");
    const qVal = typeof qRaw === "string" && qRaw.trim() !== "" ? Number(qRaw) : null;
    const uRaw = data.get("unit");
    await addListItem(params.id!, {
      freeText: name,
      quantity: qVal,
      unit: typeof uRaw === "string" && uRaw.trim() !== "" ? uRaw : null,
    });
    refresh();
    (form as HTMLFormElement).reset();
  };

  const handleRename = async () => {
    const name = window.prompt("Omdøb liste", list()?.name);
    if (!name || !name.trim()) return;
    await renameList(params.id!, name);
    refresh();
  };

  const handleDelete = async () => {
    if (!window.confirm("Slet denne liste og alle dens varer?")) return;
    await deleteList(params.id!);
    navigate("/lists");
  };

  const handleEditQty = async (itemId: string, current: number | null) => {
    const value = window.prompt("Quantity", current?.toString() ?? "");
    if (value === null) return;
    const q = value.trim() === "" ? null : Number(value);
    await updateListItem(params.id!, itemId, { quantity: Number.isNaN(q ?? NaN) ? null : q });
    refresh();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const items = list()?.items;
    if (!items) return;
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const ordered = items.map((i) => i.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await reorderListItems(params.id!, ordered);
    refresh();
  };

  const handleRemove = async (itemId: string) => {
    await removeListItem(params.id!, itemId);
    refresh();
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
        <Show
          when={list()}
          fallback={
            <main class="mx-auto max-w-3xl p-4 text-gray-900">
              <p>List not found.</p>
            </main>
          }
        >
          {(l) => (
            <main class="mx-auto max-w-3xl p-4 text-gray-900">
              <p class="mb-2 text-sm">
                <a href="/lists" class="text-sky-700 hover:underline">
                  ← Alle lister
                </a>
                <span class="mx-2 text-gray-300">|</span>
                <a href={`/compare/${l().id}`} class="font-medium text-sky-700 hover:underline">
                  Sammenlign priser →
                </a>
              </p>
              <div class="mb-4 flex items-baseline gap-3">
                <h1 class="text-2xl font-semibold">{l().name}</h1>
                <span class="text-xs text-gray-500">{l().kind}</span>
                <button
                  type="button"
                  onClick={handleRename}
                  class="text-xs text-sky-700 hover:underline"
                >
                  Omdøb
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  class="text-xs text-red-600 hover:underline"
                >
                  Slet
                </button>
              </div>

              <section class="mb-6 rounded border border-gray-200 p-3">
                <h2 class="mb-2 text-sm font-semibold">Tilføj et produkt</h2>
                <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={q()}
                    onInput={(e) => handleSearchInput(e.currentTarget.value)}
                    placeholder="Søg efter produkter…"
                    class="rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-1"
                  />
                  <div class="flex gap-2">
                    <input
                      type="number"
                      value={qty()}
                      onInput={(e) => setQty(e.currentTarget.value)}
                      placeholder="Antal"
                      class="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-none sm:w-20"
                    />
                    <input
                      type="text"
                      value={unit()}
                      onInput={(e) => setUnit(e.currentTarget.value)}
                      placeholder="Enhed"
                      class="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-none sm:w-20"
                    />
                  </div>
                </div>
                <Show when={results().length}>
                  <ul class="space-y-1">
                    <For each={results()}>
                      {(p) => (
                        <li>
                          <button
                            type="button"
                            onClick={() => addProduct(p.id)}
                            class="w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-100"
                          >
                            {p.name}
                            {p.brand && <span class="ml-2 text-xs text-gray-500">{p.brand}</span>}
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </section>

              <section class="mb-6 rounded border border-gray-200 p-3">
                <h2 class="mb-2 text-sm font-semibold">Eller tilføj fritekst</h2>
                <form
                  onSubmit={addFreeText}
                  class="flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <input
                    type="text"
                    name="name"
                    placeholder="fx Spaghetti 500 g"
                    required
                    class="rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-1"
                  />
                  <div class="flex gap-2">
                    <input
                      type="number"
                      name="quantity"
                      placeholder="Antal"
                      class="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-none sm:w-20"
                    />
                    <input
                      type="text"
                      name="unit"
                      placeholder="Enhed"
                      class="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-none sm:w-20"
                    />
                  </div>
                  <button
                    type="submit"
                    class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white sm:px-4"
                  >
                    Tilføj
                  </button>
                </form>
              </section>

              <Show
                when={l().items.length}
                fallback={<p class="text-gray-500">Listen er tom. Tilføj varer ovenfor.</p>}
              >
                <ul class="space-y-2">
                  <For each={l().items}>
                    {(item, i) => (
                      <li class="flex items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
                        <div class="flex items-center gap-2">
                          <div class="flex flex-col">
                            <button
                              type="button"
                              onClick={() => move(i(), -1)}
                              class="text-xs text-gray-400 hover:text-gray-700"
                              aria-label="Flyt op"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => move(i(), 1)}
                              class="text-xs text-gray-400 hover:text-gray-700"
                              aria-label="Flyt ned"
                            >
                              ▼
                            </button>
                          </div>
                          <span class="text-gray-800">{item.productName ?? item.freeText}</span>
                          <span class="text-xs text-gray-500">
                            {item.quantity != null
                              ? `${item.quantity} ${item.unit ?? ""}`.trim()
                              : ""}
                          </span>
                        </div>
                        <div class="flex items-center gap-3">
                          {item.productName && (
                            <button
                              type="button"
                              onClick={() => handleEditQty(item.id, item.quantity)}
                              class="text-xs text-sky-700 hover:underline"
                            >
                              Antal
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            class="text-xs text-red-600 hover:underline"
                          >
                            Fjern
                          </button>
                        </div>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </main>
          )}
        </Show>
      </Show>
    </Show>
  );
}
