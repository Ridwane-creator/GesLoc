import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('DEBUG SUPABASE: URL =', import.meta.env.VITE_SUPABASE_URL)
console.log('DEBUG SUPABASE: ANON KEY =', import.meta.env.VITE_SUPABASE_ANON_KEY ? '[DÉFINIE]' : '[INDÉFINIE]')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erreur : Variables d\'environnement Supabase manquantes !')
  console.error('Vérifiez votre fichier .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/*
  Exemples d'utilisation rapide (à adapter dans les hooks) :

  // Inscription
  const { data, error } = await supabase.auth.signUp({ email, password })

  // Connexion
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // Récupérer l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser()

  // Lire les logements du propriétaire connecté (RLS filtre automatiquement)
  const { data, error } = await supabase.from('logements').select('*')

  // Ajouter un logement
  const { data, error } = await supabase
    .from('logements')
    .insert({ nom, adresse, proprietaire_id: user.id })

  // Ajouter un paiement
  const { data, error } = await supabase
    .from('paiements')
    .insert({ locataire_id, montant, date_paiement, mois_concerne })

  // Appeler la fonction de calcul du solde
  const { data, error } = await supabase.rpc('calculer_solde_locataire', {
    p_locataire_id: locataireId,
    p_mois: '2026-08-01',
  })
*/