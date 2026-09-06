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

    // Gestion robuste du format de retour de la RPC calculer_solde_locataire
    let soldeCalcule = null;

    if (Array.isArray(data)) {
      // Si la RPC retourne un tableau, prendre le premier élément
      soldeCalcule = Number(data[0]?.solde ?? data[0]);
    } else if (data && typeof data === 'object') {
      // Si la RPC retourne un objet, extraire la propriété solde
      soldeCalcule = Number(data.solde);
    } else {
      // Format attendu : nombre direct
      soldeCalcule = Number(data);
    }

    // Vérifier que le calcul a produit un nombre valide
    if (isNaN(soldeCalcule)) {
      console.warn('Format de retour inattendu de la RPC calculer_solde_locataire:', data);
      soldeCalcule = 0; // Valeur de secours pour éviter les erreurs en chaîne
    }

    setSolde(soldeCalcule);
    setStatut(soldeCalcule > 0 ? 'En retard' : soldeCalcule === 0 ? 'Payé' : 'Avance');
    setChargement(false);
  }

  return { solde, statut, chargement, erreur, recalculer: calculer };
}