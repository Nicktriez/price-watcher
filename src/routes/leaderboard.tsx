import { For, Show, createMemo } from "solid-js";
import { fmtPrice } from "~/lib/format";
import { getLeaderboard } from "~/server/queries";

export default function Leaderboard() {
  const entries = createMemo(() => getLeaderboard(20));

  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <h1 class="mb-1 text-2xl font-semibold">Leaderboard</h1>
      <p class="mb-6 text-sm text-gray-600">
        Points for uploading receipts and for crowd price reports that reach a trust tier. Points
        only count for verified reports — not spam.
      </p>

      <Show
        when={entries() && entries()!.length}
        fallback={<p class="text-gray-500">No points yet — upload a receipt or report a price.</p>}
      >
        <ol class="space-y-1">
          <For each={entries()}>
            {(e, i) => (
              <li
                class={`flex items-baseline justify-between rounded px-3 py-2 ${
                  i() === 0
                    ? "bg-amber-100 text-amber-900"
                    : i() === 1 || i() === 2
                      ? "bg-gray-100"
                      : ""
                }`}
              >
                <span class="font-medium">
                  {i() + 1}. {e.name}
                </span>
                <span class="font-semibold">{fmtPrice(String(e.points))} pts</span>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </main>
  );
}
