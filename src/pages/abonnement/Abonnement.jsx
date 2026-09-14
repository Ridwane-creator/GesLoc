import MiseEnPage from '../../components/MiseEnPage'
import { usePlan } from '../../hooks/usePlan'

// ⚠️ Le bouton "Passer à ce plan" active le plan directement (sans
// vraie transaction) — pratique pour tester/démontrer le déverrouillage
// des fonctionnalités Pro/Agence. Pour un vrai paiement, remplacer
// l'action par une redirection vers le lien Chariow correspondant
// (voir versions précédentes de ce fichier / VITE_CHARIOW_LIEN_PRO).

const PLANS = [
  { id: 'gratuit', nom: 'Gratuit', prix: 0, description: 'Jusqu\'à 3-4 locataires' },
  { id: 'pro', nom: 'Pro', prix: 2000, description: 'Locataires illimités, export PDF, rappels automatiques' },
  { id: 'agence', nom: 'Agence', prix: 8000, description: 'Tout Pro + vue agrégée multi-propriétaires' },
]

export default function Abonnement() {
  const { plan, activerPlan } = usePlan()

  async function choisirPlan(planItem) {
    await activerPlan(planItem.id)
  }

  return (
    <MiseEnPage>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Abonnement</h1>
          <p className="text-sm text-slate-500">Choisis le plan adapté à la taille de ton patrimoine.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((planItem) => {
            const estActuel = plan === planItem.id
            return (
              <div key={planItem.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{planItem.nom}</h3>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {planItem.prix === 0 ? '0 FCFA' : `${planItem.prix.toLocaleString('fr-FR')} FCFA / mois`}
                </p>
                <p className="mt-2 flex-1 text-sm text-slate-500">{planItem.description}</p>

                <button
                  onClick={() => choisirPlan(planItem)}
                  disabled={estActuel}
                  className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {estActuel ? 'Plan actuel' : 'Passer à ce plan'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </MiseEnPage>
  )
}
