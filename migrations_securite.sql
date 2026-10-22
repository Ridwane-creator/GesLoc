-- ============================================================
-- MyGesLoc — migrations de sécurité (à conserver dans le repo)
-- Ordre appliqué : 1) abonnements + anti-rejeu, puis A, B, C.
-- Toutes les parties sont ré-exécutables sans risque.
-- ============================================================


-- ============================================================
-- ÉTAPE 1 — Abonnements écrits uniquement par le serveur + anti-rejeu
-- ============================================================

-- Plus d'écriture client sur abonnements (seules les edge functions écrivent)
drop policy if exists "Abonnement créé par l'utilisateur connecté" on abonnements;
drop policy if exists "Abonnement modifiable par son propriétaire" on abonnements;

-- Anti-rejeu : une même transaction ne peut être enregistrée qu'une fois
alter table abonnements add column if not exists transaction_id text unique;
alter table paiements   add column if not exists transaction_id text unique;


-- ============================================================
-- SECTION A — Fonctions de solde : contrôle de propriété + accès fermé aux anonymes
-- ============================================================

-- A1. Solde d'un locataire : ne retourne que pour le propriétaire connecté (sinon 0)
create or replace function calculer_solde_locataire(
  p_locataire_id uuid,
  p_mois date
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loyer numeric;
  v_date_entree date;
  v_debut_mois_cible date;
  v_nombre_mois int;
  v_total_du numeric;
  v_total_paye numeric;
begin
  -- Le locataire doit appartenir à l'utilisateur connecté
  select l.loyer_mensuel_du, date_trunc('month', l.date_entree)::date
  into v_loyer, v_date_entree
  from locataires l
  join logements lg on lg.id = l.logement_id
  where l.id = p_locataire_id
    and lg.proprietaire_id = auth.uid();

  if not found then
    return 0;
  end if;

  v_debut_mois_cible := date_trunc('month', p_mois)::date;

  if v_debut_mois_cible < v_date_entree then
    return 0;
  end if;

  v_nombre_mois := (extract(year from age(v_debut_mois_cible, v_date_entree)) * 12)
                 + extract(month from age(v_debut_mois_cible, v_date_entree)) + 1;

  v_total_du := v_loyer * v_nombre_mois;

  select coalesce(sum(montant), 0) into v_total_paye
  from paiements
  where locataire_id = p_locataire_id
    and mois_concerne <= v_debut_mois_cible;

  return (v_total_du - v_total_paye);
end;
$$;

-- A2. search_path fixé sur les autres fonctions security definer
alter function calculer_soldes_locataires(uuid[], date) set search_path = public;
alter function obtenir_resume_tableau_de_bord(date) set search_path = public;

-- A3. Plus d'accès pour les visiteurs non connectés
revoke execute on function calculer_solde_locataire(uuid, date) from public, anon;
revoke execute on function calculer_soldes_locataires(uuid[], date) from public, anon;
revoke execute on function obtenir_resume_tableau_de_bord(date) from public, anon;

grant execute on function calculer_solde_locataire(uuid, date) to authenticated;
grant execute on function calculer_soldes_locataires(uuid[], date) to authenticated;
grant execute on function obtenir_resume_tableau_de_bord(date) to authenticated;


-- ============================================================
-- SECTION B — Fonction publique de la page de paiement
-- AVANT de l'exécuter, sauvegarde l'ancienne définition (voir B1).
-- ============================================================

-- B1. (à lancer SEUL, copie le résultat dans un fichier de ton repo)
-- select pg_get_functiondef(p.oid)
-- from pg_proc p
-- where p.proname = 'obtenir_infos_paiement_public';

-- B2. Nouvelle version : ne renvoie plus le téléphone du locataire
drop function if exists obtenir_infos_paiement_public(uuid);

create function obtenir_infos_paiement_public(p_locataire_id uuid)
returns table (
  nom text,
  logement_nom text,
  loyer_mensuel_du numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select l.nom, lg.nom, l.loyer_mensuel_du
  from locataires l
  join logements lg on lg.id = l.logement_id
  where l.id = p_locataire_id;
$$;

revoke execute on function obtenir_infos_paiement_public(uuid) from public;
grant execute on function obtenir_infos_paiement_public(uuid) to anon, authenticated;


-- ============================================================
-- SECTION C — Limites de plan appliquées côté base (en plus du front)
-- gratuit : 1 logement, 4 locataires au total
-- pro     : 4 logements, locataires illimités
-- agence  : illimité
-- ============================================================

-- C1. Plan actif d'un propriétaire (abonnement actif et non expiré)
create or replace function plan_actif(p_proprietaire uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select a.plan
       from abonnements a
      where a.proprietaire_id = p_proprietaire
        and a.statut = 'actif'
        and (a.date_fin is null or a.date_fin > now())
      order by a.date_souscription desc
      limit 1),
    'gratuit'
  );
$$;

-- usage interne uniquement (appelée par les triggers)
revoke execute on function plan_actif(uuid) from public, anon, authenticated;

-- C2. Limite de logements
create or replace function verifier_limite_logements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limite int;
  v_nombre int;
begin
  v_plan := plan_actif(new.proprietaire_id);

  v_limite := case v_plan
    when 'agence' then null
    when 'pro' then 4
    else 1
  end;

  if v_limite is not null then
    select count(*) into v_nombre
    from logements
    where proprietaire_id = new.proprietaire_id;

    if v_nombre >= v_limite then
      raise exception 'Limite de logements atteinte pour votre plan (%).', v_plan;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_limite_logements on logements;
create trigger trg_limite_logements
  before insert on logements
  for each row execute function verifier_limite_logements();

-- C3. Limite de locataires (plan gratuit uniquement)
create or replace function verifier_limite_locataires()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proprietaire uuid;
  v_nombre int;
begin
  select proprietaire_id into v_proprietaire
  from logements
  where id = new.logement_id;

  if plan_actif(v_proprietaire) = 'gratuit' then
    select count(*) into v_nombre
    from locataires l
    join logements lg on lg.id = l.logement_id
    where lg.proprietaire_id = v_proprietaire;

    if v_nombre >= 4 then
      raise exception 'Limite de 4 locataires atteinte pour le plan gratuit.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_limite_locataires on locataires;
create trigger trg_limite_locataires
  before insert on locataires
  for each row execute function verifier_limite_locataires();