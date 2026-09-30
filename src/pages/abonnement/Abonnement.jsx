import MiseEnPage from '../../components/MiseEnPage'
import { validatePhone, formatPhone } from '../../lib/utils/phoneUtils'
import { usePlan } from '../../hooks/usePlan'
import { useState, useEffect } from 'react'
import { useKkiapayListener, confirmerAbonnement, ouvrirPaiementKkiapay } from '../../lib/kkiapay'
import { Loader2, Check, AlertTriangle, Phone, CreditCard, ArrowRight } from 'lucide-react'

const PLANS = [
  { id: 'gratuit', nom: 'Gratuit', prix: 0, description: 'Jusqu\'à 4 locataires' },
  { id: 'pro', nom: 'Pro', prix: 2000, description: 'Locataires illimités, export PDF, rappels automatiques, jusqu\'à 4 logements' },
  { id: 'agence', nom: 'Agence', prix: 8000, description: 'Tout Pro + vue agrégée multi-propriétaires, logements illimités' },
]

export default function Abonnement() {
  const { plan, activerPlan } = usePlan()
  const [planChoisi, setPlanChoisi] = useState(null)
  const [etape, setEtape] = useState('plans')
  const [numeroPaiement, setNumeroPaiement] = useState('')
  const [numeroPaiementMasque, setNumeroPaiementMasque] = useState('')
  const [paysCodePaiement, setPaysCodePaiement] = useState('+225')
  const [messageErreur, setMessageErreur] = useState('')

  // ⚠️ Le bouton "Passer à ce plan" active le plan directement (sans
  // vraie transaction) — pratique pour tester/démontrer le déverrouillage
  // des fonctionnalités Pro/Agence. Pour un vrai paiement, remplacer
  // l'action par une redirection vers le lien Chariow correspondant
  // (voir versions précédentes de ce fichier / VITE_CHARIOW_LIEN_PRO).

  // Fonction de validation du téléphone remplacée par validatePhone provenant de ../lib/utils/phoneUtils

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
    if (!validatePhone(paysCodePaiement, numeroPaiement)) {
      setMessageErreur('Numéro de téléphone invalide. Format attendu : +225 XX XX XX XX')
      return
    }

    // Construire le numéro de téléphone complet
    const numeroComplet = formatPhone(paysCodePaiement, numeroPaiement)

    // Ouvrir directement le widget Kkiapay
    ouvrirPaiementKkiapay({ montant: planChoisi.prix, numero: numeroComplet })
    setEtape('verification')
  }

  function recommencer() {
    setPlanChoisi(null)
    setEtape('plans')
    setNumeroPaiement('')
    setNumeroPaiementMasque('')
    setPaysCodePaiement('+225')
    setMessageErreur('')
  }

  return (
    <MiseEnPage>
      <div className="p-6">
        {/* Header Section */}
        {etape === 'plans' && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Abonnement</h1>
            <p className="mt-2 text-gray-600">Choisis le plan adapté à la taille de ton patrimoine.</p>
          </div>
        )}

        {/* Plans Section */}
        {etape === 'plans' && (
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((planItem, index) => {
              const estActuel = plan === planItem.id
              return (
                <div key={planItem.id} className="relative group">
                  <div className="relative flex flex-col items-center rounded-2xl border-2 border-transparent bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:border-indigo-500">
                    {/* Badge for current plan */}
                    {estActuel && (
                      <div className="absolute -top-3 left-3 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Actuel
                      </div>
                    )}

                    {/* Plan Icon with Background */}
                    <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-indigo-50">
                      {planItem.id === 'gratuit' && (
                        <Phone className="w-6 h-6 text-indigo-500" />
                      )}
                      {planItem.id === 'pro' && (
                        <CreditCard className="w-6 h-6 text-indigo-500" />
                      )}
                      {planItem.id === 'agence' && (
                        <>
                          <Phone className="w-5 h-5 text-indigo-500 mr-1" />
                          <CreditCard className="w-5 h-5 text-indigo-500 ml-1" />
                        </>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3">{planItem.nom}</h3>

                    <p className="text-2xl font-bold text-indigo-600 mb-4">
                      {planItem.prix === 0 ? 'Gratuit' : `${planItem.prix.toLocaleString('fr-FR')}`} <span className="text-gray-500 text-sm">FCFA / mois</span>
                    </p>

                    <p className="text-gray-600 flex-1 mb-6">{planItem.description}</p>

                    <div className="mt-4">
                      <button type="button"
                        onClick={() => choisirPlan(planItem)}
                        disabled={estActuel}
                        className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {estActuel ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Plan actif
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Passer à ce plan
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Plan Popular Tag (for Pro plan) */}
                  {planItem.id === 'pro' && (
                    <div className="absolute -top-2 right-2 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Populaire
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Payment Section */}
        {etape === 'paiement' && (
          <div className="bg-white border-2 border-transparent rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50">
                  <CreditCard className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">Paiement</h2>
                  <p className="mt-1 text-gray-600">
                    Entrez votre numéro de téléphone pour effectuer le paiement de {planChoisi ? (planChoisi.prix === 0 ? '0' : planChoisi.prix) : '0'} FCFA
                  </p>
                </div>
              </div>

              {/* Phone Input Container */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de téléphone
                </label>
                <div className="flex gap-3">
                  <select
                    value={paysCodePaiement}
                    onChange={(e) => {
                      setPaysCodePaiement(e.target.value);
                      setNumeroPaiement(''); // Reset number when changing country
                    }}
                    className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-600"
                  >
                    <option value="+225">+225 (Côte d'Ivoire)</option>
                    <option value="+229">+229 (Bénin)</option>
                  </select>
                  <input
                    type="tel"
                    value={numeroPaiementMasque || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      const limitedValue = value.slice(0, 8); // Max 8 digits for XX XX XX XX
                      setNumeroPaiement(limitedValue);

                      // Apply masking: XX XX XX XX (groups of 2)
                      if (limitedValue.length === 0) {
                        setNumeroPaiementMasque('');
                      } else if (limitedValue.length <= 2) {
                        setNumeroPaiementMasque(limitedValue);
                      } else if (limitedValue.length <= 4) {
                        setNumeroPaiementMasque(`${limitedValue.slice(0, 2)} ${limitedValue.slice(2)}`);
                      } else if (limitedValue.length <= 6) {
                        setNumeroPaiementMasque(`${limitedValue.slice(0, 2)} ${limitedValue.slice(2, 4)} ${limitedValue.slice(4)}`);
                      } else {
                        setNumeroPaiementMasque(`${limitedValue.slice(0, 2)} ${limitedValue.slice(2, 4)} ${limitedValue.slice(4, 6)} ${limitedValue.slice(6, 8)}`);
                      }
                    }}
                    placeholder="XX XX XX XX"
                    inputMode="tel"
                    className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-600 bg-transparent"
                  />
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Format attendu : {paysCodePaiement} XX XX XX XX
                </p>
              </div>

              {messageErreur && (
                <div className="mt-4 flex items-center p-4 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                  <div>
                    {messageErreur}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-center space-x-4 w-full max-w-xs">
                <button
                  type="button"
                  onClick={recommencer}
                  className="flex-1 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={effectuerPaiement}
                  disabled={!numeroPaiement || !validatePhone(paysCodePaiement, numeroPaiement)}
                  className="flex-1 px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                >
                  {(!numeroPaiement || !validatePhone(paysCodePaiement, numeroPaiement)) && (
                    <span className="animate-pulse">Vérification...</span>
                  )}
                  {!(!numeroPaiement || !validatePhone(paysCodePaiement, numeroPaiement)) && (
                    <>
                      Payer maintenant
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Section */}
        {etape === 'verification' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-6">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
            <p className="mb-4 text-gray-600">Nous traitons votre paiement...</p>
          </div>
        )}

        {/* Confirmation Section */}
        {etape === 'confirmation' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Paiement confirmé !</h2>
            <p className="text-gray-600 mb-8">
              Votre abonnement a été activé avec succès.
            </p>
            <button
              type="button"
              onClick={recommencer}
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105"
            >
              Retour à l'accueil
            </button>
          </div>
        )}

        {/* Error Section */}
        {etape === 'erreur' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Erreur de paiement</h2>
            <p className="text-gray-600 mb-6">{messageErreur}</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={recommencer}
                className="flex-1 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={effectuerPaiement}
                className="flex-1 px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>
    </MiseEnPage>
  )
}