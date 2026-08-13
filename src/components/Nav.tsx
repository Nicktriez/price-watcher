import { createAsync, useLocation, useNavigate } from "@solidjs/router";
import { createSignal, Show, Suspense } from "solid-js";
import { getCurrentUser, signOut } from "~/server/auth";

// TEMP: dev links — remove before launch (Phase 8)
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
          <a href="/">Home</a>
        </li>
        <li class={`border-b-2 ${active("/about")} mx-1.5 sm:mx-6`}>
          <a href="/about">About</a>
        </li>
        <li class={`border-b-2 ${active("/lists")} mx-1.5 sm:mx-6`}>
          <a href="/lists">Lists</a>
        </li>
        <li class={`border-b-2 ${active("/settings")} mx-1.5 sm:mx-6`}>
          <a href="/settings">Settings</a>
        </li>
        <li class={`border-b-2 ${active("/madplan")} mx-1.5 sm:mx-6`}>
          <a href="/madplan">Madplan</a>
        </li>
        <li class={`border-b-2 ${active("/spending")} mx-1.5 sm:mx-6`}>
          <a href="/spending">Spending</a>
        </li>
        <li class="ml-auto mx-1.5 sm:mx-6">
          <Suspense fallback={null}>
            <Show when={user() !== undefined}>
              <Show
                when={user()}
                fallback={
                  <a href="/signin" class="hover:underline">
                    Sign in
                  </a>
                }
              >
                <a href="#" onClick={handleSignOut} class="hover:underline">
                  Sign out
                </a>
              </Show>
            </Show>
          </Suspense>
        </li>
      </ul>
    </nav>
  );
}
