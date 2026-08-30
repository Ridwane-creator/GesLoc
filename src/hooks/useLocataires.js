import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Hook pour récupérer les locataires (tous logements confondus) du propriétaire connecté,
// avec leur statut du mois en cours calculé via la fonction RPC de Freddy.
export function useLocataires(logementId = null) {
  const [locataires, setLocataires] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchLocataires() {
    setLoading(true)
    setError(null)

    // 1. Récupérer les logements du propriétaire connecté (RLS filtre déjà)
    let requeteLogements = supabase.from('logements').select('id, nom')
    const { data: logements, error: erreurLogements } = await requeteLogements
    if (erreurLogements) {
      setError(erreurLogements.message)
      setLoading(false)
      return
    }

    const idsLogements = logementId
      ? [logementId]
      : (logements || []).map((l) => l.id)

    if (idsLogements.length === 0) {
      setLocataires([])
      setLoading(false)
      return
    }

    // 2. Récupérer les locataires de ces logements
    const { data: locatairesData, error: erreurLocataires } = await supabase
      .from('locataires')
      .select('*')
      .in('logement_id', idsLogements)
      .order('created_at', { ascending: false })

    if (erreurLocataires) {
      setError(erreurLocataires.message)
      setLoading(false)
      return
    }

    // 3. Calculer le statut du mois courant pour chaque locataire via la RPC de Freddy
    const premierJourMoisCourant = new Date()
    premierJourMoisCourant.setDate(1)
    const moisCourantISO = premierJourMoisCourant.toISOString().slice(0, 10)

    const locatairesAvecStatut = await Promise.all(
      (locatairesData || []).map(async (locataire) => {
        const { data: solde, error: erreurSolde } = await supabase.rpc(
          'calculer_solde_locataire',
          { p_locataire_id: locataire.id, p_mois: moisCourantISO }
        )

        let statut = 'retard'
        if (!erreurSolde && solde !== null) {
          if (solde === 0) statut = 'paye'
          else if (solde < 0) statut = 'avance'
          else statut = 'retard'
        }

        const logement = (logements || []).find((l) => l.id === locataire.logement_id)

        return {
          ...locataire,
          logementNom: logement?.nom || '—',
          solde,
          statut,
        }
      })
    )

    setLocataires(locatairesAvecStatut)
    setLoading(false)
  }

  useEffect(() => {
    fetchLocataires()
  }, [logementId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { locataires, loading, error, refresh: fetchLocataires }
}

