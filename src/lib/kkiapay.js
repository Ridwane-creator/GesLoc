// src/lib/kkiapay.js
//
// 1. Ajouter dans index.html, juste avant </body> :
//    <script src="https://cdn.kkiapay.me/k.js"></script>
//
// 2. Ajouter dans .env :
//    VITE_KKIAPAY_PUBLIC_KEY=ta_cle_publique_sandbox

import { useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useKkiapayListener(onSucces) {
  useEffect(() => {
    function gererSucces(evenement) {
      onSucces(evenement.detail)
    }
    window.addEventListener('kkiapay.success', gererSucces)
    return () => window.removeEventListener('kkiapay.success', gererSucces)
  }, [onSucces])
}

export function ouvrirPaiementKkiapay({ montant, numero }) {
  window.openKkiapayWidget({
    amount: montant,
    key: import.meta.env.VITE_KKIAPAY_PUBLIC_KEY,
    sandbox: true, // mode test — aucune vraie transaction débitée
    position: 'center',
    phone: numero || undefined,
  })
}

export async function confirmerAbonnement({ transactionId, plan, modePaiement }) {
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('verify-kkiapay-payment', {
    body: { transactionId, plan, modePaiement },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (error) throw new Error("La vérification du paiement a échoué.")
  return data
}