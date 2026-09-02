// supabase/functions/verify-kkiapay-payment/index.ts
//
// Vérifie une transaction Kkiapay côté serveur (jamais côté client)
// et enregistre l'abonnement si le paiement est confirmé.
//
// Déploiement :
//   supabase functions deploy verify-kkiapay-payment
//
// Secrets à configurer AVANT de déployer (jamais dans le code) :
//   supabase secrets set KKIAPAY_PUBLIC_KEY=xxx
//   supabase secrets set KKIAPAY_PRIVATE_KEY=xxx
//   supabase secrets set KKIAPAY_SECRET_KEY=xxx

import { createClient } from 'npm:@supabase/supabase-js@2'
import kkiapay from 'npm:@kkiapay-org/nodejs-sdk@latest'

Deno.serve(async (req) => {
  try {
    const { transactionId, plan, modePaiement } = await req.json()

    if (!transactionId || !plan) {
      return new Response(
        JSON.stringify({ erreur: 'transactionId et plan sont requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Récupère l'utilisateur connecté à partir du token envoyé par le frontend
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: erreurUtilisateur } = await supabaseClient.auth.getUser()

    if (erreurUtilisateur || !user) {
      return new Response(
        JSON.stringify({ erreur: 'Utilisateur non authentifié.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Vérification de la transaction directement auprès de Kkiapay (clés secrètes, côté serveur uniquement)
    const k = kkiapay({
      publickey: Deno.env.get('KKIAPAY_PUBLIC_KEY'),
      privatekey: Deno.env.get('KKIAPAY_PRIVATE_KEY'),
      secretkey: Deno.env.get('KKIAPAY_SECRET_KEY'),
      sandbox: true, // passer à false en production réelle
    })

    const transaction = await k.verify(transactionId)

    if (transaction.status !== 'SUCCESS') {
      return new Response(
        JSON.stringify({ erreur: 'Paiement non confirmé par Kkiapay.', statut: transaction.status }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Paiement confirmé : on enregistre/actualise l'abonnement.
    // Client "service role" utilisé ici pour écrire sans dépendre des policies RLS classiques,
    // car cette fonction a déjà vérifié l'identité de l'utilisateur et la transaction elle-même.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { error: erreurEcriture } = await supabaseAdmin.from('abonnements').insert({
      proprietaire_id: user.id,
      plan,
      mode_paiement: modePaiement || 'mobile_money',
      statut: 'actif',
    })

    if (erreurEcriture) {
      return new Response(
        JSON.stringify({ erreur: "Paiement confirmé mais échec de l'enregistrement.", details: erreurEcriture.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ succes: true, transactionId, plan }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ erreur: 'Erreur serveur.', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})