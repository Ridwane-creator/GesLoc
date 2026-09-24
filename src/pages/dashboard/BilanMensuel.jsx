import { useState, useEffect, useMemo, useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../lib/supabaseClient'
import { useLogements } from '../../hooks/useLogements'
import { useAbonnement } from '../../hooks/useAbonnement'
import StatusBadge from '../../components/StatusBadge'
import MiseEnPage from '../../components/MiseEnPage'
import ModalMiseANiveau from '../../components/ModalMiseaniveau'
import { Lock } from 'lucide-react'
import { getStatusConfig } from '../../lib/utils/statusConstants'

const NOMS_MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export default function BilanMensuel() {
  const { logements } = useLogements()
  const { estGratuit } = useAbonnement()
  const [modalMiseANiveauOuverte, setModalMiseANiveauOuverte] = useState(false)
  const [moisIndex, setMoisIndex] = useState(new Date().getMonth())
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Construit directement "AAAA-MM-01" sans passer par toISOString(), pour éviter
  // le décalage de fuseau horaire (toISOString() convertit en UTC, ce qui peut
  // faire basculer minuit heure locale sur le jour précédent au Bénin, UTC+1).
  const moisISO = useMemo(() => {
    const mm = String(moisIndex + 1).padStart(2, '0')
    return `${annee}-${mm}-01`
  }, [annee, moisIndex])

  const chargerBilan = useCallback(async () => {
    setLoading(true)
    setError(null)

    // 1. Get logement IDs
    const idsLogements = logements.map((l) => l.id)
    if (idsLogements.length === 0) {
      setLignes([])
      setLoading(false)
      return
    }

    // 2. Fetch locataires with logement join to get logementNom
    const { data: locatairesData, error: erreurLocataires } = await supabase
      .from('locataires')
      .select(`
        id,
        nom,
        loyer_mensuel_du,
        logements!inner (
          nom
        )
      `)
      .in('logement_id', idsLogements)

    if (erreurLocataires) {
      setError(erreurLocataires.message)
      setLoading(false)
      return
    }

    // 3. Batch compute solde for all locataires via new RPC
    const locataireIds = locatairesData.map(l => l.id)
    const { data: soldesData, error: erreurSoldes } = await supabase
      .rpc('calculer_soldes_locataires', {
        p_locataire_ids: locataireIds,
        p_mois: moisISO
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

    // 4. Batch fetch paiements du mois for all locataires
    const { data: paiementsData, error: erreurPaiements } = await supabase
      .from('paiements')
      .select('locataire_id, montant')
      .in('locataire_id', locataireIds)
      .eq('mois_concerne', moisISO)

    if (erreurPaiements) {
      setError(erreurPaiements.message)
      setLoading(false)
      return
    }

    // Create a map of locataire_id -> totalPaye (sum of montant for the month)
    const totalPayeMap = {}
    paiementsData.forEach(paiement => {
      const locId = paiement.locataire_id
      const montant = Number(paiement.montant) || 0
      totalPayeMap[locId] = (totalPayeMap[locId] || 0) + montant
    })

    // 5. Build final lignes array
    const lignes = locatairesData.map(locataire => {
      const solde = soldeMap[locataire.id] ?? 0
      let statut = 'retard'
      if (typeof solde === 'number') {
        statut = solde > 0 ? 'retard' : solde === 0 ? 'paye' : 'avance'
      } else {
        console.warn(`Solde non numérique pour le locataire ${locataire.id}:`, solde)
      }

      const totalPaye = totalPayeMap[locataire.id] || 0

      return {
        id: locataire.id,
        nom: locataire.nom,
        logementNom: locataire.logements.nom,
        loyerDu: locataire.loyer_mensuel_du,
        totalPaye,
        statut,
      }
    })

    setLignes(lignes)
    setLoading(false)
  }, [logements, moisISO])

  useEffect(() => {
    chargerBilan()
  }, [moisISO, logements])

  // No longer needing paiements-modifiés event listener since real-time updates are handled via useLocataires hook

  const totalCollecte = lignes.reduce((s, l) => s + l.totalPaye, 0)

  function exporterPDF() {
    if (estGratuit) {
      setModalMiseANiveauOuverte(true)
      return
    }

    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.setTextColor(79, 70, 229)
    doc.text('MyGesLoc — Bilan mensuel', 14, 18)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`${NOMS_MOIS[moisIndex]} ${annee}`, 14, 25)
    doc.text(`Total collecté : ${totalCollecte.toLocaleString('fr-FR')} FCFA`, 14, 31)

    autoTable(doc, {
      startY: 38,
      head: [['Locataire', 'Logement', 'Loyer dû', 'Payé', 'Statut']],
      body: lignes.map((l) => [
        l.nom,
        l.logementNom,
        `${Number(l.loyerDu).toLocaleString('fr-FR')} FCFA`,
        `${l.totalPaye.toLocaleString('fr-FR')} FCFA`,
        getStatusConfig(l.statut).label,
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    })

    doc.save(`bilan-${NOMS_MOIS[moisIndex].toLowerCase()}-${annee}.pdf`)
  }

  return (
    <MiseEnPage>
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">Bilan Mensuel</h1>
            <p className="text-sm text-slate-500">Récapitulatif des loyers par mois.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={moisIndex}
              onChange={(e) => setMoisIndex(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {NOMS_MOIS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <button
              onClick={exporterPDF}
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              {estGratuit && <Lock className="w-3.5 h-3.5" />}
              Exporter en PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
            Total collecté — {NOMS_MOIS[moisIndex]} {annee}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {totalCollecte.toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lignes.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-10">
              Aucun locataire à afficher pour ce mois.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Locataire</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Logement</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Loyer dû</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Payé (ce mois)</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut global</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{l.nom}</td>
                      <td className="px-4 py-3 text-slate-600">{l.logementNom}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {Number(l.loyerDu).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {l.totalPaye.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge statut={l.statut} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ModalMiseANiveau
        ouverte={modalMiseANiveauOuverte}
        onFermer={() => setModalMiseANiveauOuverte(false)}
        fonctionnalite="L'export PDF du bilan"
      />
    </MiseEnPage>
  )
}