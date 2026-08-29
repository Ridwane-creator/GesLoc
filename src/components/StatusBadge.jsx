// Composant partagé : badge coloré affichant le statut d'un locataire
// Utilisé à la fois dans le dashboard (Clotilde) et potentiellement
// dans la fiche locataire (Anaïs) — à valider ensemble dès le jour 1.

export default function StatusBadge({ statut }) {
  // statut attendu : "paye" | "retard" | "avance"
  const config = {
    paye: { label: 'À jour', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    retard: { label: 'En retard', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    avance: { label: 'En avance', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  }

  const { label, bg, text, dot } = config[statut] || config.retard

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// Rappel de la logique de calcul (voir schema_gesloc.sql) :
// solde > 0  => statut "retard"
// solde = 0  => statut "paye"
// solde < 0  => statut "avance"
