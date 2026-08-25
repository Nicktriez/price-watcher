import { httpStatus } from "@solidjs/web";

export default function NotFound() {
  // This catch-all only matches URLs nothing else handled: the response must
  // say 404, not 200. Server-only declaration — a no-op in the client build.
  httpStatus(404, "Not Found");
  return (
    <main class="mx-auto max-w-3xl p-4 text-center text-gray-700">
      <h1 class="my-8 text-4xl font-semibold text-sky-700">Siden findes ikke</h1>
      <p class="mt-4">Det ser ud til, at siden du ledte efter ikke findes (eller er flyttet).</p>
      <p class="my-6 space-x-4">
        <a href="/offers" class="text-sky-600 hover:underline">
          → Gå til ugens tilbud
        </a>
        <a href="/" class="text-sky-600 hover:underline">
          → Forside
        </a>
      </p>
    </main>
  );
}
