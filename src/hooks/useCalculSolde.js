import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Calcule le solde d'un locataire pour un mois donné, via la fonction RPC
 * officielle côté backend (Freddy) : calculer_solde_locataire.
 *
 * moisSelectionne doit être une chaîne de date, ex: '2026-08-01' (le 1er du mois).
 */
export function useCalculSolde(locataireId, moisSelectionne) {
  const [solde, setSolde] = useState(null);
  const [statut, setStatut] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!locataireId || !moisSelectionne) {
      setSolde(null);
      setStatut(null);
      return;
    }
    calculer();
  }, [locataireId, moisSelectionne]);

  async function calculer() {
    setChargement(true);
    setErreur(null);

    const { data, error } = await supabase.rpc('calculer_solde_locataire', {
      p_locataire_id: locataireId,
      p_mois: moisSelectionne,
    });

    if (error) {
      setErreur('Impossible de calculer le solde. Réessaie.');
      setSolde(null);
      setStatut(null);
      setChargement(false);
      return;
    }

    // ⚠️ À confirmer avec Freddy : on suppose que `data` est directement le
    // nombre (solde). Si la fonction renvoie un tableau ou un objet, adapter
    // cette ligne (ex: data[0].solde ou data.solde).
    const soldeCalcule = Number(data);

    setSolde(soldeCalcule);
    setStatut(soldeCalcule > 0 ? 'En retard' : soldeCalcule === 0 ? 'Payé' : 'Avance');
    setChargement(false);
  }

  return { solde, statut, chargement, erreur, recalculer: calculer };
}