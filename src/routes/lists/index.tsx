import { A, createAsync, Navigate, useNavigate } from "@solidjs/router";
import { For, Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import { createList, getMyLists } from "~/server/lists";

export default function ListsIndex() {
  const navigate = useNavigate();
  const user = createAsync(() => getCurrentUser());
  const lists = createAsync(() => getMyLists());

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const raw = data.get("name");
    const name = typeof raw === "string" ? raw : "";
    const kRaw = data.get("kind");
    const kind = typeof kRaw === "string" ? kRaw : "custom";
    const id = await createList(name, kind as "recipe" | "cleaning" | "custom");
    navigate(`/lists/${id}`);
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
          <h1 class="mb-4 text-2xl font-semibold">Your lists</h1>
          <p class="mb-4">
            <A href="/lists/import" class="text-sky-700 hover:underline">
              Import a recipe →
            </A>
          </p>

          <form onSubmit={handleCreate} class="mb-6 flex items-center gap-2">
            <input
              type="text"
              name="name"
              placeholder="List name (e.g. Weekly shopping)"
              required
              class="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <select name="kind" class="rounded border border-gray-300 px-3 py-1.5 text-sm">
              <option value="custom">Custom</option>
              <option value="recipe">Recipe</option>
              <option value="cleaning">Cleaning</option>
            </select>
            <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
              Create list
            </button>
          </form>

          <Show
            when={lists()?.length}
            fallback={
              <p class="text-gray-500">
                No lists yet. Start a blank list above to build your first shopping list.
              </p>
            }
          >
            <ul class="space-y-2">
              <For each={lists()}>
                {(l) => (
                  <li class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                    <A href={`/lists/${l.id}`} class="font-medium text-sky-700 hover:underline">
                      {l.name}
                    </A>
                    <span class="text-xs text-gray-500">
                      {l.kind} · {l.itemCount} items
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </main>
      </Show>
    </Show>
  );
}
