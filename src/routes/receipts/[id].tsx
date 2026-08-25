import { useParams } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";
import { fmtDate, fmtPrice } from "~/lib/format";
import { getCurrentUser } from "~/server/auth";
import { getReceiptComparison, type ReceiptLineComparison } from "~/server/queries";
import { getReceiptStatus, retryReceipt } from "~/server/receipt-upload";
import Redirect from "~/components/Redirect";

function DeltaLabel({ line }: { line: ReceiptLineComparison }) {
  if (line.paid == null) {
    return <span class="text-xs text-gray-400">pris ikke læst</span>;
  }
  if (line.average == null || line.delta == null) {
    return <span class="text-xs text-gray-400">ingen sammenligning endnu</span>;
  }
  if (Math.abs(line.delta) / line.average < 0.02) {
    return <span class="text-xs text-gray-500">omkring gennemsnittet</span>;
  }
  if (line.delta < 0) {
    return (
      <span class="text-xs font-medium text-green-700">
        {fmtPrice(String(-line.delta))} kr under gennemsnittet
      </span>
    );
  }
  return (
    <span class="text-xs text-gray-500">{fmtPrice(String(line.delta))} kr over gennemsnittet</span>
  );
}

export default function ReceiptPage() {
  const params = useParams();
  const user = createMemo(() => getCurrentUser());
  const status = createMemo(async () =>
    user() && params.id ? getReceiptStatus(params.id, user()!.id) : null,
  );
  const comparison = createMemo(async () =>
    user() && params.id && status()?.status === "processed"
      ? getReceiptComparison(params.id, user()!.id)
      : null,
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
            <Redirect href="/signin" />
          </main>
        }
      >
        <main class="mx-auto max-w-3xl p-4 text-gray-900">
          <Show
            when={status()}
            fallback={
              <p class="text-gray-500">
                Kvitteringen blev ikke fundet.{" "}
                <a href="/spending" class="text-sky-700 hover:underline">
                  Gå til dit forbrug
                </a>
                .
              </p>
            }
          >
            {(st) => {
              const s = st().status;
              return s === "processed" ? (
                <Show when={comparison()} fallback={<p class="text-gray-500">Indlæser…</p>}>
                  {(c) => {
                    const r = c();
                    const dateStr = r.receipt.receiptDate ? fmtDate(r.receipt.receiptDate) : "";
                    return (
                      <>
                        <h1 class="mb-1 text-2xl font-semibold">Din kvittering</h1>
                        <p class="mb-4 text-sm text-gray-600">
                          {r.receipt.storeName ?? "Ukendt butik"}
                          {dateStr && ` · ${dateStr}`}
                          {r.receipt.total != null
                            ? ` · total ${fmtPrice(r.receipt.total)} kr`
                            : ""}
                        </p>

                        <Show when={r.overallDelta != null}>
                          <p class="mb-4 rounded border border-gray-200 p-3 text-sm">
                            {r.overallDelta! < 0 ? (
                              <span class="font-medium text-green-700">
                                Du betalte {fmtPrice(String(-r.overallDelta!))} kr under
                                gennemsnitsprisen på denne kvittering.
                              </span>
                            ) : (
                              <span class="text-gray-700">
                                Du betalte {fmtPrice(String(r.overallDelta!))} kr over
                                gennemsnitsprisen på denne kvittering.
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
                                    <span class="font-semibold">
                                      {fmtPrice(String(line.paid))} kr
                                    </span>
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
              ) : s === "failed" ? (
                <div class="rounded border border-gray-200 p-4">
                  <h1 class="mb-1 text-2xl font-semibold">Kunne ikke læses</h1>
                  <p class="text-gray-600">
                    Vi kunne ikke læse denne kvittering. Prøv igen med et tydeligere billede.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await retryReceipt(params.id!);
                      location.reload();
                    }}
                    class="mt-3 rounded bg-sky-600 px-4 py-1.5 text-sm text-white"
                  >
                    Prøv igen
                  </button>
                </div>
              ) : (
                <div class="rounded border border-gray-200 p-4">
                  <h1 class="mb-1 text-2xl font-semibold">Din kvittering</h1>
                  <p class="text-gray-600">
                    Kvitteringen bliver læst i baggrunden — kom tilbage om et minut.
                  </p>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      location.reload();
                    }}
                    class="mt-3 inline-block text-sky-700 hover:underline"
                  >
                    Opdater
                  </a>
                </div>
              );
            }}
          </Show>
        </main>
      </Show>
    </Show>
  );
}
