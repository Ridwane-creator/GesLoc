import { useKkiapayListener, ouvrirPaiementKkiapay, confirmerAbonnement } from '../../lib/kkiapay'
import { useState } from 'react'
import MiseEnPage from '../../components/MiseEnPage'

const PLANS = [
  { id: 'gratuit', nom: 'Gratuit', prix: 0, description: 'Jusqu\'à 3-4 locataires' },
  { id: 'pro', nom: 'Pro', prix: 2000, description: 'Locataires illimités, export PDF, rappels automatiques' },
  { id: 'agence', nom: 'Agence', prix: 8000, description: 'Tout Pro + vue agrégée multi-propriétaires' },
]

export default function Abonnement() {
  const [planChoisi, setPlanChoisi] = useState(null)
  const [etape, setEtape] = useState('plans') // 'plans' | 'paiement' | 'verification' | 'confirmation' | 'erreur'
  const [numeroPaiement, setNumeroPaiement] = useState('')
  const [paysCodePaiement, setPaysCodePaiement] = useState('+225') // Défaut à Côte d'Ivoire
  const [messageErreur, setMessageErreur] = useState('')

  // Fonction de validation du numéro de téléphone pour le paiement
  const validerTelephonePaiement = (paysCode, numeroLocal) => {
    if (!paysCode || !numeroLocal) {
      return false;
    }

    // Construire le numéro complet pour validation
    const telephoneComplet = `${paysCode}${numeroLocal.replace(/\s/g, '')}`;

    // Autoriser seulement les chiffres et le signe + en début
    const regexAutorises = /^[\d\+]+$/;
    if (!regexAutorises.test(telephoneComplet)) {
      return false;
    }

    // Vérifier la longueur selon le pays
    const chiffres = telephoneComplet.replace(/\+/g, '');

    if (paysCode === '+229') {
      // Bénin: 8 chiffres après le +229 (total 11 avec indicatif)
      return chiffres.length === 11 && chiffres.startsWith('229');
    } else if (paysCode === '+225') {
      // Côte d'Ivoire: 8 chiffres après le +225 (total 11 avec indicatif)
      return chiffres.length === 11 && chiffres.startsWith('225');
    }

    return false;
  };

  // Écoute les paiements confirmés par le widget Kkiapay (déclenché après saisie du code sur le téléphone)
  useKkiapayListener(async ({ transactionId }) => {
    setEtape('verification')
    try {
      await confirmerAbonnement({
        transactionId,
        plan: planChoisi.id,
        modePaiement: 'mobile_money', // On utilise toujours Mobile Money pour le flux direct
      })
      setEtape('confirmation')
    } catch (e) {
      setMessageErreur(e.message)
      setEtape('erreur')
    }
  })

  function choisirPlan(plan) {
    if (plan.prix === 0) {
      // Plan gratuit - pas besoin de paiement
      setPlanChoisi(plan)
      setEtape('confirmation') // Aller directement à la confirmation pour le plan gratuit
      return
    }

    // Plan payant - aller directement à la saisie du numéro pour le paiement
    setPlanChoisi(plan)
    setEtape('paiement')
    // Réinitialiser le numéro de téléphone pour le paiement
    setNumeroPaiement('')
    setPaysCodePaiement('+225')
  }

  function effectuerPaiement() {
    if (!validerTelephonePaiement(paysCodePaiement, numeroPaiement)) {
      setMessageErreur('Numéro de téléphone invalide. Format attendu : +229 XX XX XX XX ou +225 XX XX XX XX')
      return
    }

    // Construire le numéro de téléphone complet
    const numeroComplet = `${paysCodePaiement}${numeroPaiement.replace(/\s/g, '')}`

    // Ouvrir directement le widget Kkiapay
    ouvrirPaiementKkiapay({ montant: planChoisi.prix, numero: numeroComplet })
    setEtape('verification')
  }

  function recommencer() {
    setPlanChoisi(null)
    setEtape('plans')
    setNumeroPaiement('')
    setPaysCodePaiement('+225')
    setMessageErreur('')
  }

  return (
    <MiseEnPage>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Abonnement</h1>
          <p className="text-slate-500">Choisis le plan adapté à la taille de ton patrimoine.</p>
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

            <div className="mt-5 space-y-4">
              <div className="flex gap-3">
                <label className="flex-1 mb-1.5 block text-sm font-medium text-slate-700">
                  {paysCodePaiement === '+229' ? '+229 (Bénin)' : '+225 (Côte d\'Ivoire)'}
                </label>
                <select
                  value={paysCodePaiement}
                  onChange={(e) => setPaysCodePaiement(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
                >
                  <option value="+229">+229 (Bénin)</option>
                  <option value="+225">+225 (Côte d'Ivoire)</option>
                </select>
              </div>
              <input
                type="text"
                value={numeroPaiement}
                onChange={(e) => setNumeroPaiement(e.target.value)}
                placeholder="XX XX XX XX"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
              />

              {messageErreur && (
                <p className="mt-2 text-sm text-red-600">
                  {messageErreur}
                </p>
              )}
            </div>

            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Mode test (sandbox) — aucune vraie transaction n'est débitée, mais le paiement passe réellement par l'API Kkiapay.
            </p>

            <button
              onClick={effectuerPaiement}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Payer {planChoisi.prix.toLocaleString('fr-FR')} FCFA
            </button>
          </div>
        )}

        {etape === 'verification' && (
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <p className="text-sm text-slate-600">Vérification du paiement en cours...</p>
          </div>
        )}

        {etape === 'erreur' && (
          <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">{messageErreur}</p>
            <button
              onClick={() => setEtape('paiement')}
              className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Réessayer
            </button>
          </div>
        )}

        {etape === 'confirmation' && planChoisi && (
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-emerald-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">✓</span>
              <span className="font-semibold">Paiement confirmé</span>
            </div>

            <p className="text-sm text-slate-600">
              Plan <strong>{planChoisi.nom}</strong> activé avec succès — {planChoisi.prix.toLocaleString('fr-FR')} FCFA via Mobile Money.
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