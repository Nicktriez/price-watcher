import { createAsync, useLocation, useNavigate } from "@solidjs/router";
import { createSignal, Show, Suspense } from "solid-js";
import { getCurrentUser, signOut } from "~/server/auth";

// Real launch nav (supersedes the 033/034 dev links: settings/madplan/spending
// moved to the footer). Task 036.
//
// Note: "Forside" points at / (the landing). Signed-in users are rerouted to
// /offers by the landing itself (Task 037) — reading the session outside a
// Suspense boundary doesn't update reactively in SolidStart 2.0, so the href
// can't be made session-conditional without a full nav re-render.
export default function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authVersion, setAuthVersion] = createSignal(0);
  const user = createAsync(() => {
    void authVersion();
    void location.pathname; // re-fetch the session when the route changes (post login)
    return getCurrentUser();
  });
  const active = (path: string) =>
    path == location.pathname ? "border-sky-600" : "border-transparent hover:border-sky-600";

  const handleSignOut = async (e: Event) => {
    e.preventDefault();
    await signOut();
    setAuthVersion((v) => v + 1);
    navigate("/");
  };

  return (
    <nav class="bg-sky-800">
      <ul class="container flex items-center p-3 text-gray-200">
        <li class={`border-b-2 ${active("/")} mx-1.5 sm:mx-6`}>
          <a href="/">Forside</a>
        </li>
        <li class={`border-b-2 ${active("/offers")} mx-1.5 sm:mx-6`}>
          <a href="/offers">Tilbud</a>
        </li>
        <li class={`border-b-2 ${active("/lists")} mx-1.5 sm:mx-6`}>
          <a href="/lists">Lister</a>
        </li>
        <li class={`border-b-2 ${active("/upload")} mx-1.5 sm:mx-6`}>
          <a href="/upload">Upload kvittering</a>
        </li>
        <li class={`border-b-2 ${active("/report")} mx-1.5 sm:mx-6`}>
          <a href="/report">Rapporter en pris</a>
        </li>
        <li class={`border-b-2 ${active("/about")} mx-1.5 sm:mx-6`}>
          <a href="/about">Om</a>
        </li>
        <li class="ml-auto mx-1.5 sm:mx-6">
          <Suspense fallback={null}>
            <Show when={user() !== undefined}>
              <Show
                when={user()}
                fallback={
                  <a href="/signin" class="hover:underline">
                    Log ind
                  </a>
                }
              >
                <a href="#" onClick={handleSignOut} class="hover:underline">
                  Log ud
                </a>
              </Show>
            </Show>
          </Suspense>
        </li>
      </ul>
    </nav>
  );
}
