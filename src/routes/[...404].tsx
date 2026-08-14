import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <main class="mx-auto max-w-3xl p-4 text-center text-gray-700">
      <h1 class="my-8 text-4xl font-semibold text-sky-700">Siden findes ikke</h1>
      <p class="mt-4">Det ser ud til, at siden du ledte efter ikke findes (eller er flyttet).</p>
      <p class="my-6 space-x-4">
        <A href="/offers" class="text-sky-600 hover:underline">
          → Gå til ugens tilbud
        </A>
        <A href="/" class="text-sky-600 hover:underline">
          → Forside
        </A>
      </p>
    </main>
  );
}
