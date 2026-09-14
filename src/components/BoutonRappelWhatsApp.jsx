import { Link } from 'react-router-dom'
import { genererLienRappelWhatsApp, estVeilleDeLoyer } from '../lib/whatsapp'
import { usePlan } from '../hooks/usePlan'

// Fonctionnalité réservée aux plans Pro et Agence.
export default function BoutonRappelWhatsApp({ locataire }) {
  const { peutUtiliserRappels, loading } = usePlan()

  if (loading) return null

  if (!peutUtiliserRappels) {
    return (
      <Link
        to="/abonnement"
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400 hover:bg-slate-200"
        title="Fonctionnalité réservée aux plans Pro et Agence"
      >
        🔒 Rappeler
      </Link>
    )
  }

  const lien = genererLienRappelWhatsApp({
    telephone: locataire.telephone,
    nom: locataire.nom,
    loyerMensuelDu: locataire.loyer_mensuel_du,
    dateEcheance: locataire.date_echeance,
  })

  if (!lien) {
    return <span className="text-xs text-slate-300">Pas de numéro</span>
  }

  const veille = estVeilleDeLoyer(locataire.date_echeance)

  return (
    <a
      href={lien}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        veille
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
      title={veille ? "Demain est le jour de paiement — rappel prêt à envoyer" : "Envoyer un rappel"}
    >
      💬 {veille ? 'Rappeler (demain)' : 'Rappeler'}
    </a>
  )
}
