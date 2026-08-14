import { createAsync, Navigate, useNavigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import { addListItem, createList, searchProducts } from "~/server/lists";
import { parseIngredientQuantity, splitIngredients } from "~/lib/recipe";

interface IngredientRow {
  key: string;
  name: string;
  amount: number | null;
  unit: string | null;
  productId: string | null;
  productName: string;
  search: string;
  suggestions: { id: string; name: string }[];
}

export default function RecipeImport() {
  const navigate = useNavigate();
  const user = createAsync(() => getCurrentUser());
  const [recipeName, setRecipeName] = createSignal("");
  const [rawText, setRawText] = createSignal("");
  const [rows, setRows] = createSignal<IngredientRow[]>([]);
  const [saving, setSaving] = createSignal(false);

  const handleParse = async () => {
    const lines = splitIngredients(rawText());
    const parsed: IngredientRow[] = [];
    for (const line of lines) {
      const { name, amount, unit } = parseIngredientQuantity(line);
      const suggestions = await searchProducts(name);
      const top = suggestions[0];
      parsed.push({
        key: Math.random().toString(36).slice(2),
        name,
        amount,
        unit,
        productId: top?.id ?? null,
        productName: top?.name ?? "",
        search: top?.name ?? "",
        suggestions,
      });
    }
    setRows(parsed);
  };

  const patchRow = (key: string, patch: Partial<IngredientRow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const onSearch = async (key: string, value: string) => {
    patchRow(key, { search: value });
    const suggestions = await searchProducts(value);
    patchRow(key, { suggestions });
  };

  const selectProduct = (key: string, id: string, name: string) => {
    patchRow(key, { productId: id, productName: name, search: name, suggestions: [] });
  };

  const clearProduct = (key: string) => {
    patchRow(key, { productId: null, productName: "", search: "", suggestions: [] });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const listId = await createList(recipeName().trim() || "Opskrift", "recipe");
      for (const row of rows()) {
        await addListItem(listId, {
          productId: row.productId ?? undefined,
          freeText: row.productId ? undefined : row.name,
          quantity: row.amount,
          unit: row.unit,
        });
      }
      navigate(`/lists/${listId}`);
    } finally {
      setSaving(false);
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
          <p class="mb-2 text-sm">
            <a href="/lists" class="text-sky-700 hover:underline">
              ← Alle lister
            </a>
          </p>
          <h1 class="mb-4 text-2xl font-semibold">Importer en opskrift</h1>
          <p class="mb-4 text-sm text-gray-600">
            Indsæt en opskrift nedenfor — én ingrediens pr. linje. Vi læser den og lader dig koble
            hver ingrediens til et produkt, før du gemmer den som en liste.
          </p>

          <div class="mb-4 space-y-2">
            <input
              type="text"
              value={recipeName()}
              onInput={(e) => setRecipeName(e.currentTarget.value)}
              placeholder="Opskriftens navn (fx Spaghetti bolognese)"
              class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <textarea
              value={rawText()}
              onInput={(e) => setRawText(e.currentTarget.value)}
              rows={8}
              placeholder={
                "250 g spaghetti\n1 løg\n400 g hakket oksekød\n2 dåser hakkede tomater\nsalt\npeber"
              }
              class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleParse}
              class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white"
            >
              Læs ingredienserne
            </button>
          </div>

          <Show when={rows().length > 0}>
            <h2 class="mb-2 text-lg font-semibold">Ingredienser</h2>
            <ul class="space-y-3">
              <For each={rows()}>
                {(row) => (
                  <li class="rounded border border-gray-200 p-3">
                    <div class="mb-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={row.search}
                        onInput={(e) => onSearch(row.key, e.currentTarget.value)}
                        placeholder="Søg efter et produkt…"
                        class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm"
                      />
                      <input
                        type="number"
                        value={row.amount ?? ""}
                        onInput={(e) =>
                          patchRow(row.key, {
                            amount: e.currentTarget.value ? Number(e.currentTarget.value) : null,
                          })
                        }
                        placeholder="Antal"
                        class="w-20 rounded border border-gray-300 px-3 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={row.unit ?? ""}
                        onInput={(e) => patchRow(row.key, { unit: e.currentTarget.value || null })}
                        placeholder="Enhed"
                        class="w-20 rounded border border-gray-300 px-3 py-1 text-sm"
                      />
                    </div>
                    <Show when={row.suggestions.length > 0}>
                      <ul class="mb-2 space-y-1">
                        <For each={row.suggestions}>
                          {(s) => (
                            <li>
                              <button
                                type="button"
                                onClick={() => selectProduct(row.key, s.id, s.name)}
                                class="w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-100"
                              >
                                {s.name}
                              </button>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                    <Show when={row.productId}>
                      <p class="text-xs text-gray-600">
                        Koblet til produkt: <span class="font-medium">{row.productName}</span>{" "}
                        <button
                          type="button"
                          onClick={() => clearProduct(row.key)}
                          class="text-red-600 hover:underline"
                        >
                          (brug som fritekst i stedet)
                        </button>
                      </p>
                    </Show>
                    <Show when={!row.productId}>
                      <p class="text-xs text-gray-500">Gemmes som fritekst: "{row.name}"</p>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving()}
              class="mt-4 rounded bg-sky-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving() ? "Gemmer…" : "Gem som liste"}
            </button>
          </Show>
        </main>
      </Show>
    </Show>
  );
}
