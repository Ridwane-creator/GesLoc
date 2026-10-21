// supabase/functions/moneyfusion-verifier/index.ts
//
// Vérifie un paiement MoneyFusion à partir de son token, puis enregistre
// l'abonnement ou le loyer correspondant (une seule fois).
//
// Appelée par :
//   - MoneyFusion (webhook, POST)         -> NE JAMAIS faire confiance au contenu reçu
//   - la page de retour du site (token)   -> même logique
// Dans les deux cas on re-vérifie le statut directement chez MoneyFusion.
//
// Déploiement (sans JWT, car appelée par MoneyFusion) :
//   supabase functions deploy moneyfusion-verifier --no-verify-jwt
//
// Optionnel : MONEYFUSION_STATUS_URL (défaut https://www.pay.moneyfusion.net/paiementNotif/)

import { createClient } from 'npm:@supabase/supabase-js@2'

const PRIX_PLANS: Record<string, number> = { pro: 2000, agence: 8000 }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MOIS_RE = /^\d{4}-(0[1-9]|1[0-2])-01$/
const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // 1. Récupérer le token (webhook ou page de retour)
    const brut = await req.json().catch(() => ({}))
    const token = String(brut?.tokenPay ?? brut?.token_pay ?? brut?.token ?? '')
    if (!TOKEN_RE.test(token)) return repondre({ erreur: 'Token invalide.' }, 400)

    // 2. Vérifier le statut directement chez MoneyFusion
    const baseStatut =
      Deno.env.get('MONEYFUSION_STATUS_URL') ?? 'https://www.pay.moneyfusion.net/paiementNotif/'
    const rep = await fetch(`${baseStatut}${encodeURIComponent(token)}`)
    const verif = await rep.json().catch(() => null)

    if (!rep.ok || !verif?.statut || !verif?.data) {
      console.error('MoneyFusion statut inconnu:', rep.status, JSON.stringify(verif))
      return repondre({ statut: 'inconnu' })
    }

    const statut = String(verif.data.statut)
    if (statut !== 'paid') return repondre({ statut })

    // 3. Paiement confirmé : on lit ce que NOUS avons stocké à la création
    const info = verif.data.personal_Info?.[0]
    const montant = Number(verif.data.Montant)
    if (!info || !(montant > 0)) {
      console.error('personal_Info ou Montant manquant:', JSON.stringify(verif.data))
      return repondre({ statut, erreur: 'Données de paiement incomplètes.' }, 500)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let erreurEcriture = null

    if (info.type === 'abonnement') {
      const prix = PRIX_PLANS[info.plan]
      if (!prix || !UUID_RE.test(String(info.userId)) || montant < prix) {
        console.error('Abonnement incohérent:', JSON.stringify(info), montant)
        return repondre({ statut, erreur: 'Paiement incohérent.' }, 400)
      }
      // Durée : 30 jours. Si un abonnement est encore en cours, on prolonge à la suite.
      const maintenant = new Date()
      const { data: enCours } = await supabaseAdmin
        .from('abonnements')
        .select('date_fin')
        .eq('proprietaire_id', info.userId)
        .eq('statut', 'actif')
        .gt('date_fin', maintenant.toISOString())
        .order('date_fin', { ascending: false })
        .limit(1)
        .maybeSingle()
      const debut = enCours?.date_fin ? new Date(enCours.date_fin) : maintenant
      const fin = new Date(debut.getTime() + 30 * 24 * 60 * 60 * 1000)

      const { error } = await supabaseAdmin.from('abonnements').insert({
        proprietaire_id: info.userId,
        plan: info.plan,
        mode_paiement: 'mobile_money',
        statut: 'actif',
        date_fin: fin.toISOString(),
        transaction_id: token,
      })
      erreurEcriture = error
    } else if (info.type === 'loyer') {
      if (!UUID_RE.test(String(info.locataireId)) || !MOIS_RE.test(String(info.moisConcerne))) {
        console.error('Loyer incohérent:', JSON.stringify(info))
        return repondre({ statut, erreur: 'Paiement incohérent.' }, 400)
      }
      const { error } = await supabaseAdmin.from('paiements').insert({
        locataire_id: info.locataireId,
        montant,
        date_paiement: new Date().toISOString().split('T')[0],
        mois_concerne: info.moisConcerne,
        transaction_id: token,
      })
      erreurEcriture = error
    } else {
      return repondre({ statut, erreur: 'Type inconnu.' }, 400)
    }

    // 4. Anti-rejeu : si déjà enregistré (webhook + retour), c'est un succès
    if (erreurEcriture) {
      if (erreurEcriture.code === '23505') {
        return repondre({ statut: 'paid', type: info.type, deja: true })
      }
      console.error('Écriture échouée:', erreurEcriture.message)
      return repondre({ statut, erreur: "Échec de l'enregistrement." }, 500)
    }

    return repondre({ statut: 'paid', type: info.type })
  } catch (err) {
    console.error('verifier:', err)
    return repondre({ erreur: 'Erreur serveur.' }, 500)
  }
})