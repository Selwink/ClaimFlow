-- =====================================================================
-- ClaimFlow — tabel voor een NIEUW Supabase-project (verhuizing)
-- Supabase → je nieuwe project → SQL Editor → New query → plak dit → Run.
--
-- Alles staat in één tabel "claims": de claims zelf, en rijen met een id
-- die met _ begint voor instellingen, accounts, foto's en meldingen.
-- Row level security staat aan zonder regels: alleen de ClaimFlow-functie
-- (met de service-sleutel die Supabase zelf geeft) kan erbij.
-- =====================================================================

create table if not exists public.claims (
  id             text primary key,
  nummer         text,
  onderdeel      text,
  voorziening    text,
  type           text,
  frame          text,
  storing        text,
  inkoopnummer   text,
  leverancier    text,
  aankoop        text,
  bouwjaar       text,
  bedrag         numeric,
  datum          text,
  periode        text,
  status         text,
  locatie        text,
  uitbesteed     boolean default false,
  bijzonderheden text,
  notities       jsonb default '[]'::jsonb,
  bijgewerkt     text,
  verwijderd     text
);

alter table public.claims enable row level security;
