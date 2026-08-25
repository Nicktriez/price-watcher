import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, For, Show, Loading, createMemo } from "solid-js";
import { getCurrentUser, signOut } from "~/server/auth";

// Real launch nav (Task 036) + mobile hamburger (Task 038c).
// Auth pattern (createMemo session, authVersion, Loading + nested Show)
// preserved unchanged — only layout/visibility is restructured.
const LINKS = [
  { href: "/", label: "Forside" },
  { href: "/offers", label: "Tilbud" },
  { href: "/lists", label: "Lister" },
  { href: "/upload", label: "Upload kvittering" },
  { href: "/report", label: "Rapporter en pris" },
  { href: "/about", label: "Om" },
];

export default function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authVersion, setAuthVersion] = createSignal(0);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const user = createMemo(() => {
    void authVersion();
    void location.pathname; // re-fetch the session when the route changes (post login)
    return getCurrentUser();
  });
  const active = (path: string) =>
    path == location.pathname ? "border-sky-600" : "border-transparent hover:border-sky-600";

  // Close the menu on route change and on outside click / Esc.
  // (Solid 2: effects split into a compute phase that tracks and an untracked
  // apply phase that writes; cleanup is returned from apply.)
  createEffect(
    () => location.pathname,
    () => {
      setMenuOpen(false);
    },
  );
  let navRef: HTMLElement | undefined;
  createEffect(
    () => menuOpen(),
    (open) => {
      if (!open) return;
      const onDocClick = (e: MouseEvent) => {
        if (navRef && !navRef.contains(e.target as Node)) setMenuOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMenuOpen(false);
      };
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("click", onDocClick);
        document.removeEventListener("keydown", onKey);
      };
    },
  );

  const handleSignOut = async (e: Event) => {
    e.preventDefault();
    await signOut();
    setAuthVersion((v) => v + 1);
    navigate("/");
  };

  return (
    <nav
      class="bg-sky-800"
      ref={(el) => {
        navRef = el;
      }}
    >
      {/* Mobile header: brand + auth + hamburger toggle */}
      <div class="flex items-center justify-between p-3 text-gray-200 md:hidden">
        <a href="/" class="px-2 py-2 text-sm font-semibold">
          Sku' jeg?
        </a>
        <div class="flex items-center gap-1">
          <Loading fallback={null}>
            <Show when={user() !== undefined}>
              <Show
                when={user()}
                fallback={
                  <a href="/signin" class="rounded bg-sky-600 px-3 py-2 text-sm">
                    Log ind
                  </a>
                }
              >
                <a href="#" onClick={handleSignOut} class="rounded bg-white/10 px-3 py-2 text-sm">
                  Log ud
                </a>
              </Show>
            </Show>
          </Loading>
          <button
            type="button"
            aria-expanded={menuOpen() ? "true" : "false"}
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
            class="px-3 py-2 text-2xl leading-none"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Desktop row (md and up) */}
      <ul class="container hidden items-center p-3 text-gray-200 md:flex">
        <For each={LINKS}>
          {(l) => (
            <li class={`border-b-2 ${active(l.href)} mx-1.5 sm:mx-6`}>
              <a href={l.href}>{l.label}</a>
            </li>
          )}
        </For>
        <li class="ml-auto mx-1.5 sm:mx-6">
          <Loading fallback={null}>
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
          </Loading>
        </li>
      </ul>

      {/* Mobile panel (below md) */}
      <Show when={menuOpen()}>
        <ul class="border-t border-sky-700 bg-sky-800 pb-2 text-gray-200 md:hidden">
          <For each={LINKS}>
            {(l) => (
              <li>
                <a
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  class={`block border-l-4 px-4 py-3 text-sm ${
                    l.href == location.pathname
                      ? "border-sky-500 bg-sky-700/50 font-medium"
                      : "border-transparent"
                  }`}
                >
                  {l.label}
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </nav>
  );
}
