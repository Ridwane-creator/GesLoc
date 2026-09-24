import { useState, useMemo, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { useLogements } from '../../hooks/useLogements'
import { useLocataires } from '../../hooks/useLocataires'
import { useAbonnement } from '../../hooks/useAbonnement'
import StatusBadge from '../../components/StatusBadge'
import MiseEnPage from '../../components/MiseEnPage'
import { getStatusConfig } from '../../lib/utils/statusConstants'
import BoutonRappelWhatsApp from '../../components/BoutonRappelWhatsApp'
import { Lock } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const COULEURS_DONUT = { paye: '#10b981', retard: '#ef4444', avance: '#3b82f6' }
// LABEL_STATUT remplacé par getStatusConfig provenant de ../lib/utils/statusConstants

export default function Dashboard() {
  const { logements } = useLogements()
  const [filtreLogement, setFiltreLogement] = useState('')
  const { locataires, loading, error, refresh } = useLocataires(filtreLogement || null)
  const { plan, estGratuit } = useAbonnement()

  // Calcul du total collecté : ce qui a été effectivement payé envers le loyer dû
  // Pour chaque locataire : loyer mensuel - partie positive du solde (ce qui reste dû)
  const totalCollecte = locataires.reduce((accumulateur, locataire) => {
    const loyerMensuel = Number(locataire.loyer_mensuel_du || 0);
    const solde = Number(locataire.solde || 0);
    const resteDu = Math.max(solde, 0); // Ce qui reste dû (seulement si positif)
    const paye = loyerMensuel - resteDu; // Ce qui a été payé envers le loyer
    return accumulateur + paye;
  }, 0);

  // Total attendu : somme de tous les loyers mensuels dus
  const totalAttendu = locataires.reduce((accumulateur, locataire) => {
    return accumulateur + Number(locataire.loyer_mensuel_du || 0);
  }, 0);

  // Reste à percevoir : somme de ce qui reste dû pour chaque locataire
  const resteAPercevoir = locataires.reduce((accumulateur, locataire) => {
    const solde = Number(locataire.solde || 0);
    return accumulateur + Math.max(solde, 0); // Seulement la partie positive du solde
  }, 0);
  const nbRetard = locataires.filter((l) => l.statut === 'retard').length

  const repartition = useMemo(() => {
    return ['paye', 'retard', 'avance']
      .map((statut) => ({
        name: getStatusConfig(statut).label,
        cle: statut,
        value: locataires.filter((l) => l.statut === statut).length,
      }))
      .filter((d) => d.value > 0)
  }, [locataires])

  // Évolution sur 6 mois : approximation à partir du loyer total attendu
  // (une évolution précise mois par mois nécessiterait d'interroger la table
  // paiements pour chaque mois — à affiner si Freddy expose une RPC dédiée).
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

  // State for rappel modal and toggle
  const [modalMiseANiveauOuverte, setModalMiseANiveauOuverte] = useState(false)
  const [raisonBlocage, setRaisonBlocage] = useState('')
  const [rappelEnCours, setRappelEnCours] = useState(null)

  // Function to toggle rappel status
  async function gererBasculeRappels(locataire) {
    const nouvelEtat = !locataire.rappels_actifs

    // Optimistic update: we'll rely on refresh after supabase call
    setRappelEnCours(locataire.id)

    const { error } = await supabase
      .from('locataires')
      .update({ rappels_actifs: nouvelEtat })
      .eq('id', locataire.id)

    setRappelEnCours(null)

    if (error) {
      alert(
        "Impossible d'activer/désactiver les rappels. Vérifie que la colonne 'rappels_actifs' existe bien sur la table locataires."
      )
    } else {
      // Refresh to get updated data
      refresh()
    }
  }

  // No longer needing locataires-modifiés event listener since useLocataires hook handles real-time updates

  if (loading) {
    return (
      <MiseEnPage>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      </MiseEnPage>
    )
  }

  return (
    <MiseEnPage>
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tableau de Bord
            {filtreLogement ? (
              <span className="ml-2 text-xs text-slate-500">
                — {logements.find(l => l.id === filtreLogement)?.nom || 'Logement inconnu'}
              </span>
            ) : (
              <span className="ml-2 text-xs text-slate-500"> — Tous les logements</span>
            )}
          </h1>
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

      {/* Cartes stats */}
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

      {/* Graphiques */}
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

      {/* Liste des locataires */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Locataires — statut du mois</h3>
        {locataires.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Aucun locataire à afficher.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Locataire</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Logement</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Loyer mensuel</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Rappel</th>
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
                    <td className="px-4 py-3">
                      {/* Rappel toggle/padlock */}
                      {estGratuit ? (
                        // Free mode: Locked padlock
                        <div className="flex items-center justify-center">
                          <div
                            onClick={() => {
                              setRaisonBlocage('Le rappel automatique');
                              setModalMiseANiveauOuverte(true);
                            }}
                            className="w-10 h-10 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Lock className="w-6 h-6 text-slate-400" />
                          </div>
                        </div>
                      ) : (
                        // Paid mode: Toggle switch
                        <div className="flex items-center justify-center">
                          <label className="relative inline-flex h-6 w-11 items-center">
                            <input
                              type="checkbox"
                              checked={l.rappels_actifs}
                              onChange={(e) => gererBasculeRappels(l)}
                              disabled={rappelEnCours === l.id}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-200 dark:peer-focus:ring-indigo-100 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 transition ease-in-out duration-200">
                              <div className={`absolute inset-0 ${l.rappels_actifs ? 'translate-x-5 bg-gray-100' : 'translate-x-0'} rounded-full bg-white peer-focus:ring-indigo-600 peer-hover:cursor-pointer transition ease-in-out duration-200 shadow-lg ${!l.rappels_actifs ? 'opacity-75' : ''}`} />
                            </div>
                          </label>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </MiseEnPage>
  )
}