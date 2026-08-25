import { useNavigate } from "@solidjs/router";
import { createSignal, Show, createMemo } from "solid-js";
import {
  startAuthentication as browserStartAuthentication,
  startRegistration as browserStartRegistration,
} from "@simplewebauthn/browser";
import {
  getCurrentUser,
  startAuthentication,
  startRegistration,
  finishAuthentication,
  finishRegistration,
} from "~/server/auth";

export default function SignIn() {
  const navigate = useNavigate();
  const user = createMemo(() => getCurrentUser());
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleLogin = async () => {
    if (busy()) return;
    setBusy(true);
    setError(null);
    try {
      const { options } = await startAuthentication();
      const assertion = await browserStartAuthentication({ optionsJSON: options });
      const result = await finishAuthentication(assertion);
      if (result.ok) {
        navigate("/");
      } else {
        setError("Kunne ikke logge dig ind. Prøv igen.");
      }
    } catch (e) {
      // NotAllowedError / AbortError = the user cancelled the passkey prompt.
      if (e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError")) {
        setError(null);
      } else {
        setError("Kunne ikke logge dig ind. Prøv igen.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (busy()) return;
    setBusy(true);
    setError(null);
    try {
      const { options } = await startRegistration();
      const attestation = await browserStartRegistration({ optionsJSON: options });
      const result = await finishRegistration(attestation);
      if (result.ok) {
        navigate("/");
      } else {
        setError("Kunne ikke oprette din konto. Prøv igen.");
      }
    } catch (e) {
      if (e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError")) {
        setError(null);
      } else {
        setError("Kunne ikke oprette din konto. Prøv igen.");
      }
    } finally {
      setBusy(false);
    }
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
            <h1 class="mb-4 text-2xl font-semibold">Log ind</h1>
            <p class="mb-6 text-sm text-gray-600">
              Du logger ind med en passkey — en sikkerhedsnøgle på din enhed (finger, ansigt, PIN
              eller nøgle). Vi sender ikke længere login-koder pr. e-mail.
            </p>

            <div class="space-y-3">
              <button
                type="button"
                disabled={busy()}
                onClick={handleLogin}
                class="w-full rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy() ? "Vent…" : "Log ind med passkey"}
              </button>
              <button
                type="button"
                disabled={busy()}
                onClick={handleRegister}
                class="w-full rounded bg-white px-4 py-2 text-sm font-medium text-sky-700 disabled:opacity-50"
              >
                Opret konto med passkey
              </button>
            </div>

            <Show when={error()}>
              <p class="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error()}
              </p>
            </Show>

            <p class="mt-6 text-xs text-gray-500">
              Passkey virker kun i en sikker forbindelse (https eller localhost). Hvis din enhed
              ikke har en passkey endnu, vælg "Opret konto med passkey" første gang.
            </p>
          </main>
        }
      >
        {(u) => (
          <main class="mx-auto max-w-md p-4 text-gray-900">
            <h1 class="mb-4 text-2xl font-semibold">Du er logget ind</h1>
            <p class="mb-4 text-sm text-gray-600">
              {u().email ? `Logget ind som ${u().email}` : "Du er logget ind med din passkey."}
            </p>
            <a href="/" class="text-sky-700 hover:underline">
              → Gå til forsiden
            </a>
          </main>
        )}
      </Show>
    </Show>
  );
}
