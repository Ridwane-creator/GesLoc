-- ============================================================
-- GesLoc — Fonctions Backend & Logique Métier
-- Développé par Prince Freddy
-- ============================================================

-- 1. Calcul du Solde Cumulé Exact pour un Locataire à un Mois Donné
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
  v_date_entree date;
  v_debut_mois_cible date;
  v_nombre_mois int;
  v_total_du numeric;
  v_total_paye numeric;
begin
  select loyer_mensuel_du, date_trunc('month', date_entree)::date 
  into v_loyer, v_date_entree
  from locataires 
  where id = p_locataire_id;

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


-- 2. Vue / Fonction pour le Dashboard de Clotilde (Agrégats & Compteurs)
create or replace function obtenir_resume_tableau_de_bord(p_mois date default current_date)
returns table (
  total_locataires bigint,
  payes bigint,
  en_retard bigint,
  en_avance bigint,
  total_encaisse numeric
)
language plpgsql
security definer
as $$
declare
  v_debut_mois date := date_trunc('month', p_mois)::date;
begin
  return query
  with soldes as (
    select 
      l.id,
      calculer_solde_locataire(l.id, v_debut_mois) as solde
    from locataires l
    join logements log on log.id = l.logement_id
    where log.proprietaire_id = auth.uid()
  ),
  encaissements as (
    select coalesce(sum(p.montant), 0) as total
    from paiements p
    join locataires l on l.id = p.locataire_id
    join logements log on log.id = l.logement_id
    where log.proprietaire_id = auth.uid()
      and date_trunc('month', p.mois_concerne)::date = v_debut_mois
  )
  select 
    count(*)::bigint as total_locataires,
    count(*) filter (where s.solde = 0)::bigint as payes,
    count(*) filter (where s.solde > 0)::bigint as en_retard,
    count(*) filter (where s.solde < 0)::bigint as en_avance,
    (select total from encaissements) as total_encaisse
  from soldes s;
end;
$$;