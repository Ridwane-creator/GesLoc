import { useAbonnement } from './useAbonnement'

// Façade conservée pour ne pas modifier les composants existants.
// Source unique de vérité : la table `abonnements` (écrite uniquement par le serveur).
// L'ancien champ user_metadata.plan (modifiable par l'utilisateur) n'est plus utilisé.
export function usePlan() {
  const { plan, chargement, estGratuit, estPro, estAgence, peutUtiliserRappels, refresh } =
    useAbonnement()

  return {
    plan,
    loading: chargement,
    estGratuit,
    estPro,
    estAgence,
    peutUtiliserRappels,
    rafraichir: refresh,
  }
}