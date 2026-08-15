import { A } from "@solidjs/router";

// Privacy policy — draft by OpenCode from actual code behavior. NICK MUST
// APPROVE the final text (human gate, Task 038) before beta invites.
export default function Privacy() {
  return (
    <main class="mx-auto max-w-3xl p-4 text-gray-900">
      <p class="mb-3 text-sm">
        <A href="/" class="text-sky-700 hover:underline">
          ← Forside
        </A>
      </p>
      <h1 class="mb-1 text-2xl font-semibold">Privatlivspolitik</h1>
      <p class="mb-6 text-sm text-gray-500">Sidst opdateret: 14. august 2026</p>

      <section class="space-y-4 text-sm leading-relaxed text-gray-700">
        <div>
          <h2 class="mb-1 text-base font-semibold text-gray-900">Hvem er vi?</h2>
          <p>
            Sku' jeg? er en dansk prissammenligning for dagligvarer. Du kan kontakte os vedrørende
            dine data på{" "}
            <a href="mailto:jensen0710@gmail.com" class="text-sky-700 underline">
              jensen0710@gmail.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 class="mb-1 text-base font-semibold text-gray-900">
            Hvilke data indsamler vi, og hvorfor?
          </h2>
          <ul class="list-inside list-disc space-y-1">
            <li>
              <span class="font-medium">Passkey</span> — log ind sker med en passkey
              (sikkerhedsnøgle på din enhed). Vi sender dig ikke længere en login-kode pr. e-mail.
            </li>
            <li>
              <span class="font-medium">Kvitteringsbilleder</span> — når du uploader en kvittering,
              læser vi varerne og priserne op. Billedet{" "}
              <span class="font-medium">slettes umiddelbart efter behandling</span> og vises aldrig
              andre steder.
            </li>
            <li>
              <span class="font-medium">Hjemmeadresse</span> — kun til at beregne køreafstand til
              butikkerne. Adressen vises aldrig offentligt og deles aldrig.
            </li>
            <li>
              <span class="font-medium">Bilprofil</span> (brændstoftype og -forbrug) — kun til at
              beregne køreomkostninger.
            </li>
            <li>
              <span class="font-medium">Det du selv opretter</span> — indkøbslister, rapporterede
              priser og point knyttes til din konto, så vi kan levere funktionerne.
            </li>
          </ul>
        </div>

        <div>
          <h2 class="mb-1 text-base font-semibold text-gray-900">Cookies</h2>
          <p>
            Vi sætter kun en nødvendig sessions-cookie (<span class="font-medium">pw-session</span>)
            for at holde dig logget ind; vi bruger ingen sporings- eller analyse-cookies.
          </p>
          <p class="mt-1">
            Da sessions-cookien er strengt nødvendig for funktionen, kræver den ikke samtykke efter
            cookiebekendtgørelsen. Skulle vi på et tidspunkt tilføje cookies til statistik, annoncer
            eller affiliate-sporing, opdaterer vi denne side og indhenter samtykke, før de sættes.
          </p>
        </div>

        <div>
          <h2 class="mb-1 text-base font-semibold text-gray-900">
            Hvor længe gemmer vi dine data?
          </h2>
          <ul class="list-inside list-disc space-y-1">
            <li>Kvitteringsbilleder slettes umiddelbart efter behandling.</li>
            <li>
              E-mail og det du opretter på kontoen gemmes, så længe din konto findes. Du kan altid
              bede om at få dine data slettet.
            </li>
          </ul>
        </div>

        <div>
          <h2 class="mb-1 text-base font-semibold text-gray-900">Deling og videresalg</h2>
          <p>
            Vi sælger aldrig dine data. Kvitteringsbilleder vises aldrig, og din adresse bruges kun
            til afstandsberegning.
          </p>
        </div>

        <div>
          <h2 class="mb-1 text-base font-semibold text-gray-900">Dine rettigheder</h2>
          <p>
            Efter databeskyttelsesforordningen (GDPR) har du ret til indsigt i, berigtigelse af og
            sletning af dine data, samt ret til at få dine data udleveret (dataportabilitet). Skriv
            til{" "}
            <a href="mailto:jensen0710@gmail.com" class="text-sky-700 underline">
              jensen0710@gmail.com
            </a>{" "}
            hvis du vil gøre brug af dine rettigheder.
          </p>
        </div>
      </section>
    </main>
  );
}
