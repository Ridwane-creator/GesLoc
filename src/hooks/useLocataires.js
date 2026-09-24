import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Hook pour récupérer les locataires (tous logements confondus) du propriétaire connecté,
// avec leur statut du mois en cours calculé via la fonction RPC (solde cumulé depuis
// la date d'entrée du locataire — voir calculer_solde_locataire).
//
// Convention : solde > 0 => en retard | solde = 0 => à jour | solde < 0 => en avance.
// On utilise directement cette valeur, sans reconstruction : la fonction SQL fait
// déjà tout le calcul correctement.
export function useLocataires(logementId = null) {
  const [locataires, setLocataires] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchLocataires() {
    setLoading(true)
    setError(null)

    // 1. Fetch logements to get IDs and noms
    const { data: logements, error: erreurLogements } = await supabase
      .from('logements')
      .select('id, nom')

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

    // 2. Fetch locataires with logement join to get logementNom in one query
    const { data: locatairesData, error: erreurLocataires } = await supabase
      .from('locataires')
      .select(`
        id,
        nom,
        telephone,
        loyer_mensuel_du,
        date_entree,
        date_echeance,
        rappels_actifs,
        created_at,
        logements!inner (
          nom
        )
      `)
      .in('logement_id', idsLogements)
      .order('created_at', { ascending: false })

    if (erreurLocataires) {
      setError(erreurLocataires.message)
      setLoading(false)
      return
    }

    // 3. Batch compute solde for all locataires via new RPC
    const maintenant = new Date()
    const mm = String(maintenant.getMonth() + 1).padStart(2, '0')
    const moisCourantISO = `${maintenant.getFullYear()}-${mm}-01`

    const locataireIds = locatairesData.map(l => l.id)

    const { data: soldesData, error: erreurSoldes } = await supabase
      .rpc('calculer_soldes_locataires', {
        p_locataire_ids: locataireIds,
        p_mois: moisCourantISO
      })

    if (erreurSoldes) {
      setError(erreurSoldes.message)
      setLoading(false)
      return
    }

    // Create a map of locataire_id -> solde
    const soldeMap = {}
    soldesData.forEach(row => {
      soldeMap[row.locataire_id] = Number(row.solde)
    })

    // 4. Build final locataires array with logementNom and solde/statut
    const locatairesAvecStatut = locatairesData.map(locataire => {
      const solde = soldeMap[locataire.id] ?? 0
      let statut = 'retard'
      if (typeof solde === 'number') {
        statut = solde > 0 ? 'retard' : solde === 0 ? 'paye' : 'avance'
      } else {
        console.warn(`Solde non numérique pour le locataire ${locataire.id}:`, solde)
      }

      return {
        ...locataire,
        logementNom: locataire.logements.nom,
        solde,
        statut,
      }
    })

    setLocataires(locatairesAvecStatut)
    setLoading(false)
  }

  useEffect(() => {
    fetchLocataires()

    const channels = []

    const locatairesChannel = supabase
      .channel('locataires-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locataires' }, () => {
        fetchLocataires()
      })
    channels.push(locatairesChannel)

    const paiementsChannel = supabase
      .channel('paiements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, () => {
        fetchLocataires()
      })
    channels.push(paiementsChannel)

    channels.forEach((channel) => channel.subscribe())

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        channels.forEach((channel) => {
          try { channel.unsubscribe() } catch (e) {}
        })
      } else if (document.visibilityState === 'visible') {
        channels.forEach((channel) => {
          try { channel.subscribe() } catch (e) {}
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      channels.forEach((channel) => {
        try { channel.unsubscribe() } catch (e) {}
        supabase.removeChannel(channel)
      })
    }
  }, [logementId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { locataires, loading, error, refresh: fetchLocataires }
}