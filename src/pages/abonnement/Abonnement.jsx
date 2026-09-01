import { useState } from 'react'
import MiseEnPage from '../../components/MiseEnPage'

// ⚠️ Simulation de paiement pour la démo hackathon — aucune vraie
// transaction n'est traitée. À remplacer par un vrai prestataire de
// paiement (ex: Kkiapay, Mobile Money) avant toute mise en production.

const PLANS = [
  { id: 'gratuit', nom: 'Gratuit', prix: 0, description: 'Jusqu\'à 3-4 locataires' },
  { id: 'pro', nom: 'Pro', prix: 2000, description: 'Locataires illimités, export PDF, rappels automatiques' },
  { id: 'agence', nom: 'Agence', prix: 8000, description: 'Tout Pro + vue agrégée multi-propriétaires' },
]

export default function Abonnement() {
  const [planChoisi, setPlanChoisi] = useState(null)
  const [etape, setEtape] = useState('plans') // 'plans' | 'paiement' | 'confirmation'
  const [nom, setNom] = useState('')
  const [modePaiement, setModePaiement] = useState('Mobile Money')
  const [numero, setNumero] = useState('')

  function choisirPlan(plan) {
    if (plan.prix === 0) return
    setPlanChoisi(plan)
    setEtape('paiement')
  }

  function validerPaiement(e) {
    e.preventDefault()
    setEtape('confirmation')
  }

  function recommencer() {
    setPlanChoisi(null)
    setEtape('plans')
    setNom('')
    setNumero('')
  }

  return (
    <MiseEnPage>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Abonnement</h1>
          <p className="text-sm text-slate-500">Choisis le plan adapté à la taille de ton patrimoine.</p>
        </div>

        {etape === 'plans' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{plan.nom}</h3>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {plan.prix === 0 ? '0 FCFA' : `${plan.prix.toLocaleString('fr-FR')} FCFA / mois`}
                </p>
                <p className="mt-2 flex-1 text-sm text-slate-500">{plan.description}</p>
                <button
                  onClick={() => choisirPlan(plan)}
                  disabled={plan.prix === 0}
                  className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {plan.prix === 0 ? 'Plan actuel' : 'Passer à ce plan'}
                </button>
              </div>
            ))}
          </div>
        )}

        {etape === 'paiement' && planChoisi && (
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <button onClick={() => setEtape('plans')} className="mb-4 text-sm text-slate-400 hover:text-slate-600">
              ← Retour aux plans
            </button>
            <h2 className="text-lg font-bold text-slate-900">Paiement — Plan {planChoisi.nom}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {planChoisi.prix.toLocaleString('fr-FR')} FCFA / mois
            </p>

            <form onSubmit={validerPaiement} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nom complet</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Mode de paiement</label>
                <select
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
                >
                  <option>Mobile Money</option>
                  <option>Carte bancaire</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {modePaiement === 'Mobile Money' ? 'Numéro Mobile Money' : 'Numéro de carte'}
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder={modePaiement === 'Mobile Money' ? '97 00 00 00' : '•••• •••• •••• ••••'}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
                />
              </div>

              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Simulation pour la démo — aucune vraie transaction n'est effectuée.
              </p>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Payer {planChoisi.prix.toLocaleString('fr-FR')} FCFA
              </button>
            </form>
          </div>
        )}

        {etape === 'confirmation' && planChoisi && (
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-emerald-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">✓</span>
              <span className="font-semibold">Paiement confirmé (simulation)</span>
            </div>

            <p className="text-sm text-slate-600">
              Plan <strong>{planChoisi.nom}</strong> activé pour {nom || 'l\'utilisateur'} —{' '}
              {planChoisi.prix.toLocaleString('fr-FR')} FCFA via {modePaiement}.
            </p>

            <button
              onClick={recommencer}
              className="mt-5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Retour aux plans
            </button>
          </div>
        )}
      </div>
    </MiseEnPage>
  )
}
