import { A } from "@solidjs/router";

export default function Footer() {
  return (
    <footer class="mt-8 border-t border-gray-200 bg-gray-50">
      <div class="container mx-auto flex flex-col items-center justify-between gap-3 p-4 text-sm text-gray-600 sm:flex-row">
        <p class="text-xs text-gray-400">Sku' jeg? — hvor skal jeg handle i dag?</p>
        <nav class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <A href="/offers" class="hover:underline">
            Tilbud
          </A>
          <A href="/madplan" class="hover:underline">
            Madplan
          </A>
          <A href="/spending" class="hover:underline">
            Forbrug
          </A>
          <A href="/reported-items" class="hover:underline">
            Rapporterede varer
          </A>
          <A href="/leaderboard" class="hover:underline">
            Topbrugerne
          </A>
          <A href="/settings" class="hover:underline">
            Indstillinger
          </A>
          <A href="/about" class="hover:underline">
            Om
          </A>
        </nav>
      </div>
    </footer>
  );
}
