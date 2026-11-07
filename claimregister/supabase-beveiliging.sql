-- =====================================================================
-- Garantieclaims Medipoint — Supabase
-- Plak dit in Supabase: SQL Editor -> New query -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- DEEL 1 — kolommen (altijd veilig, mag vaker gedraaid worden)
-- Zorgt dat alle velden van versie 2 bewaard kunnen worden. Bestaande
-- kolommen en gegevens blijven ongemoeid.
-- ---------------------------------------------------------------------
alter table public.claims add column if not exists nummer         text;
alter table public.claims add column if not exists onderdeel      text;
alter table public.claims add column if not exists voorziening    text;
alter table public.claims add column if not exists type           text;
alter table public.claims add column if not exists frame          text;
alter table public.claims add column if not exists storing        text;
alter table public.claims add column if not exists inkoopnummer   text;
alter table public.claims add column if not exists leverancier    text;
alter table public.claims add column if not exists aankoop        text;
alter table public.claims add column if not exists bouwjaar       text;
alter table public.claims add column if not exists bedrag         numeric;
alter table public.claims add column if not exists datum          text;
alter table public.claims add column if not exists periode        text;
alter table public.claims add column if not exists status         text;
alter table public.claims add column if not exists locatie        text;
alter table public.claims add column if not exists uitbesteed     boolean default false;
alter table public.claims add column if not exists bijzonderheden text;
alter table public.claims add column if not exists notities       jsonb default '[]'::jsonb;
alter table public.claims add column if not exists bijgewerkt     text;
alter table public.claims add column if not exists verwijderd     text;

-- Laat de API de nieuwe kolommen meteen zien.
notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------
-- DEEL 2 — echte beveiliging met eigen accounts
-- Draai dit PAS als je in index.html  ACCOUNTS: true  hebt gezet en de
-- accounts hebt aangemaakt (zie LEESMIJ.md, stap 'Eigen accounts').
-- Daarna kan alleen iemand die is ingelogd de claims lezen of wijzigen;
-- de sleutel in de pagina alleen is dan niet meer genoeg.
-- Haal de twee streepjes (--) voor elke regel hieronder weg om te draaien.
-- ---------------------------------------------------------------------

-- alter table public.claims enable row level security;
--
-- do $$
-- declare r record;
-- begin
--   for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'claims' loop
--     execute format('drop policy %I on public.claims', r.policyname);
--   end loop;
-- end $$;
--
-- create policy "ingelogd lezen"      on public.claims for select to authenticated using (true);
-- create policy "ingelogd toevoegen"  on public.claims for insert to authenticated with check (true);
-- create policy "ingelogd wijzigen"   on public.claims for update to authenticated using (true) with check (true);
-- create policy "ingelogd verwijderen" on public.claims for delete to authenticated using (true);


-- ---------------------------------------------------------------------
-- TERUGDRAAIEN van deel 2 (alleen als je terug wilt naar één gedeeld
-- wachtwoord zonder accounts; dan is de tabel weer open voor de sleutel)
-- ---------------------------------------------------------------------
-- create policy "open voor de app" on public.claims for all to anon using (true) with check (true);
