# Claimflow

Garantieclaimregister van Medipoint Meppel — gebouwd vanaf nul volgens het goedgekeurde Claimflow-concept.

**Stack:** Vite · React 18 · TypeScript (strict) · React Router · plain CSS met design tokens · pdf.js voor LGAR-pdf's.
Data via Supabase REST (zelfde tabel `claims` als het huidige register).

```bash
npm install
npm run dev        # lokaal ontwikkelen
npm run build      # typecheck + productie-build in dist/
npm run preview    # build lokaal bekijken
```

## Structuur

| Map | Inhoud |
| --- | --- |
| `src/lib` | Pure logica: types, config, opmaak, claimregels, Supabase-client, LGAR-lezer, export (CSV/agenda), e-mail |
| `src/state` | `StoreProvider` (sessie, data, acties met ongedaan maken) en `ToastProvider` |
| `src/components` | Layout (zijbalk / tabbalk), Splash, ClaimLijst (tabel + kaarten), ClaimForm, TermRing, UI-bouwstenen, iconen |
| `src/pages` | Login, Vandaag, Claims, Claimdetail, Bewerken, Nieuwe claim, Leveranciers (+ detail), Rapportage, Beheer, Prullenbak |
| `src/styles` | `tokens.css` (kleuren, fonts, maten) → `base.css` → `components.css` → `pages.css` |

Breekpunten: telefoon < 760px (kaarten + tabbalk), tablet 760–1023px (tabellen + tabbalk), computer ≥ 1024px (zijbalk).
Netlify: `public/_redirects` regelt de SPA-routes.

## Beveiliging en back-ups

De browser praat nooit rechtstreeks met de database. Alles loopt via `/.netlify/functions/data`:

- **Eigen accounts**: iedereen maakt een account met naam + eigen wachtwoord. Daarvoor is één keer de vestigingscode nodig (het oude gedeelde wachtwoord). Wachtwoorden staan alleen als gezouten scrypt-hash in de database (rijen `_gebruiker:`); niemand kan ze teruglezen.
- **Inloggen**: naam + wachtwoord worden op de server gecontroleerd (`netlify/lib/toegang.ts`); de app krijgt een ondertekende pas (30 dagen). Blokkeren, een reset of een nieuw wachtwoord maakt alle passen van dat account ongeldig.
- **Rollen**: per account *Wijzigen* of *Alleen kijken*, in te stellen in Beheer → Gebruikers. Er blijft altijd minstens één beheerder. Met `BEHEER_HASH` gezet krijgen nieuwe accounts met de gewone code alleen leesrechten.
- **Wachtwoord vergeten**: de beheerder staat in Beheer een nieuw wachtwoord toe; daarna kiest de persoon zelf een nieuw wachtwoord met de vestigingscode.
- **Meldingen op je telefoon** (Web Push): aan te zetten in Beheer, per apparaat. `netlify/functions/meldingen.ts` meldt elke ochtend claims die die dag over de termijn gaan; beheerders krijgen ook een melding bij een nieuw account. iPhone: alleen vanaf het beginscherm. De VAPID-sleutels worden afgeleid van de sleutel voor de inlogpassen.
- **Back-ups**: `netlify/functions/backup.ts` draait elke nacht en bewaart 30 dagen in Netlify Blobs (reserve: rijen `_backup:` in de tabel). Terugzetten kan in Beheer.

Omgevingsvariabelen in Netlify (Site configuration → Environment variables):

| Naam | Nodig | Waarvoor |
| --- | --- | --- |
| `TOKEN_GEHEIM` | ja | Ondertekent de toegangspassen (willekeurig, minstens 32 tekens) |
| `SUPABASE_SERVICE_KEY` | sterk aangeraden | Service-sleutel uit Supabase → Project Settings → API. Daarna `supabase-afschermen.sql` uitvoeren |
| `RESEND_API_KEY` | optioneel | Betrouwbare mail via Resend; zonder valt hij terug op FormSubmit |
| `WACHTWOORD_HASH`, `BEHEER_HASH` | optioneel | sha256(code + "medipoint-meppel"): de vestigingscode(s) waarmee accounts worden aangemaakt |
