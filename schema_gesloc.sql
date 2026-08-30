-- ============================================================
-- GesLoc — Schéma de base de données
-- À exécuter dans Supabase : SQL Editor > New query > Run
-- ============================================================

-- Extension nécessaire pour générer des UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Table Logements
-- (Le "propriétaire" est directement l'utilisateur authentifié
--  via Supabase Auth : pas besoin d'une table proprietaires à
--  part, auth.users la remplace déjà)
-- ============================================================
create table if not exists logements (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  adresse text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. Table Locataires
-- ============================================================
create table if not exists locataires (
  id uuid primary key default gen_random_uuid(),
  logement_id uuid not null references logements(id) on delete restrict,
  nom text not null,
  telephone text,
  loyer_mensuel_du numeric not null check (loyer_mensuel_du > 0),
  date_entree date not null default current_date,
  date_echeance int check (date_echeance between 1 and 28), -- jour du mois
  rappels_actifs boolean not null default true, -- rappels automatiques SMS/WhatsApp (hors MVP, colonne prévue à l'avance)
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. Table Paiements
-- ============================================================
create table if not exists paiements (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references locataires(id) on delete cascade,
  montant numeric not null check (montant > 0),
  date_paiement date not null default current_date,
  mois_concerne date not null, -- ex: 2026-08-01 pour représenter le mois d'août 2026
  created_at timestamptz not null default now()
);

-- ============================================================
-- Index utiles pour accélérer les requêtes fréquentes
-- ============================================================
create index if not exists idx_logements_proprietaire on logements(proprietaire_id);
create index if not exists idx_locataires_logement on locataires(logement_id);
create index if not exists idx_paiements_locataire on paiements(locataire_id);
create index if not exists idx_paiements_mois on paiements(mois_concerne);

-- ============================================================
-- Activation de la sécurité au niveau des lignes (RLS)
-- ============================================================
alter table logements enable row level security;
alter table locataires enable row level security;
alter table paiements enable row level security;

-- ------------------------------------------------------------
-- Policies : Logements
-- Un propriétaire ne voit / modifie que SES logements
-- ------------------------------------------------------------
create policy "Logements visibles par leur propriétaire"
  on logements for select
  using (auth.uid() = proprietaire_id);

create policy "Logements créés par l'utilisateur connecté"
  on logements for insert
  with check (auth.uid() = proprietaire_id);

create policy "Logements modifiables par leur propriétaire"
  on logements for update
  using (auth.uid() = proprietaire_id);

create policy "Logements supprimables par leur propriétaire"
  on logements for delete
  using (auth.uid() = proprietaire_id);

-- ------------------------------------------------------------
-- Policies : Locataires
-- Accès autorisé si le locataire appartient à un logement
-- dont l'utilisateur connecté est propriétaire
-- ------------------------------------------------------------
create policy "Locataires visibles par le propriétaire du logement"
  on locataires for select
  using (
    exists (
      select 1 from logements
      where logements.id = locataires.logement_id
      and logements.proprietaire_id = auth.uid()
    )
  );

create policy "Locataires créés par le propriétaire du logement"
  on locataires for insert
  with check (
    exists (
      select 1 from logements
      where logements.id = locataires.logement_id
      and logements.proprietaire_id = auth.uid()
    )
  );

create policy "Locataires modifiables par le propriétaire du logement"
  on locataires for update
  using (
    exists (
      select 1 from logements
      where logements.id = locataires.logement_id
      and logements.proprietaire_id = auth.uid()
    )
  );

create policy "Locataires supprimables par le propriétaire du logement"
  on locataires for delete
  using (
    exists (
      select 1 from logements
      where logements.id = locataires.logement_id
      and logements.proprietaire_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Policies : Paiements
-- Accès autorisé si le paiement appartient à un locataire
-- d'un logement dont l'utilisateur connecté est propriétaire
-- ------------------------------------------------------------
create policy "Paiements visibles par le propriétaire concerné"
  on paiements for select
  using (
    exists (
      select 1 from locataires
      join logements on logements.id = locataires.logement_id
      where locataires.id = paiements.locataire_id
      and logements.proprietaire_id = auth.uid()
    )
  );

create policy "Paiements créés par le propriétaire concerné"
  on paiements for insert
  with check (
    exists (
      select 1 from locataires
      join logements on logements.id = locataires.logement_id
      where locataires.id = paiements.locataire_id
      and logements.proprietaire_id = auth.uid()
    )
  );

create policy "Paiements modifiables par le propriétaire concerné"
  on paiements for update
  using (
    exists (
      select 1 from locataires
      join logements on logements.id = locataires.logement_id
      where locataires.id = paiements.locataire_id
      and logements.proprietaire_id = auth.uid()
    )
  );

create policy "Paiements supprimables par le propriétaire concerné"
  on paiements for delete
  using (
    exists (
      select 1 from locataires
      join logements on logements.id = locataires.logement_id
      where locataires.id = paiements.locataire_id
      and logements.proprietaire_id = auth.uid()
    )
  );

-- ============================================================
-- Fonction : calcul du solde d'un locataire pour un mois donné
-- solde > 0 => en retard | solde = 0 => payé | solde < 0 => avance
-- ============================================================
create or replace function calculer_solde_locataire(
  p_locataire_id uuid,
  p_mois date
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_loyer numeric;
  v_paye_du_mois numeric;
  v_report numeric;
  v_solde numeric;
begin
  select loyer_mensuel_du into v_loyer
  from locataires where id = p_locataire_id;

  select coalesce(sum(montant), 0) into v_paye_du_mois
  from paiements
  where locataire_id = p_locataire_id
  and mois_concerne = date_trunc('month', p_mois)::date;

  -- Report du mois précédent : solde du mois précédent (récursif simple)
  select coalesce(
    (v_loyer - coalesce(sum(montant), 0)), 0
  ) into v_report
  from paiements
  where locataire_id = p_locataire_id
  and mois_concerne = date_trunc('month', p_mois - interval '1 month')::date;

  v_solde := v_loyer - v_paye_du_mois + coalesce(v_report, 0);

  return v_solde;
end;
$$;

-- ============================================================
-- Vérification rapide après exécution :
-- select * from logements;
-- select * from locataires;
-- select * from paiements;
-- ============================================================
