import { createAsync, Navigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import {
  getModerationQueue,
  isAdminUser,
  moderateCrowdReport,
  setUserMuted,
} from "~/server/moderation";

export default function Admin() {
  const user = createAsync(() => getCurrentUser());
  const admin = createAsync(() => isAdminUser());
  const [version, setVersion] = createSignal(0);
  const [busy, setBusy] = createSignal(false);
  const queue = createAsync(async () => {
    version();
    return getModerationQueue();
  });

  const act = async (fn: () => Promise<unknown>) => {
    if (busy()) return;
    setBusy(true);
    try {
      await fn();
      setVersion((v) => v + 1);
    } finally {
      setBusy(false);
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
          <Show when={admin()} fallback={<p class="text-red-700">Not authorized.</p>}>
            <h1 class="mb-1 text-2xl font-semibold">Moderation queue</h1>
            <p class="mb-6 text-sm text-gray-600">
              Flagged, expired, and hidden crowd reports. Hiding keeps history; restoring shows it
              again.
            </p>

            <Show
              when={queue() && queue()!.length}
              fallback={<p class="text-gray-500">Queue is empty — nothing flagged or expired.</p>}
            >
              <ul class="space-y-3">
                <For each={queue()}>
                  {(item) => (
                    <li class="rounded border border-gray-200 p-3 text-sm">
                      <div class="flex items-baseline justify-between gap-3">
                        <div>
                          <p class="font-medium">
                            {item.productName ?? "free-text"}
                            <span class="ml-2 font-normal text-gray-600">{item.storeName}</span>
                          </p>
                          <p class="text-xs text-gray-500">
                            {item.reporterEmail}
                            {item.reporterMuted ? " · muted" : ""} · {item.age} ·{" "}
                            {fmtPrice(String(item.price))} kr
                          </p>
                          <p class="mt-1 text-xs text-gray-600">
                            <Show when={item.status === "hidden"}>
                              <span class="mr-2 rounded bg-gray-200 px-1.5 py-0.5 text-gray-600">
                                hidden
                              </span>
                            </Show>
                            <Show when={item.expired}>
                              <span class="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                                expired
                              </span>
                            </Show>
                            <Show when={item.flagCount > 0}>
                              <span class="mr-2 rounded bg-red-100 px-1.5 py-0.5 text-red-800">
                                {item.flagCount} flagger{item.flagCount === 1 ? "" : "s"}
                              </span>
                            </Show>
                            {item.flaggers.map((f) => `${f.reason} (${f.count})`).join(" · ")}
                          </p>
                        </div>
                        <div class="flex shrink-0 items-center gap-2 text-xs">
                          <button
                            type="button"
                            disabled={busy()}
                            onClick={() => act(() => moderateCrowdReport(item.id, "hide"))}
                            class="rounded bg-red-600 px-2 py-1 text-white disabled:opacity-50"
                          >
                            Hide
                          </button>
                          <button
                            type="button"
                            disabled={busy()}
                            onClick={() => act(() => moderateCrowdReport(item.id, "restore"))}
                            class="rounded bg-gray-200 px-2 py-1 text-gray-700 disabled:opacity-50"
                          >
                            Restore
                          </button>
                          <Show when={!item.reporterMuted}>
                            <button
                              type="button"
                              disabled={busy()}
                              onClick={() => act(() => setUserMuted(item.reporterId, true))}
                              class="rounded bg-amber-600 px-2 py-1 text-white disabled:opacity-50"
                            >
                              Mute reporter
                            </button>
                          </Show>
                        </div>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </main>
      </Show>
    </Show>
  );
}
