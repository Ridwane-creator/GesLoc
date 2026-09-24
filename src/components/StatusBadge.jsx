// Composant partagé : badge coloré affichant le statut d'un locataire
// Utilisé à la fois dans le dashboard (Clotilde) et potentiellement
// dans la fiche locataire (Anaïs) — à valider ensemble dès le jour 1.

import { getStatusConfig } from '../lib/utils/statusConstants'

export default function StatusBadge({ statut }) {
  // statut attendu : "paye" | "retard" | "avance"
  const config = getStatusConfig(statut)

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

// Rappel de la logique de calcul : comparaison du montant payé avec le montant prévu à ce jour
// montant prévu = 0 si avant la date d'échéance, sinon = loyer mensuel dû
//   payé > prévu  => statut "avance" (en avance de paiement)
//   payé = prévu  => statut "paye" (à jour de paiement)
//   payé < prévu  => statut "retard" (en retard de paiement)
