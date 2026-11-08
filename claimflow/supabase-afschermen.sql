-- =====================================================================
-- ClaimFlow Medipoint — database afschermen
-- Voer dit PAS uit nadat SUPABASE_SERVICE_KEY in Netlify staat en de site
-- opnieuw is gepubliceerd (Beheer → Beveiliging toont dan "Zet ... in Netlify" niet meer).
--
-- Supabase → SQL Editor → New query → plak dit → Run.
--
-- Wat het doet: zet row level security aan en verwijdert alle regels.
-- Daardoor kan de oude publieke sleutel niets meer lezen of wijzigen.
-- ClaimFlow werkt gewoon door, want de Netlify-functies gebruiken de service-sleutel,
-- en die negeert deze beveiliging.
-- =====================================================================

alter table public.claims enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'claims' loop
    execute format('drop policy %I on public.claims', r.policyname);
  end loop;
end $$;

-- Terugdraaien (alleen als het echt nodig is):
-- alter table public.claims disable row level security;
