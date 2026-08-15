import { A, createAsync, Navigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import { queueReceipt, type QueueReceiptResult } from "~/server/receipt-upload";

export default function Upload() {
  const user = createAsync(() => getCurrentUser());
  const [result, setResult] = createSignal<QueueReceiptResult | null>(null);

  const handleUpload = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) return;
    setResult(await queueReceipt(file));
  };

  return (
    <Show
      when={user() !== undefined}
      fallback={<main class="mx-auto max-w-md p-4 text-gray-900" />}
    >
      <Show
        when={user()}
        fallback={
          <main class="mx-auto max-w-md p-4 text-gray-900">
            <Navigate href="/signin" />
          </main>
        }
      >
        <main class="mx-auto max-w-md p-4 text-gray-900">
          <p class="mb-3 text-sm">
            <a href="/lists" class="text-sky-700 hover:underline">
              ← Tilbage til lister
            </a>
          </p>
          <h1 class="mb-4 text-2xl font-semibold">Upload en kvittering</h1>
          <p class="mb-4 text-sm text-gray-600">
            Fotografer din dagligvarekvittering, så læser vi varerne og priserne op. Vi beholder
            priserne og sletter billedet.
          </p>
          <form onSubmit={handleUpload} class="space-y-3">
            <div>
              <label for="file" class="mb-1 block text-sm text-gray-600">
                Kvittering (JPEG eller PNG)
              </label>
              <input
                type="file"
                name="file"
                id="file"
                accept="image/jpeg,image/png"
                required
                class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
              Upload
            </button>
          </form>
          {result() &&
            (() => {
              const r = result()!;
              return (
                <div class="mt-6 rounded border border-gray-200 p-3 text-sm">
                  {r.ok ? (
                    <>
                      <p class="font-medium text-green-700">{r.message}</p>
                      <p class="mt-2 text-gray-600">
                        Kvitteringen læses i baggrunden — du kan gå videre og tjekke ind igen om et
                        minut. Varerne og priserne dukker op på din forbrugsside.
                      </p>
                      <p class="mt-3">
                        <A
                          href={r.receiptId ? `/receipts/${r.receiptId}` : "/spending"}
                          class="font-medium text-sky-700 hover:underline"
                        >
                          Se kvitteringen →
                        </A>
                      </p>
                    </>
                  ) : (
                    <p class="font-medium text-red-700">
                      {r.reason === "sign-in-required" && "Du skal være logget ind først."}
                      {r.reason === "invalid-image" &&
                        "Upload venligst et JPEG- eller PNG-billede."}
                    </p>
                  )}
                </div>
              );
            })()}
        </main>
      </Show>
    </Show>
  );
}
