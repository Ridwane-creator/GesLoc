// TODO Clotilde — Vue d'ensemble avec code couleur + compteur global
import { useState, useMemo } from 'react'
import { useLogements } from '../../hooks/useLogements'
import { useLocataires } from '../../hooks/useLocataires'
import StatusBadge from '../../components/StatusBadge'

export default function Dashboard() {
  const { logements, loading: loadingLogements } = useLogements()
  const [filtreLogement, setFiltreLogement] = useState('')
  const { locataires, loading: loadingLocataires, error } = useLocataires(
    filtreLogement || null
  )

  const compteur = useMemo(() => {
    const total = locataires.length
    const aJour = locataires.filter((l) => l.statut === 'paye' || l.statut === 'avance').length
    const enRetard = locataires.filter((l) => l.statut === 'retard').length
    const totalDu = locataires.reduce((s, l) => s + Number(l.loyer_mensuel_du || 0), 0)
    return { total, aJour, enRetard, totalDu }
  }, [locataires])

  const loading = loadingLogements || loadingLocataires

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
          <p className="text-sm text-slate-500">
            Vue d'ensemble de tes locataires et de leurs statuts du mois.
          </p>
        </div>
        <select
          value={filtreLogement}
          onChange={(e) => setFiltreLogement(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Tous les logements</option>
          {logements.map((l) => (
            <option key={l.id} value={l.id}>{l.nom}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Compteur global */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
            Locataires suivis
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{compteur.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
            À jour
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">{compteur.aJour}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
            En retard
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">{compteur.enRetard}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
            Total loyers dus (mois)
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {compteur.totalDu.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
      </div>

      {/* Liste des locataires avec statut */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : locataires.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">
            Aucun locataire à afficher pour ce filtre.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Locataire</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Logement</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Loyer mensuel</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut</th>
              </tr>
            </thead>
            <tbody>
              {locataires.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{l.nom}</td>
                  <td className="px-4 py-3 text-slate-600">{l.logementNom}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {Number(l.loyer_mensuel_du).toLocaleString('fr-FR')} FCFA
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

