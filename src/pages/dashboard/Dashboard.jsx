import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { useLogements } from '../../hooks/useLogements'
import { useLocataires } from '../../hooks/useLocataires'
import StatusBadge from '../../components/StatusBadge'

const COULEURS_DONUT = { paye: '#10b981', retard: '#ef4444', avance: '#3b82f6' }
const LABEL_STATUT = { paye: 'Payé', retard: 'En retard', avance: 'Avance' }

export default function Dashboard() {
  const { logements } = useLogements()
  const [filtreLogement, setFiltreLogement] = useState('')
  const { locataires, loading, error } = useLocataires(filtreLogement || null)

  const totalCollecte = locataires
    .filter((l) => l.statut === 'paye' || l.statut === 'avance')
    .reduce((s, l) => s + Number(l.loyer_mensuel_du || 0), 0)
  const totalAttendu = locataires.reduce((s, l) => s + Number(l.loyer_mensuel_du || 0), 0)
  const resteAPercevoir = Math.max(totalAttendu - totalCollecte, 0)
  const nbRetard = locataires.filter((l) => l.statut === 'retard').length

  const repartition = useMemo(() => {
    return ['paye', 'retard', 'avance']
      .map((statut) => ({
        name: LABEL_STATUT[statut],
        cle: statut,
        value: locataires.filter((l) => l.statut === statut).length,
      }))
      .filter((d) => d.value > 0)
  }, [locataires])

  const evolution = useMemo(() => {
    const mois = []
    const maintenant = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1)
      mois.push({
        mois: d.toLocaleDateString('fr-FR', { month: 'short' }),
        attendu: totalAttendu,
        collecte: i === 0 ? totalCollecte : null,
      })
    }
    return mois
  }, [totalAttendu, totalCollecte])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
          <p className="text-sm text-slate-500">Aperçu financier de ton patrimoine.</p>
        </div>
        <select
          value={filtreLogement}
          onChange={(e) => setFiltreLogement(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600"
        >
          <option value="">Tous les logements</option>
          {logements.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Loyers Collectés</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalCollecte.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Reste à Percevoir</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{resteAPercevoir.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Retards de Paiement</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{nbRetard}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Locataires Suivis</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{locataires.length}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Évolution des Loyers (FCFA)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolution}>
              <defs>
                <linearGradient id="degradeAire" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} FCFA`} />
              <Area type="monotone" dataKey="attendu" stroke="#cbd5e1" fill="none" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="collecte" stroke="#4F46E5" fill="url(#degradeAire)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Répartition Statuts</h3>
          {repartition.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Pas encore de données.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={repartition} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                  {repartition.map((entry) => (
                    <Cell key={entry.cle} fill={COULEURS_DONUT[entry.cle]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Locataires — statut du mois</h3>
        {locataires.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Aucun locataire à afficher.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
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