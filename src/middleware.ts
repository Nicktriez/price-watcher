// The server middleware chain (wired via `start.middleware` in
// vite.config.ts): fetch-style functions fronting every request the server
// dispatches — page renders and server-function calls alike. Each run is
// inside the request-event scope, so getRequestEvent() works here exactly as
// in application code.
//
// Three jobs:
// 1. Module scope boots the background workers once per process (the old
//    entry-server side effects).
// 2. Auth gate: direct requests to member-only pages get a real 302 to
//    /signin when the session cookie is missing/invalid. (The old SolidStart
//    <Navigate> gates folded into server-side redirects; under start mode a
//    redirect can only fold before the SSR shell flushes, so the check lives
//    here, ahead of dispatch. Client-side navigations are still covered by
//    the <Redirect> fallbacks inside each gated page.) Server functions keep
//    checking the session themselves — this list only guards page loads.
// 3. Unknown URLs answer 404, not 200. The [...404] route declares
//    httpStatus(404), but its chunk loads lazily: on a cold process the
//    shell can flush (committing a 200 head) before the component body
//    runs. So after dispatch, rewrite the status when nothing but the
//    catch-all matched the URL.
import "./server/bootstrap";
import { getSession } from "~/server/session";
import { pageRoutes } from "virtual:file-routes";

const PROTECTED_PREFIXES = [
  "/lists",
  "/receipts",
  "/compare",
  "/settings",
  "/spending",
  "/upload",
  "/report",
  "/madplan",
  "/admin",
  "/reported-items",
];

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

const requireAuth: (
  request: Request,
  next: (request?: Request) => Response | Promise<Response>,
) => Response | Promise<Response> = async (request, next) => {
  const { pathname } = new URL(request.url);
  if (!isProtected(pathname)) return next();
  const session = await getSession();
  if (session?.userId) return next();
  return new Response(null, {
    status: 302,
    headers: { Location: "/signin" },
  });
};

// --- 404 detection -------------------------------------------------------
// Compile one matcher per real route from the file-routes manifest (static
// data — no lazy modules involved). Catch-all patterns are skipped: they
// match everything, which is exactly what we test for.

interface ManifestEntry {
  path?: string;
  children?: ManifestEntry[];
}

function patternToMatcher(pattern: string): RegExp | null {
  // Trailing catch-all segment ("*404") matches anything — exclude it.
  if (/\/\*[^/]*$/.test(pattern)) return null;
  const segments = pattern.split("/").filter(Boolean);
  const body = segments
    .map((segment) =>
      segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  // Optional trailing slash; "/" alone stays exact.
  return new RegExp(body ? `^/${body}/?$` : "^/$");
}

const realRouteMatchers: RegExp[] = (() => {
  const matchers: RegExp[] = [];
  const visit = (entries: ManifestEntry[] | undefined) => {
    for (const entry of entries ?? []) {
      if (entry.path) {
        const matcher = patternToMatcher(entry.path);
        if (matcher) matchers.push(matcher);
      }
      visit(entry.children);
    }
  };
  visit(pageRoutes as ManifestEntry[]);
  return matchers;
})();

const isUnknownUrl = (pathname: string) =>
  realRouteMatchers.every((matcher) => !matcher.test(pathname));

const markNotFound: (
  request: Request,
  next: (request?: Request) => Response | Promise<Response>,
) => Response | Promise<Response> = async (request, next) => {
  const response = await next(request);
  const accept = request.headers.get("accept") ?? "";
  if (request.method !== "GET" || !accept.includes("text/html")) {
    return response;
  }
  if (response.status !== 200) return response;
  const { pathname } = new URL(request.url);
  if (!isUnknownUrl(pathname)) return response;
  return new Response(response.body, {
    status: 404,
    statusText: "Not Found",
    headers: response.headers,
  });
};

export default [requireAuth, markNotFound];
