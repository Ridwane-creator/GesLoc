import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Search, Trash2, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useCalculSolde } from '../../hooks/useCalculSolde';
import { useLocataires } from '../../hooks/useLocataires';
import { getCurrentMonthISO, formatMonthLabel, formatDate } from '../../lib/utils/dateUtils';

export default function NouveauPaiement() {
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const [locataireSelectionne, setLocataireSelectionne] = useState(null);

  const [montant, setMontant] = useState('');
  const [datePaiement, setDatePaiement] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [moisConcerne, setMoisConcerne] = useState(getCurrentMonthISO());

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(false);

  const [historique, setHistorique] = useState([]);
  const [chargementHistorique, setChargementHistorique] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(null);
  const [suppressionTousEnCours, setSuppressionTousEnCours] = useState(false);

  const [soldeLocal, setSoldeLocal] = useState(null);
  const [statutLocal, setStatutLocal] = useState(null);

  const { solde, statut, chargement: chargementSolde } = useCalculSolde(
    locataireSelectionne?.id,
    moisConcerne ? `${moisConcerne}-01` : null
  );

  const soldeAffiche = soldeLocal ?? solde;
  const statutAffiche = statutLocal ?? statut;

  const { locataires, loading: chargementLocataires, error: erreurLocataires, refresh: refreshLocataires } = useLocataires();

  useEffect(() => {
    setSoldeLocal(null);
    setStatutLocal(null);
    if (locataireSelectionne) {
      chargerHistorique(locataireSelectionne.id);
    } else {
      setHistorique([]);
    }
  }, [locataireSelectionne, moisConcerne]);

  async function chargerLocataires() {
  // Function removed - now using useLocataires hook for automatic real-time updates
}

  async function chargerHistorique(locataireId) {
    setChargementHistorique(true);
    const { data, error } = await supabase
      .from('paiements')
      .select('id, montant, date_paiement, mois_concerne')
      .eq('locataire_id', locataireId)
      .order('date_paiement', { ascending: false });
    if (!error) setHistorique(data || []);
    setChargementHistorique(false);
  }

  const locatairesFiltres = locataires.filter((l) =>
    l.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  async function gererSoumission(evenement) {
    evenement.preventDefault();
    setErreur(null);

    if (!locataireSelectionne) {
      setErreur('Sélectionne un locataire.');
      return;
    }
    if (!montant || Number(montant) <= 0) {
      setErreur('Le montant doit être un nombre valide supérieur à 0.');
      return;
    }

    setEnregistrement(true);

    const { error } = await supabase.from('paiements').insert({
      locataire_id: locataireSelectionne.id,
      montant: Number(montant),
      date_paiement: datePaiement,
      mois_concerne: `${moisConcerne}-01`,
    });

    setEnregistrement(false);

    if (error) {
      setErreur("L'enregistrement du paiement a échoué. Réessaie.");
      return;
    }

    setSucces(true);

    // Mettre à jour le solde local après un paiement réussi
    if (locataireSelectionne) {
      const { data: nouveauSolde } = await supabase.rpc('calculer_solde_locataire', {
        p_locataire_id: locataireSelectionne.id,
        p_mois: `${moisConcerne}-01`,
      });

      if (typeof nouveauSolde === 'number') {
        setSoldeLocal(nouveauSolde);
        setStatutLocal(nouveauSolde === 0 ? 'Payé' : nouveauSolde > 0 ? 'En retard' : 'Avance');
      }
    }
  }

  async function annulerPaiement(paiement) {
    const confirmation = window.confirm(
      `Annuler ce paiement de ${Number(paiement.montant).toLocaleString('fr-FR')} FCFA du ${formatDate(paiement.date_paiement)} ? Cette action est définitive.`
    );
    if (!confirmation) return;

    setSuppressionEnCours(paiement.id);

    const { error } = await supabase.from('paiements').delete().eq('id', paiement.id);

    if (error) {
      alert("L'annulation a échoué. Réessaie.");
      setSuppressionEnCours(null);
      return;
    }

    setHistorique((precedent) => precedent.filter((p) => p.id !== paiement.id));

    if (locataireSelectionne) {
      const { data: nouveauSolde } = await supabase.rpc('calculer_solde_locataire', {
        p_locataire_id: locataireSelectionne.id,
        p_mois: `${moisConcerne}-01`,
      });

      if (typeof nouveauSolde === 'number') {
        setSoldeLocal(nouveauSolde);
        setStatutLocal(nouveauSolde === 0 ? 'Payé' : nouveauSolde > 0 ? 'En retard' : 'Avance');
      }
    }

    setSuppressionEnCours(null);
  }

  async function gererSuppressionTousPaiements() {
    if (!locataireSelectionne) {
      alert('Veuillez sélectionner un locataire.');
      return;
    }

    const confirmation = window.confirm(
      `Supprimer définitivement tous les paiements de ${locataireSelectionne.nom} ? Cette action est définitive.`
    );
    if (!confirmation) return;

    setSuppressionTousEnCours(true);

    try {
      const { error } = await supabase
        .from('paiements')
        .delete()
        .eq('locataire_id', locataireSelectionne.id);

      if (error) {
        throw new Error('Impossible de supprimer les paiements.');
      }

      // Reset historique
      setHistorique([]);

      // Reset solde local to recalculate from scratch
      setSoldeLocal(null);
      setStatutLocal(null);

      // Trigger recalculation via the hook
      // The useCalculSolde hook will automatically refetch when its dependencies change
      // But we need to make sure it gets the updated data
      // We'll force a refresh by temporarily setting moisConcerne to null and back
      // Actually, better to just let the hook refetch naturally since locataireSelectionne hasn't changed
      // The hook should refetch when the underlying data changes
    } catch (error) {
      alert(`Erreur lors de la suppression : ${error.message}`);
    } finally {
      setSuppressionTousEnCours(false);
    }
  }

  function nouveauPaiement() {
    setLocataireSelectionne(null);
    setMontant('');
    setDatePaiement(new Date().toISOString().slice(0, 10));
    setMoisConcerne(getCurrentMonthISO());
    setSucces(false);
    setErreur(null);
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Paiement enregistré</h2>
          <p className="text-slate-500 text-sm mb-6">
            Le paiement de {Number(montant).toLocaleString('fr-FR')} FCFA pour{' '}
            {locataireSelectionne?.nom} a bien été enregistré.
          </p>
          <button
            onClick={nouveauPaiement}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            Enregistrer un autre paiement
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full mt-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Retour à la page précédente"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <h1 className="text-2xl font-bold text-slate-900">Enregistrer un paiement</h1>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          Saisis les détails du loyer perçu pour tes registres financiers.
        </p>

        <form onSubmit={gererSoumission}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-slate-900 mb-3">
              1. Sélection du locataire
            </h2>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un locataire..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
              />
            </div>

            {chargementLocataires && (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Chargement des locataires...
              </div>
            )}

            {!chargementLocataires && locatairesFiltres.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">
                Aucun locataire trouvé.
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {locatairesFiltres.map((locataire) => (
                <button
                  key={locataire.id}
                  type="button"
                  onClick={() => setLocataireSelectionne(locataire)}
                  className={`text-left p-3 rounded-lg border ${
                    locataireSelectionne?.id === locataire.id
                      ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#4F46E5]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {locataire.nom}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {locataire.logementNom}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-slate-900 mb-3">
              2. Détails de la transaction
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant perçu (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="250000"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
                />
                {locataireSelectionne && (
                  <p className="text-xs text-slate-400 mt-1">
                    Loyer mensuel standard :{' '}
                    {Number(locataireSelectionne.loyer_mensuel_du).toLocaleString('fr-FR')}{' '}
                    FCFA
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de réception
                </label>
                <input
                  type="date"
                  value={datePaiement}
                  onChange={(e) => setDatePaiement(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Période concernée
                </label>
                <input
                  type="month"
                  value={moisConcerne}
                  onChange={(e) => setMoisConcerne(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
                />
              </div>
            </div>
          </div>

          {erreur && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              {erreur}
            </div>
          )}

          {locataireSelectionne && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
              <h3 className="font-semibold text-slate-900 mb-3">Récapitulatif</h3>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Locataire</dt>
                  <dd className="font-medium text-slate-900">{locataireSelectionne.nom}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Période</dt>
                  <dd className="font-medium text-slate-900">{formatMonthLabel(moisConcerne)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Montant saisi</dt>
                  <dd className="font-medium text-slate-900">
                    {montant ? `${Number(montant).toLocaleString('fr-FR')} FCFA` : '—'}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 pt-4 border-t border-slate-100">
                {chargementSolde && soldeLocal === null && (
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calcul du solde en cours...
                  </p>
                )}
                {(!chargementSolde || soldeLocal !== null) && soldeAffiche !== null && (
                  <p className="text-sm">
                    <span className="text-slate-500">État du solde : </span>
                    <span
                      className={`font-semibold ${
                        statutAffiche === 'Payé'
                          ? 'text-emerald-600'
                          : statutAffiche === 'En retard'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {statutAffiche}
                    </span>{' '}
                    <span className="text-slate-400">
                      ({Math.abs(soldeAffiche).toLocaleString('fr-FR')} FCFA{' '}
                      {statutAffiche === 'En retard' ? 'restant dû' : statutAffiche === 'Avance' ? "d'avance" : ''})
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {locataireSelectionne && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 mb-0">
                  Historique des paiements — {locataireSelectionne.nom}
                </h3>
                <button
                  onClick={gererSuppressionTousPaiements}
                  disabled={suppressionTousEnCours || historique.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)' }}
                >
                  {suppressionTousEnCours ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer tous</span>
                    </>
                  )}
                </button>
              </div>

              {chargementHistorique && (
                <div className="flex items-center justify-center py-6 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Chargement de l'historique...
                </div>
              )}

              {!chargementHistorique && historique.length === 0 && (
                <p className="text-sm text-slate-500 py-4 text-center">
                  Aucun paiement enregistré pour ce locataire.
                </p>
              )}

              {!chargementHistorique && historique.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {historique.map((paiement) => (
                    <div key={paiement.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {Number(paiement.montant).toLocaleString('fr-FR')} FCFA
                        </div>
                        <div className="text-xs text-slate-500">
                          Reçu le {formatDate(paiement.date_paiement)} — {formatMonthLabel(paiement.mois_concerne.slice(0, 7))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => annulerPaiement(paiement)}
                        disabled={suppressionEnCours === paiement.id}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {suppressionEnCours === paiement.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Annuler
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={enregistrement}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            {enregistrement && <Loader2 className="w-4 h-4 animate-spin" />}
            Valider le paiement
          </button>
        </form>
      </div>
    </div>
  );
}