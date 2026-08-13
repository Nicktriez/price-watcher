import { createAsync, Navigate } from "@solidjs/router";
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
          <h1 class="mb-4 text-2xl font-semibold">Upload a receipt</h1>
          <p class="mb-4 text-sm text-gray-600">
            Photo your grocery receipt and we'll extract the items, keep the prices, and delete the
            image.
          </p>
          <form onSubmit={handleUpload} class="space-y-3">
            <div>
              <label for="file" class="mb-1 block text-sm text-gray-600">
                Receipt image (JPEG or PNG)
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
                    {result()!.store && <li>Store: {result()!.store}</li>}
                    {result()!.total != null && <li>Total: {result()!.total} kr</li>}
                    <li>
                      Items: {result()!.cleanCount} recovered, {result()!.garbledCount} unreadable
                    </li>
                  </ul>
                  {result()!.dedup !== "new" && (
                    <p class="mt-2 text-gray-500">
                      {result()!.dedup === "duplicate" && "This receipt was already uploaded."}
                      {result()!.dedup === "replace" &&
                        "A cleaner version replaced your earlier scan."}
                      {result()!.dedup === "keep" && "We kept your earlier, cleaner scan."}
                    </p>
                  )}
                </>
              ) : (
                <p class="font-medium text-red-700">
                  {result()!.reason === "sign-in-required" && "You need to sign in first."}
                  {result()!.reason === "invalid-image" && "Please upload a JPEG or PNG image."}
                  {result()!.reason === "ocr-failed" &&
                    "We couldn't read that receipt. Please try a clearer photo."}
                </p>
              )}
            </div>
          )}
        </main>
      </Show>
    </Show>
  );
}
