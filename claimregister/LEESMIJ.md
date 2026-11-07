# Garantieclaims Medipoint — versie 2

Het claimregister bestaat uit één bestand: `index.html`. Het gebruikt dezelfde Supabase-tabel `claims` als versie 1. Alle bestaande claims, notities en instellingen blijven dus gewoon staan.

## Online zetten op Netlify

1. Ga in Netlify naar je site **selwin** → **Deploys**.
2. Sleep de map `claimregister` in het vak *Drag and drop your site output folder here*.
3. Klaar. Het wachtwoord blijft hetzelfde, en wie al was ingelogd blijft ingelogd.

Het bestand `_headers` zorgt dat zoekmachines de site niet opnemen en dat de site niet in een andere website kan worden ingesloten.

## Eenmalig in Supabase (aangeraden)

Open in Supabase **SQL Editor** → **New query**, plak **deel 1** uit `supabase-beveiliging.sql` en klik **Run**. Dat zorgt dat de tabel alle velden heeft. De app werkt ook zonder, maar slaat dan een veld dat de tabel niet kent gewoon over (je krijgt daar een melding van).

## Wat er nieuw is

- **Rapportage**: honoreringsgraad, gemiddelde doorlooptijd, een grafiek per maand (ook als tabel), cijfers per leverancier, onderdelen die vaker terugkomen, en binnen- tegenover buitenmonteur.
- **Tijdlijn** per claim: statuswijzigingen worden automatisch met datum vastgelegd.
- **Vereist aandacht**: een tabblad met de claims die over de termijn zijn.
- **Selecteren**: meerdere claims tegelijk op ingediend, gehonoreerd of afgewezen zetten, of naar de prullenbak verplaatsen.
- **Rappel**: een kant-en-klare e-mail per leverancier met alle openstaande claims.
- **Ongedaan maken**, een waarschuwing bij een **dubbele claim**, **dupliceren**, filteren op **leverancier**, **back-up** downloaden en terugzetten, **afdrukken**, een **donker thema** en **sneltoetsen**.

## Beveiliging

In versie 1 stonden het wachtwoord en een kopie van alle claims leesbaar in de pagina. Dat is in versie 2 weg.

Let wel: de Supabase-sleutel staat nog steeds in de pagina, want de app heeft die nodig. Zolang de tabel open staat, kan iemand die de paginabron leest de claims dus nog opvragen. Echt afschermen gaat zo:

### Eigen accounts (echte beveiliging)

1. **Supabase → Authentication → Users → Add user → Create new user.** Maak een account aan voor iedere collega, of één gedeeld account (bijvoorbeeld `meppel@…`). Vink *Auto Confirm User* aan.
2. **Supabase → Authentication → Sign In / Providers → Email.** Zet **Allow new users to sign up** **uit**. Anders kan iedereen zelf een account maken.
3. Zet in `index.html`, bovenaan bij `CONFIG`, `ACCOUNTS: false` op **`ACCOUNTS: true`**.
4. Zet de nieuwe `index.html` online (zie hierboven) en controleer of je kunt inloggen.
5. Draai daarna **deel 2** uit `supabase-beveiliging.sql` (haal eerst de `--` weg voor die regels).

Vanaf dan kan alleen iemand die is ingelogd de claims zien of wijzigen. Uitloggen staat in het Menu.

### Wachtwoord wijzigen (zonder accounts)

Ga naar Menu → **Instellingen** en typ bij *Wachtwoord-hash maken* het nieuwe wachtwoord. Zet de code die verschijnt in `index.html` bij `WACHTWOORD_HASH` en zet het bestand opnieuw online.
