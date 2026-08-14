import { createAsync, Navigate } from "@solidjs/router";
import { Show } from "solid-js";
import { getCurrentUser } from "~/server/auth";

// Landing page for first-time (signed-out) visitors. Signed-in users are
// rerouted straight to /offers (Task 037).
export default function Home() {
  const user = createAsync(() => getCurrentUser());

  return (
    <Show
      when={user() !== undefined}
      fallback={<main class="mx-auto max-w-3xl p-4 text-gray-900" />}
    >
      <Show
        when={user()}
        fallback={
          <main class="mx-auto max-w-3xl p-4 text-gray-900">
            <section class="rounded border border-sky-200 bg-sky-50 p-8 text-center">
              <p class="text-sm font-medium uppercase tracking-wide text-sky-700">Sku' jeg?</p>
              <h1 class="mt-2 text-3xl font-semibold">Skal jeg købe det her?</h1>
              <p class="mx-auto mt-3 max-w-xl text-gray-700">
                Sku' jeg? fortæller dig, om prisen er god, og hvor du skal handle i dag — med ugens
                tilbud, din egen indkøbsliste og rigtige priser fra andre brugere.
              </p>
              <div class="mt-6 flex flex-wrap justify-center gap-2">
                <a
                  href="/signin"
                  class="rounded bg-sky-600 px-6 py-2 text-sm font-medium text-white"
                >
                  Log ind og kom i gang
                </a>
                <a
                  href="/offers"
                  class="rounded bg-white px-6 py-2 text-sm font-medium text-sky-700"
                >
                  Se ugens tilbud
                </a>
              </div>
              <p class="mt-3 text-xs text-gray-500">
                Log ind med din e-mail — så får du en kode til at komme i gang.
              </p>
            </section>

            <section class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="rounded border border-gray-200 p-4 text-sm">
                <p class="font-medium">Ugens tilbud</p>
                <p class="mt-1 text-gray-600">
                  De aktuelle tilbud fra butikkerne, samlet ét sted og filtreret på kæde.
                </p>
              </div>
              <div class="rounded border border-gray-200 p-4 text-sm">
                <p class="font-medium">Din indkøbsliste</p>
                <p class="mt-1 text-gray-600">
                  Byg listen, og se hvilken butik der er billigst — inkl. køretur og brændstof.
                </p>
              </div>
              <div class="rounded border border-gray-200 p-4 text-sm">
                <p class="font-medium">Rigtige priser</p>
                <p class="mt-1 text-gray-600">
                  Kvitteringer og rapporterede hyldepriser fra andre brugere — så du ved, hvad varer
                  faktisk koster.
                </p>
              </div>
            </section>

            <section class="mt-6 rounded border border-gray-200 p-4 text-sm">
              <p class="font-medium">Sådan virker det</p>
              <ol class="mt-2 list-inside list-decimal space-y-1 text-gray-600">
                <li>Log ind med din e-mail.</li>
                <li>Opret din indkøbsliste — hurtigst fra en skabelon eller et tilbud.</li>
                <li>Sammenlign priser på tværs af butikker og se, hvor du skal handle.</li>
                <li>Upload en kvittering og hjælp andre med rigtige priser.</li>
              </ol>
            </section>
          </main>
        }
      >
        <Navigate href="/offers" />
      </Show>
    </Show>
  );
}
