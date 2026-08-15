import { A, createAsync, Navigate } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtDate, fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import { getSpendingReport } from "~/server/queries";

export default function Spending() {
  const user = createAsync(() => getCurrentUser());
  const report = createAsync(async () => (user() ? getSpendingReport(user()!.id) : null));

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
          <h1 class="mb-1 text-2xl font-semibold">Your spending</h1>
          <p class="mb-6 text-sm text-gray-600">
            Based on the receipts you've uploaded — yours alone.
          </p>

          <Show when={report()} fallback={<p class="text-gray-500">Loading…</p>}>
            {(r) => (
              <>
                <section class="mb-6 rounded border border-gray-200 p-4">
                  <p class="text-sm text-gray-600">Total spent this month</p>
                  <p class="text-3xl font-semibold">{fmtPrice(String(r().totalThisMonth))} kr</p>
                </section>

                <section class="mb-6">
                  <h2 class="mb-2 text-lg font-semibold">By store</h2>
                  <Show
                    when={r().byStore.length}
                    fallback={<p class="text-gray-500">No receipts this month yet.</p>}
                  >
                    <ul class="space-y-2">
                      <For each={r().byStore}>
                        {(s) => (
                          <li class="flex items-baseline justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                            <span class="text-gray-800">
                              {s.storeName}
                              <span class="ml-2 text-xs text-gray-500">({s.count})</span>
                            </span>
                            <span class="font-semibold">{fmtPrice(String(s.total))} kr</span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </section>

                <section>
                  <h2 class="mb-2 text-lg font-semibold">Recent receipts</h2>
                  <Show
                    when={r().recentReceipts.length}
                    fallback={<p class="text-gray-500">No receipts uploaded yet.</p>}
                  >
                    <ul class="space-y-2">
                      <For each={r().recentReceipts}>
                        {(rec) => (
                          <li class="flex items-baseline justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                            <span class="text-gray-800">
                              <A href={`/receipts/${rec.id}`} class="hover:underline">
                                {rec.storeName ?? "Ukendt butik"}
                              </A>
                              <span class="ml-2 text-xs text-gray-500">
                                {rec.status === "pending" || rec.status === "processing"
                                  ? "bliver behandlet…"
                                  : rec.status === "failed"
                                    ? "kunne ikke læses"
                                    : rec.receiptDate
                                      ? `${fmtDate(rec.receiptDate)} · ${rec.itemCount} varer`
                                      : "date unknown"}
                              </span>
                            </span>
                            <span class="font-semibold">
                              {rec.total != null ? `${fmtPrice(rec.total)} kr` : "—"}
                            </span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </section>
              </>
            )}
          </Show>
        </main>
      </Show>
    </Show>
  );
}
