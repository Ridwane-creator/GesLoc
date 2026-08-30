// TODO Clotilde — Bilan mensuel (liste + total collecté)
import { useState, useEffect, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../lib/supabaseClient'
import { useLogements } from '../../hooks/useLogements'
import StatusBadge from '../../components/StatusBadge'

const NOMS_MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const LABEL_STATUT = { paye: 'À jour', retard: 'En retard', avance: 'En avance' }

export default function BilanMensuel() {
  const { logements } = useLogements()
  const [moisIndex, setMoisIndex] = useState(new Date().getMonth())
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Date "premier jour du mois" au format attendu par la RPC (ex: 2026-08-01)
  const moisISO = useMemo(() => {
    const d = new Date(annee, moisIndex, 1)
    return d.toISOString().slice(0, 10)
  }, [annee, moisIndex])

  useEffect(() => {
    async function chargerBilan() {
      setLoading(true)
      setError(null)

      const idsLogements = logements.map((l) => l.id)
      if (idsLogements.length === 0) {
        setLignes([])
        setLoading(false)
        return
      }

      const { data: locataires, error: erreurLocataires } = await supabase
        .from('locataires')
        .select('*')
        .in('logement_id', idsLogements)

      if (erreurLocataires) {
        setError(erreurLocataires.message)
        setLoading(false)
        return
      }

      const bilan = await Promise.all(
        (locataires || []).map(async (locataire) => {
          const { data: solde } = await supabase.rpc('calculer_solde_locataire', {
            p_locataire_id: locataire.id,
            p_mois: moisISO,
          })

          const { data: paiementsDuMois } = await supabase
            .from('paiements')
            .select('montant')
            .eq('locataire_id', locataire.id)
            .eq('mois_concerne', moisISO)

          const totalPaye = (paiementsDuMois || []).reduce(
            (s, p) => s + Number(p.montant || 0), 0
          )

          let statut = 'retard'
          if (solde === 0) statut = 'paye'
          else if (solde < 0) statut = 'avance'

          const logement = logements.find((l) => l.id === locataire.logement_id)

          return {
            id: locataire.id,
            nom: locataire.nom,
            logementNom: logement?.nom || '—',
            loyerDu: locataire.loyer_mensuel_du,
            totalPaye,
            statut,
          }
        })
      )

      setLignes(bilan)
      setLoading(false)
    }

    chargerBilan()
  }, [moisISO, logements])

  const totalCollecte = lignes.reduce((s, l) => s + l.totalPaye, 0)

  function exporterPDF() {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.setTextColor(79, 70, 229) // indigo, couleur de marque
    doc.text('GesLoc — Bilan mensuel', 14, 18)

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
        LABEL_STATUT[l.statut] || l.statut,
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    })

    doc.save(`bilan-${NOMS_MOIS[moisIndex].toLowerCase()}-${annee}.pdf`)
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
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
            className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700"
          >
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

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lignes.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">
            Aucun locataire à afficher pour ce mois.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Locataire</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Logement</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Loyer dû</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Payé</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut</th>
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
        )}
      </div>
    </div>
  )
}
