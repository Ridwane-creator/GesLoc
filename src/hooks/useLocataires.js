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

    // Construit directement "AAAA-MM-01" sans passer par toISOString(), pour éviter
    // tout risque de décalage de fuseau horaire (voir le bug corrigé dans BilanMensuel.jsx).
    const maintenant = new Date()
    const mm = String(maintenant.getMonth() + 1).padStart(2, '0')
    const moisCourantISO = `${maintenant.getFullYear()}-${mm}-01`

    const locatairesAvecStatut = await Promise.all(
      (locatairesData || []).map(async (locataire) => {
        const { data: solde, error: erreurSolde } = await supabase.rpc(
          'calculer_solde_locataire',
          { p_locataire_id: locataire.id, p_mois: moisCourantISO }
        )

        let statut = 'retard'
        if (!erreurSolde && typeof solde === 'number') {
          statut = solde > 0 ? 'retard' : solde === 0 ? 'paye' : 'avance'
        } else {
          console.warn(`Erreur de calcul du solde pour le locataire ${locataire.id} :`, erreurSolde)
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
        window.dispatchEvent(new Event('paiements-modifiés'))
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