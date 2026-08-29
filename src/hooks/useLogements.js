import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Hook pour Anaïs — gestion des logements du propriétaire connecté
export function useLogements() {
  const [logements, setLogements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchLogements() {
    setLoading(true)
    const { data, error } = await supabase
      .from('logements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setLogements(data)
    setLoading(false)
  }

  async function addLogement({ nom, adresse }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('logements')
      .insert({ nom, adresse, proprietaire_id: user.id })

    if (error) throw new Error(error.message)
    await fetchLogements()
  }

  async function deleteLogement(id) {
    const { error } = await supabase.from('logements').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetchLogements()
  }

  useEffect(() => {
    fetchLogements()
  }, [])

  return { logements, loading, error, addLogement, deleteLogement, refresh: fetchLogements }
}
