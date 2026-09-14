import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function usePlan() {
  const [plan, setPlan] = useState('gratuit')
  const [loading, setLoading] = useState(true)

  const rafraichir = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setPlan(user?.user_metadata?.plan || 'gratuit')
    setLoading(false)
  }, [])

  useEffect(() => {
    rafraichir()
  }, [rafraichir])

  async function activerPlan(nouveauPlan) {
    const { error } = await supabase.auth.updateUser({
      data: { plan: nouveauPlan },
    })
    if (!error) setPlan(nouveauPlan)
    return { error }
  }

  return {
    plan,
    loading,
    estGratuit: plan === 'gratuit',
    estPro: plan === 'pro',
    estAgence: plan === 'agence',
    peutUtiliserRappels: plan === 'pro' || plan === 'agence',
    activerPlan,
    rafraichir,
  }
}