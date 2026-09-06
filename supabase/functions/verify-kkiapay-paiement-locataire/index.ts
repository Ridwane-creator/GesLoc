// supabase/functions/verify-kkiapay-paiement-locataire/index.ts
//
// Vérifie une transaction Kkiapay pour un paiement de locataire côté serveur
// et enregistre le paiement si confirmé.
//
// Déploiement :
//   supabase functions deploy verify-kkiapay-paiement-locataire
//
// Secrets à configurer AVANT de déployer (jamais dans le code) :
//   supabase secrets set KKIAPAY_PUBLIC_KEY=xxx
//   supabase secrets set KKIAPAY_PRIVATE_KEY=xxx
//   supabase secrets set KKIAPAY_SECRET_KEY=xxx

import { createClient } from 'npm:@supabase/supabase-js@2'
import kkiapay from 'npm:@kkiapay-org/nodejs-sdk@latest'

Deno.serve(async (req) => {
  try {
    const { transactionId, locataireId, moisConcerne } = await req.json()

    if (!transactionId || !locataireId || !moisConcerne) {
      return new Response(
        JSON.stringify({ erreur: 'transactionId, locataireId et moisConcerne sont requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Paiement confirmé : on enregistre le paiement.
    // Utiliser le client service role pour écrire sans dépendre des policies RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    // Vérifier que le locataire existe et récupérer le montant du loyer
    const { data: locataire, error: locataireError } = await supabaseAdmin
      .from('locataires')
      .select('id, nom, loyer_mensuel_du, logement_id')
      .eq('id', locataireId)
      .single()

    if (locataireError || !locataire) {
      return new Response(
        JSON.stringify({ erreur: 'Locataire introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Enregistrer le paiement
    const { error: erreurEcriture } = await supabaseAdmin.from('paiements').insert({
      locataire_id: locataireId,
      montant: transaction.amount, // Utiliser le montant confirmé par Kkiapay
      date_paiement: new Date().toISOString().split('T')[0], // Date d'aujourd'hui
      mois_concerne: moisConcerne, // Format attendu: YYYY-MM-01
    })

    if (erreurEcriture) {
      return new Response(
        JSON.stringify({ erreur: "Paiement confirmé mais échec de l'enregistrement.", details: erreurEcriture.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ succes: true, transactionId, locataireId, montant: transaction.amount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ erreur: 'Erreur serveur.', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})