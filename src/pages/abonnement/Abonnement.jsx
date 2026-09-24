import MiseEnPage from '../../components/MiseEnPage'
import { validatePhone, formatPhone } from '../../lib/utils/phoneUtils'
import { usePlan } from '../../hooks/usePlan'

const PLANS = [
  { id: 'gratuit', nom: 'Gratif', prix: 0, description: 'Jusqu\'à 4 locataires' },
  { id: 'pro', nom: 'Pro', prix: 2000, description: 'Locataires illimités, export PDF, rappels automatiques , jusqu\'à 4 logements' },
  { id: 'agence', nom: 'Agence', prix: 8000, description: 'Tout Pro + vue agrégée multi-propriétaires , logements illimités' },
]

export default function Abonnement() {
  const { plan, activerPlan } = usePlan()
  const [planChoisi, setPlanChoisi] = useState(null)
  const [etape, setEtape] = useState('plans')
  const [numeroPaiement, setNumeroPaiement] = useState('')
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
      setMessageErreur('Numéro de téléphone invalide. Format attendu : +229 XX XX XX XX ou +225 XX XX XX XX')
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
    setPaysCodePaiement('+225')
    setMessageErreur('')
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