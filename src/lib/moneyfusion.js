// src/lib/moneyfusion.js
//
// Paiements MoneyFusion : le serveur (edge functions) décide du montant,
// crée le paiement, puis le client est redirigé vers la page MoneyFusion.
// Aucune clé secrète ici.

import { supabase } from './supabaseClient'

// Extrait le message d'erreur renvoyé par l'edge function, s'il existe
async function messageErreur(error, defaut) {
  try {
    const corps = await error.context.json()
    if (corps?.erreur) return corps.erreur
  } catch {
    // pas de corps JSON lisible : on garde le message par défaut
  }
  return defaut
}

async function creerPaiement(body) {
  const { data, error } = await supabase.functions.invoke('moneyfusion-creer-paiement', { body })
  if (error) {
    throw new Error(await messageErreur(error, 'Impossible de démarrer le paiement.'))
  }
  if (!data?.url) throw new Error('Impossible de démarrer le paiement.')
  return data
}

// Abonnement : utilisateur connecté, numero = numéro Mobile Money complet
export async function demarrerPaiementAbonnement({ plan, numero }) {
  const { url } = await creerPaiement({ type: 'abonnement', plan, numero })
  window.location.href = url
}

// Loyer : page publique du locataire
export async function demarrerPaiementLoyer({ locataireId, moisConcerne }) {
  const { url } = await creerPaiement({ type: 'loyer', locataireId, moisConcerne })
  window.location.href = url
}

// Vérifie un paiement à partir du token reçu au retour de MoneyFusion.
// Retourne { statut: 'paid' | 'pending' | 'failed' | 'no paid' | 'inconnu', type? }
export async function verifierPaiement(token) {
  const { data, error } = await supabase.functions.invoke('moneyfusion-verifier', {
    body: { token },
  })
  if (error) {
    throw new Error(await messageErreur(error, 'La vérification du paiement a échoué.'))
  }
  return data
}