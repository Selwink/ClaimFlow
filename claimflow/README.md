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
