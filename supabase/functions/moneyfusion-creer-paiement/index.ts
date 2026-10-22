// supabase/functions/moneyfusion-creer-paiement/index.ts
//
// Crée un paiement MoneyFusion et renvoie l'URL vers laquelle rediriger le client.
// Le montant est TOUJOURS décidé ici, côté serveur (jamais envoyé par le client).
//
// Deux cas :
//   { type: 'abonnement', plan: 'pro'|'agence', numero }   -> utilisateur connecté requis
//   { type: 'loyer', locataireId, moisConcerne }           -> page publique (locataire)
//
// Secrets requis :  MONEYFUSION_API_URL
// Optionnel      :  SITE_URL (défaut https://www.mygesloc.com)
//
// Déploiement :  supabase functions deploy moneyfusion-creer-paiement

import { createClient } from 'npm:@supabase/supabase-js@2'

const PRIX_PLANS: Record<string, number> = { pro: 2000, agence: 8000 }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MOIS_RE = /^\d{4}-(0[1-9]|1[0-2])-01$/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Numéro local à 10 chiffres (ex. 0197123456) à partir de +2290197123456.
// Un ancien numéro béninois à 8 chiffres reçoit le préfixe 01.
function numeroLocal(brut: unknown): string {
  let n = String(brut ?? '').replace(/\D/g, '')
  if ((n.startsWith('229') || n.startsWith('225')) && n.length >= 11) n = n.slice(3)
  if (n.length === 8) n = '01' + n
  return n
}

function repondre(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const apiUrl = Deno.env.get('MONEYFUSION_API_URL')
    if (!apiUrl) return repondre({ erreur: 'Configuration serveur incomplète.' }, 500)

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.mygesloc.com'
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let montant: number
    let libelle: string
    let nomClient: string
    let numero: string
    let info: Record<string, unknown>

    if (body.type === 'abonnement') {
      // ---- Abonnement : l'utilisateur doit être connecté ----
      const { plan } = body
      if (!(plan in PRIX_PLANS)) return repondre({ erreur: 'Plan invalide.' }, 400)

      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return repondre({ erreur: 'Utilisateur non authentifié.' }, 401)
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user }, error } = await supabaseClient.auth.getUser()
      if (error || !user) return repondre({ erreur: 'Utilisateur non authentifié.' }, 401)

      numero = numeroLocal(body.numero)
      if (numero.length !== 10) return repondre({ erreur: 'Numéro de téléphone invalide.' }, 400)

      montant = PRIX_PLANS[plan]
      libelle = `Abonnement MyGesLoc ${plan}`
      nomClient = user.email ?? 'Abonné MyGesLoc'
      info = { type: 'abonnement', userId: user.id, plan }
    } else if (body.type === 'loyer') {
      // ---- Loyer : page publique, le locataire est identifié par son UUID ----
      const { locataireId, moisConcerne } = body
      if (!UUID_RE.test(String(locataireId)) || !MOIS_RE.test(String(moisConcerne))) {
        return repondre({ erreur: 'Paramètres invalides.' }, 400)
      }
      const { data: loc, error } = await supabaseAdmin
        .from('locataires')
        .select('id, nom, telephone, loyer_mensuel_du')
        .eq('id', locataireId)
        .single()
      if (error || !loc) return repondre({ erreur: 'Locataire introuvable.' }, 404)

      numero = numeroLocal(loc.telephone)
      if (numero.length !== 10) {
        return repondre({ erreur: "Le locataire n'a pas de numéro de téléphone valide." }, 400)
      }

      montant = Number(loc.loyer_mensuel_du)
      libelle = `Loyer ${moisConcerne.slice(0, 7)}`
      nomClient = loc.nom
      info = { type: 'loyer', locataireId: loc.id, moisConcerne }
    } else {
      return repondre({ erreur: 'Type de paiement invalide.' }, 400)
    }

    // ---- Appel à MoneyFusion ----
    const reponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalPrice: montant,
        article: [{ [libelle]: montant }],
        personal_Info: [info],
        numeroSend: numero,
        nomclient: nomClient,
        return_url: `${siteUrl}/paiement/retour`,
        webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/moneyfusion-verifier`,
      }),
    })
    const resultat = await reponse.json().catch(() => null)

    if (!reponse.ok || !resultat?.statut || !resultat?.url) {
      console.error('MoneyFusion refus création:', reponse.status, JSON.stringify(resultat))
      return repondre({ erreur: 'Impossible de créer le paiement.' }, 502)
    }

    return repondre({ url: resultat.url, token: resultat.token })
  } catch (err) {
    console.error('creer-paiement:', err)
    return repondre({ erreur: 'Erreur serveur.' }, 500)
  }
})