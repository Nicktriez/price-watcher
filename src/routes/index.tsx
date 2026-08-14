import { createAsync } from "@solidjs/router";
import { Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";

// Minimal landing — Task 037 (landing page) fills this in properly.
export default function Home() {
  const user = createAsync(() => getCurrentUser());

  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <section class="rounded border border-sky-200 bg-sky-50 p-6 text-center">
        <h1 class="text-3xl font-semibold">Sku' jeg?</h1>
        <p class="mx-auto mt-2 max-w-xl text-gray-700">
          Skal jeg købe det her? Sku' jeg finder ud af, om prisen er god — og hvor du skal handle i
          dag.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <Show
            when={user()}
            fallback={
              <a href="/signin" class="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white">
                Log ind
              </a>
            }
          >
            <a href="/lists" class="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white">
              Opret indkøbsliste
            </a>
            <a href="/upload" class="rounded bg-white px-4 py-2 text-sm font-medium text-sky-700">
              Upload kvittering
            </a>
          </Show>
          <a href="/offers" class="rounded bg-white px-4 py-2 text-sm font-medium text-sky-700">
            Se ugens tilbud
          </a>
        </div>
      </section>

      <section class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded border border-gray-200 p-3 text-sm">
          <p class="font-medium">1. Opret din indkøbsliste</p>
          <p class="text-gray-600">Vælg varer — hurtigst fra en skabelon eller et tilbud.</p>
        </div>
        <div class="rounded border border-gray-200 p-3 text-sm">
          <p class="font-medium">2. Sammenlign priser</p>
          <p class="text-gray-600">Se hvilken butik der er billigst, inkl. køretur og brændstof.</p>
        </div>
        <div class="rounded border border-gray-200 p-3 text-sm">
          <p class="font-medium">3. Bidrag med kvitteringer</p>
          <p class="text-gray-600">Upload en kvittering og hjælp andre med rigtige priser.</p>
        </div>
      </section>
    </main>
  );
}
