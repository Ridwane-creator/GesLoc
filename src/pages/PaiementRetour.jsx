import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react'
import { verifierPaiement } from '../lib/moneyfusion'

const TENTATIVES_MAX = 8
const DELAI_MS = 4000

// Page où MoneyFusion renvoie le client après paiement (?token=...).
// Publique : sert aussi bien aux locataires (loyer) qu'aux propriétaires (abonnement).
export default function PaiementRetour() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [etat, setEtat] = useState(token ? 'verification' : 'invalide')
  const [type, setType] = useState(null)
  const [message, setMessage] = useState('')
  const annule = useRef(false)

  const verifier = useCallback(async () => {
    setEtat('verification')
    for (let i = 0; i < TENTATIVES_MAX; i++) {
      if (annule.current) return
      try {
        const res = await verifierPaiement(token)
        if (annule.current) return

        if (res.statut === 'paid') {
          setType(res.type)
          setEtat('paye')
          return
        }
        if (res.statut === 'failed' || res.statut === 'no paid') {
          setEtat('echec')
          return
        }
        // 'pending' ou 'inconnu' : on réessaie
      } catch (e) {
        setMessage(e.message)
      }
      await new Promise((r) => setTimeout(r, DELAI_MS))
    }
    if (!annule.current) setEtat('attente')
  }, [token])

  useEffect(() => {
    document.title = 'MyGesLoc'
    if (!token) return
    annule.current = false
    verifier()
    return () => {
      annule.current = true
    }
  }, [token, verifier])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
        {etat === 'verification' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Vérification du paiement…</h2>
            <p className="text-slate-500 text-sm">Merci de patienter, ne fermez pas cette page.</p>
          </>
        )}

        {etat === 'paye' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Paiement confirmé</h2>
            <p className="text-slate-500 text-sm mb-6">
              {type === 'abonnement'
                ? 'Votre abonnement a bien été activé.'
                : 'Votre loyer a bien été enregistré. Merci !'}
            </p>
            <Link
              to={type === 'abonnement' ? '/dashboard' : '/'}
              className="block w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
            >
              {type === 'abonnement' ? 'Aller au tableau de bord' : "Retour à l'accueil"}
            </Link>
          </>
        )}

        {etat === 'attente' && (
          <>
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Paiement en attente</h2>
            <p className="text-slate-500 text-sm mb-6">
              Nous n'avons pas encore reçu la confirmation. Si vous avez bien validé le paiement
              sur votre téléphone, patientez un instant puis vérifiez à nouveau.
            </p>
            <button
              onClick={verifier}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium bg-indigo-600"
            >
              Vérifier à nouveau
            </button>
          </>
        )}

        {etat === 'echec' && (
          <>
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Paiement non abouti</h2>
            <p className="text-slate-500 text-sm mb-6">
              Le paiement a échoué ou a été annulé. Aucun montant n'a été enregistré.
            </p>
            <Link
              to="/"
              className="block w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
            >
              Retour à l'accueil
            </Link>
          </>
        )}

        {etat === 'invalide' && (
          <>
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h2>
            <p className="text-slate-500 text-sm mb-6">Aucune référence de paiement n'a été trouvée.</p>
            <Link
              to="/"
              className="block w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
            >
              Retour à l'accueil
            </Link>
          </>
        )}

        {message && etat !== 'paye' && (
          <p className="text-xs text-slate-400 mt-4">{message}</p>
        )}
      </div>
    </div>
  )
}