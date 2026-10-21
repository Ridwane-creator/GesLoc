CREATE OR REPLACE FUNCTION public.obtenir_infos_paiement_public(p_locataire_id uuid)
 RETURNS TABLE(nom text, telephone text, loyer_mensuel_du numeric, logement_nom text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    l.nom,
    l.telephone,
    l.loyer_mensuel_du,
    lg.nom as logement_nom
  from locataires l
  join logements lg on lg.id = l.logement_id
  where l.id = p_locataire_id;
end;
$function$
