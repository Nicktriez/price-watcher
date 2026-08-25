import { useNavigate } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import { createList, getMyLists, getTemplates, useTemplate } from "~/server/lists";
import Redirect from "~/components/Redirect";

export default function ListsIndex() {
  const navigate = useNavigate();
  const user = createMemo(() => getCurrentUser());
  const lists = createMemo(() => getMyLists());
  const templates = createMemo(() => getTemplates());

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

  const handleUseTemplate = async (templateId: string) => {
    const id = await useTemplate(templateId);
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
            <Redirect href="/signin" />
          </main>
        }
      >
        <main class="mx-auto max-w-3xl p-4 text-gray-900">
          <h1 class="mb-4 text-2xl font-semibold">Dine lister</h1>
          <p class="mb-4">
            <a href="/lists/import" class="text-sky-700 hover:underline">
              Importer en opskrift →
            </a>
          </p>

          <section class="mb-6">
            <h2 class="mb-2 text-lg font-semibold">Start fra en skabelon</h2>
            <Show
              when={templates()?.length}
              fallback={<p class="text-gray-500">Ingen skabeloner endnu.</p>}
            >
              <ul class="grid gap-3 sm:grid-cols-2">
                <For each={templates()}>
                  {(t) => (
                    <li class="rounded border border-gray-200 p-3">
                      <p class="font-medium text-gray-800">{t.name}</p>
                      <p class="mb-2 text-xs text-gray-500">
                        {t.itemCount} varer · {t.firstItems.join(", ")}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(t.id)}
                        class="rounded bg-sky-600 px-3 py-1 text-sm text-white"
                      >
                        Brug skabelon
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </section>

          <section class="mb-6">
            <h2 class="mb-2 text-lg font-semibold">Eller start en tom liste</h2>
            <form onSubmit={handleCreate} class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                name="name"
                placeholder="Listens navn (fx Ugeindkøb)"
                required
                class="rounded border border-gray-300 px-3 py-1.5 text-sm sm:flex-1"
              />
              <select name="kind" class="rounded border border-gray-300 px-3 py-1.5 text-sm">
                <option value="custom">Egen</option>
                <option value="recipe">Opskrift</option>
                <option value="cleaning">Rengøring</option>
              </select>
              <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
                Opret liste
              </button>
            </form>
          </section>

          <Show when={lists()?.length} fallback={null}>
            <section>
              <h2 class="mb-2 text-lg font-semibold">Dine lister</h2>
              <ul class="space-y-2">
                <For each={lists()}>
                  {(l) => (
                    <li class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                      <a href={`/lists/${l.id}`} class="font-medium text-sky-700 hover:underline">
                        {l.name}
                      </a>
                      <span class="text-xs text-gray-500">
                        {l.kind} · {l.itemCount} varer
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          </Show>

          <p class="mt-6 text-sm">
            <a href="/upload" class="text-sky-700 hover:underline">
              Upload en kvittering →
            </a>
          </p>
        </main>
      </Show>
    </Show>
  );
}
