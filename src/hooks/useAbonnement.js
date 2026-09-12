import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Renvoie le plan actif du propriétaire connecté ('gratuit' par défaut si
// aucun abonnement payant actif n'existe encore en base).
export function useAbonnement() {
  const [plan, setPlan] = useState('gratuit')
  const [chargement, setChargement] = useState(true)

  async function chargerPlan() {
    setChargement(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setPlan('gratuit')
      setChargement(false)
      return
    }

    const { data, error } = await supabase
      .from('abonnements')
      .select('plan')
      .eq('proprietaire_id', user.id)
      .eq('statut', 'actif')
      .order('date_souscription', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      setPlan('gratuit')
    } else {
      setPlan(data.plan)
    }

    setChargement(false)
  }

  useEffect(() => {
    chargerPlan()
  }, [])

  return { plan, estGratuit: plan === 'gratuit', chargement, refresh: chargerPlan }
}