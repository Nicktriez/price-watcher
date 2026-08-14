import { A, createAsync, Navigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";
import { uploadReceipt, type UploadResult } from "~/server/receipt-upload";

export default function Upload() {
  const user = createAsync(() => getCurrentUser());
  const [result, setResult] = createSignal<UploadResult | null>(null);

  const handleUpload = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) return;
    setResult(await uploadReceipt(file));
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
          {result() && (
            <div class="mt-6 rounded border border-gray-200 p-3 text-sm">
              {result()!.ok ? (
                <>
                  <p class="font-medium text-green-700">{result()!.message}</p>
                  <ul class="mt-2 space-y-1 text-gray-600">
                    {result()!.store && <li>Butik: {result()!.store}</li>}
                    {result()!.total != null && <li>Total: {result()!.total} kr</li>}
                    <li>
                      Varer: {result()!.cleanCount} genkendt, {result()!.garbledCount} ulæselige
                    </li>
                    {result()!.pointsEarned != null && (
                      <li class="font-medium text-amber-700">
                        Du fik {result()!.pointsEarned} point
                        {result()!.streak ? ` · ${result()!.streak} dages stime` : ""}
                      </li>
                    )}
                  </ul>
                  {result()!.dedup !== "new" && (
                    <p class="mt-2 text-gray-500">
                      {result()!.dedup === "duplicate" && "Denne kvittering er allerede uploadet."}
                      {result()!.dedup === "replace" &&
                        "En nyere, tydeligere version erstattede din tidligere scanning."}
                      {result()!.dedup === "keep" &&
                        "Vi beholdt din tidligere, tydeligere scanning."}
                    </p>
                  )}
                  <p class="mt-3">
                    <A
                      href={result()!.receiptId ? `/receipts/${result()!.receiptId}` : "/spending"}
                      class="font-medium text-sky-700 hover:underline"
                    >
                      Se din prissammenligning →
                    </A>
                  </p>
                </>
              ) : (
                <p class="font-medium text-red-700">
                  {result()!.reason === "sign-in-required" && "Du skal være logget ind først."}
                  {result()!.reason === "invalid-image" &&
                    "Upload venligst et JPEG- eller PNG-billede."}
                  {result()!.reason === "ocr-failed" &&
                    "Vi kunne ikke læse den kvittering. Prøv et tydeligere billede."}
                </p>
              )}
            </div>
          )}
        </main>
      </Show>
    </Show>
  );
}
