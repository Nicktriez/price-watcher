export default function About() {
  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <h1 class="mb-4 text-2xl font-semibold">Om Sku' jeg?</h1>
      <p class="mb-4 text-gray-700">
        Sku' jeg? er en dansk prissammenligning for dagligvarer. Formålet er ét spørgsmål:{" "}
        <span class="font-medium">skal jeg købe det her?</span>
      </p>

      <section class="space-y-3 text-sm text-gray-700">
        <div class="rounded border border-gray-200 p-3">
          <p class="font-medium">Ugens tilbud</p>
          <p>
            Vi samler de aktuelle tilbud fra butikkerne, så du hurtigt kan se, hvad der er på
            tilbud, og hvor.
          </p>
        </div>
        <div class="rounded border border-gray-200 p-3">
          <p class="font-medium">Din indkøbsliste</p>
          <p>
            Byg din liste og sammenlign butikkerne — vi medregner endda køretur og brændstof, så
            "det billigste" betyder det, der faktisk er billigst for dig.
          </p>
        </div>
        <div class="rounded border border-gray-200 p-3">
          <p class="font-medium">Ærlige priser</p>
          <p>
            Brugerrapporterede priser vises altid ærligt — en enkelt rapport er markeret som
            "brugerrapporteret", og først når flere uafhængige brugere er enige, bliver den en
            fællesskabspris. Vi kalder aldrig en brugerpris for en rabat.
          </p>
        </div>
      </section>

      <p class="mt-6">
        <a href="/offers" class="text-sky-700 hover:underline">
          → Se ugens tilbud
        </a>
      </p>
    </main>
  );
}
