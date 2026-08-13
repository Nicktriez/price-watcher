import { createAsync, Navigate, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { fmtDate, fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import { getReceiptComparison, type ReceiptLineComparison } from "~/server/queries";

function DeltaLabel({ line }: { line: ReceiptLineComparison }) {
  if (line.paid == null) {
    return <span class="text-xs text-gray-400">price not read</span>;
  }
  if (line.average == null || line.delta == null) {
    return <span class="text-xs text-gray-400">no comparison yet</span>;
  }
  if (Math.abs(line.delta) / line.average < 0.02) {
    return <span class="text-xs text-gray-500">about average</span>;
  }
  if (line.delta < 0) {
    return (
      <span class="text-xs font-medium text-green-700">
        {fmtPrice(String(-line.delta))} kr below average
      </span>
    );
  }
  return <span class="text-xs text-gray-500">{fmtPrice(String(line.delta))} kr above average</span>;
}

export default function ReceiptPage() {
  const params = useParams();
  const user = createAsync(() => getCurrentUser());
  const comparison = createAsync(async () =>
    user() && params.id ? getReceiptComparison(params.id, user()!.id) : null,
  );

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
          <Show when={comparison()} fallback={<p>Receipt not found.</p>}>
            {(c) => {
              const r = c();
              const dateStr = r.receipt.receiptDate ? fmtDate(r.receipt.receiptDate) : "";
              return (
                <>
                  <h1 class="mb-1 text-2xl font-semibold">Your receipt</h1>
                  <p class="mb-4 text-sm text-gray-600">
                    {r.receipt.storeName ?? "Unknown store"}
                    {dateStr && ` · ${dateStr}`}
                    {r.receipt.total != null ? ` · total ${fmtPrice(r.receipt.total)} kr` : ""}
                  </p>

                  <Show when={r.overallDelta != null}>
                    <p class="mb-4 rounded border border-gray-200 p-3 text-sm">
                      {r.overallDelta! < 0 ? (
                        <span class="font-medium text-green-700">
                          You paid {fmtPrice(String(-r.overallDelta!))} kr below the going rate on
                          this receipt.
                        </span>
                      ) : (
                        <span class="text-gray-700">
                          You paid {fmtPrice(String(r.overallDelta!))} kr above the going rate on
                          this receipt.
                        </span>
                      )}
                    </p>
                  </Show>

                  <ul class="space-y-2">
                    <For each={r.lines}>
                      {(line) => (
                        <li class="flex items-baseline justify-between gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
                          <span class="text-gray-800">{line.name}</span>
                          <span class="flex items-baseline gap-3">
                            {line.paid != null && (
                              <span class="font-semibold">{fmtPrice(String(line.paid))} kr</span>
                            )}
                            <DeltaLabel line={line} />
                          </span>
                        </li>
                      )}
                    </For>
                  </ul>
                </>
              );
            }}
          </Show>
        </main>
      </Show>
    </Show>
  );
}
