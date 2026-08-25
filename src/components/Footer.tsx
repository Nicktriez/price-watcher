export default function Footer() {
  return (
    <footer class="mt-8 border-t border-gray-200 bg-gray-50">
      <div class="container mx-auto flex flex-col items-center justify-between gap-3 p-4 text-sm text-gray-600 sm:flex-row">
        <p class="text-xs text-gray-400">Sku' jeg? — hvor skal jeg handle i dag?</p>
        <nav class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="/offers" class="hover:underline">
            Tilbud
          </a>
          <a href="/madplan" class="hover:underline">
            Madplan
          </a>
          <a href="/spending" class="hover:underline">
            Forbrug
          </a>
          <a href="/reported-items" class="hover:underline">
            Rapporterede varer
          </a>
          <a href="/leaderboard" class="hover:underline">
            Topbrugerne
          </a>
          <a href="/settings" class="hover:underline">
            Indstillinger
          </a>
          <a href="/privacy" class="hover:underline">
            Privatliv
          </a>
          <a href="/about" class="hover:underline">
            Om
          </a>
        </nav>
      </div>
    </footer>
  );
}
