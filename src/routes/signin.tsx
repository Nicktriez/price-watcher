import { createAsync, useNavigate, useSearchParams } from "@solidjs/router";
import { Show } from "solid-js";
import { getCurrentUser, requestLoginCode, verifyLoginCode } from "~/server/auth";

export default function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = createAsync(() => getCurrentUser());

  const email = () => (typeof params.email === "string" ? params.email : "");
  const step = () => (typeof params.step === "string" && params.step === "code" ? "code" : "email");

  const handleRequest = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const raw = data.get("email");
    const value = typeof raw === "string" ? raw : "";
    await requestLoginCode(value);
    navigate(`/signin?step=code&email=${encodeURIComponent(value.trim())}`);
  };

  const handleVerify = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const raw = data.get("code");
    const code = typeof raw === "string" ? raw : "";
    const result = await verifyLoginCode(email(), code);
    if (result.ok) {
      navigate("/");
    } else {
      window.alert("Ugyldig eller udløbet kode. Prøv igen.");
    }
  };

  return (
    <main class="mx-auto max-w-md p-4 text-gray-900">
      <h1 class="mb-4 text-2xl font-semibold">Log ind</h1>

      <Show
        when={user()}
        fallback={<p class="mb-4 text-sm text-gray-600">Du er ikke logget ind.</p>}
      >
        {(u) => <p class="mb-4 text-sm text-gray-600">Logget ind som {u().email}</p>}
      </Show>

      <Show
        when={step() === "code"}
        fallback={
          <form onSubmit={handleRequest} class="space-y-3">
            <div>
              <label for="email" class="mb-1 block text-sm text-gray-600">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
              Send login-kode
            </button>
          </form>
        }
      >
        <p class="mb-3 text-sm text-gray-600">
          Indtast den 6-cifrede kode sendt til {email()} (i udvikling logges den i serverkonsollen).
        </p>
        <form onSubmit={handleVerify} class="space-y-3">
          <div>
            <label for="code" class="mb-1 block text-sm text-gray-600">
              Kode
            </label>
            <input
              type="text"
              name="code"
              id="code"
              inputmode="numeric"
              pattern="[0-9]{6}"
              required
              class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
            Log ind
          </button>
        </form>
      </Show>
    </main>
  );
}
