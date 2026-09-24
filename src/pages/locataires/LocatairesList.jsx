import { useEffect, useState, useRef } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2, Lock, Pencil, Phone, Plus, Trash2, Users, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../../components/Modal';
import LocataireForm from './LocataireForm';
import { useLocataires } from '../../hooks/useLocataires';
import StatusBadge from '../../components/StatusBadge';
import { useAbonnement } from '../../hooks/useAbonnement';
import ModalMiseANiveau from '../../components/ModalMiseaniveau';
import { validatePhone, formatPhone } from '../../lib/utils/phoneUtils';
import { getCurrentMonthISO } from '../../lib/utils/dateUtils';

// Utilisons getCurrentMonthISO() qui retourne déjà YYYY-MM-01

const LIMITE_LOCATAIRES_GRATUIT = 4; // Au total, tous logements confondus.

const ETAT_INITIAL_FORMULAIRE = {
  nom: '',
  paysCode: '+225',
  numeroLocal: '',
  loyer_mensuel_du: '',
  date_echeance: '',
};

export default function LocatairesList() {
  const { logementId } = useParams();

  const [logement, setLogement] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const { locataires, loading: chargementLocataires, error: erreurLocataires, refresh: refreshLocataires } = useLocataires(logementId);
  const { plan, estGratuit, chargement: chargementAbonnement } = useAbonnement();

  const [modalOuverte, setModalOuverte] = useState(false);
  const [locataireEnEdition, setLocataireEnEdition] = useState(null);
  const [formulaire, setFormulaire] = useState(ETAT_INITIAL_FORMULAIRE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState(null);

  const [suppressionEnCours, setSuppressionEnCours] = useState(null);
  const [suppressionTousEnCours, setSuppressionTousEnCours] = useState(false);
  const [rappelEnCours, setRappelEnCours] = useState(null);
  const [modalMiseANiveauOuverte, setModalMiseANiveauOuverte] = useState(false);
  const [raisonBlocage, setRaisonBlocage] = useState('');
  const [copyingId, setCopyingId] = useState(null);
  const copyingTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyingTimeoutRef.current) {
        clearTimeout(copyingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function chargerLogement() {
      setChargement(true);
      setErreur(null);

      const { data: logementData, error: erreurLogement } = await supabase
        .from('logements')
        .select('*')
        .eq('id', logementId)
        .single();

      if (erreurLogement) {
        setErreur("Impossible de trouver ce logement.");
        setChargement(false);
        return;
      }

      setLogement(logementData);
      setChargement(false);
    }

    chargerLogement();
  }, [logementId]);

  function ouvrirModalCreation() {
    setLocataireEnEdition(null);
    setFormulaire(ETAT_INITIAL_FORMULAIRE);
    setErreurFormulaire(null);
    setModalOuverte(true);
  }

  function ouvrirModalEdition(locataire) {
    setLocataireEnEdition(locataire);
    const telephone = locataire.telephone || '';
    let paysCode = '+225';
    let numeroLocal = telephone;

    if (telephone.startsWith('+229')) {
      paysCode = '+229';
      numeroLocal = telephone.substring(4);
    } else if (telephone.startsWith('+225')) {
      paysCode = '+225';
      numeroLocal = telephone.substring(4);
    }

    setFormulaire({
      nom: locataire.nom,
      paysCode,
      numeroLocal: numeroLocal.trim(),
      loyer_mensuel_du: locataire.loyer_mensuel_du ?? '',
      date_echeance: locataire.date_echeance || '',
    });
    setErreurFormulaire(null);
    setModalOuverte(true);
  }

  function fermerModal() {
    setModalOuverte(false);
  }

  // Fonction de validation du téléphone remplacée par validatePhone provenant de ../lib/utils/phoneUtils

  async function gererSoumission(evenement) {
    evenement.preventDefault();
    setErreurFormulaire(null);

    if (!formulaire.nom.trim()) {
      setErreurFormulaire('Le nom du locataire est obligatoire.');
      return;
    }
    if (!formulaire.loyer_mensuel_du || Number(formulaire.loyer_mensuel_du) <= 0) {
      setErreurFormulaire('Le loyer mensuel doit être un montant valide.');
      return;
    }
    if (!validatePhone(formulaire.paysCode, formulaire.numeroLocal)) {
      setErreurFormulaire('Le numéro de téléphone est invalide. Format attendu : +229 XX XX XX XX ou +225 XX XX XX XX');
      return;
    }

    // Vérifier la limite pour les utilisateurs gratuits : 4 locataires MAXIMUM
    // AU TOTAL (tous logements confondus), pas juste sur ce logement précis.
    // On requête le total réel plutôt que de se fier à `locataires` (qui n'est
    // scopé qu'au logement courant via useLocataires(logementId)).
    if (estGratuit && !locataireEnEdition) {
      const { count, error: erreurComptage } = await supabase
        .from('locataires')
        .select('*', { count: 'exact', head: true });

      if (!erreurComptage && count >= LIMITE_LOCATAIRES_GRATUIT) {
        setErreurFormulaire(
          `Le plan gratuit est limité à ${LIMITE_LOCATAIRES_GRATUIT} locataires au total. Passe à un plan Pro ou Agence pour en ajouter davantage.`
        );
        return;
      }
    }

    setEnregistrement(true);

    const telephoneComplet = formatPhone(formulaire.paysCode, formulaire.numeroLocal);

    const donnees = {
      nom: formulaire.nom.trim(),
      telephone: telephoneComplet,
      loyer_mensuel_du: Number(formulaire.loyer_mensuel_du),
      date_echeance: formulaire.date_echeance ? Number(formulaire.date_echeance) : null,
    };

    let erreurEcriture;

    if (locataireEnEdition) {
      const { error } = await supabase
        .from('locataires')
        .update(donnees)
        .eq('id', locataireEnEdition.id);
      erreurEcriture = error;
    } else {
      const { error } = await supabase
        .from('locataires')
        .insert({ ...donnees, logement_id: logementId });
      erreurEcriture = error;
    }

    setEnregistrement(false);

    if (erreurEcriture) {
      setErreurFormulaire("L'enregistrement a échoué. Réessaie.");
      return;
    }

    setModalOuverte(false);
    refreshLocataires();
  }

  async function gererSuppression(locataire) {
    const { count, error: erreurComptage } = await supabase
      .from('paiements')
      .select('*', { count: 'exact', head: true })
      .eq('locataire_id', locataire.id);

    if (erreurComptage) {
      alert('Impossible de vérifier les paiements liés à ce locataire. Réessaie.');
      return;
    }

    if (count > 0) {
      alert(
        `Impossible de supprimer "${locataire.nom}" : ${count} paiement(s) sont déjà enregistrés pour lui. Conserve-le pour garder l'historique.`
      );
      return;
    }

    const confirmation = window.confirm(
      `Supprimer définitivement le locataire "${locataire.nom}" ?`
    );
    if (!confirmation) return;

    setSuppressionEnCours(locataire.id);

    const { error } = await supabase.from('locataires').delete().eq('id', locataire.id);

    setSuppressionEnCours(null);

    if (error) {
      alert('La suppression a échoué. Réessaie.');
      return;
    }

    refreshLocataires();
    window.dispatchEvent(new Event('locataires-modifiés'));
  }

  async function gererBasculeRappels(locataire) {
    if (estGratuit) {
      setRaisonBlocage('Le rappel automatique');
      setModalMiseANiveauOuverte(true);
      return;
    }

    const nouvelEtat = !locataire.rappels_actifs;

    setRappelEnCours(locataire.id);

    const { error } = await supabase
      .from('locataires')
      .update({ rappels_actifs: nouvelEtat })
      .eq('id', locataire.id);

    setRappelEnCours(null);

    if (error) {
      alert(
        "Impossible d'activer/désactiver les rappels. Vérifie que la colonne 'rappels_actifs' existe bien sur la table locataires."
      );
    } else {
      refreshLocataires();
    }
  }

  async function gererSuppressionTousLocataires() {
    const confirmation = window.confirm(
      'Supprimer définitivement tous les locataires de ce logement ? Cette action est irréversible.'
    );
    if (!confirmation) return;

    setSuppressionTousEnCours(true);

    try {
      // Delete all locataires for the current logement
      const { error } = await supabase
        .from('locataires')
        .delete()
        .eq('logement_id', logementId);

      if (error) {
        throw new Error('Impossible de supprimer les locataires.');
      }

      // Refresh the list
      refreshLocataires();
      window.dispatchEvent(new Event('locataires-modifiés'));
    } catch (error) {
      alert(`Erreur lors de la suppression : ${error.message}`);
    } finally {
      setSuppressionTousEnCours(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <RouterLink
          to="/logements"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#4F46E5] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux logements
        </RouterLink>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Locataires {logement ? `— ${logement.nom}` : ''}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gère les locataires de ce logement.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={ouvrirModalCreation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              <Plus className="w-4 h-4" />
              Nouveau locataire
            </button>
            <button
              onClick={gererSuppressionTousLocataires}
              disabled={suppressionTousEnCours}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)' }}
            >
              {suppressionTousEnCours ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer tous</span>
                </>
              )}
            </button>
          </div>
        </div>

        {chargementLocataires && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Chargement des locataires...
          </div>
        )}

        {!chargementLocataires && erreurLocataires && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {erreurLocataires}
          </div>
        )}

        {!chargementLocataires && !erreurLocataires && locataires.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Aucun locataire pour l'instant dans ce logement.
            </p>
          </div>
        )}

        {!chargement && !erreur && locataires.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Locataire</th>
                  <th className="text-left px-5 py-3 font-medium">Loyer mensuel</th>
                  <th className="text-left px-5 py-3 font-medium">Échéance</th>
                  <th className="text-left px-5 py-3 font-medium">Statut</th>
                  <th className="text-left px-5 py-3 font-medium">Rappels</th>
                  <th className="text-left px-5 py-3 font-medium">Lien de paiement</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locataires.map((locataire) => {
                  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
                  const lienPaiement = `${baseUrl}/payer/${locataire.id}/${getCurrentMonthISO()}`;
                  return (
                    <tr key={locataire.id} className="border-t border-slate-100">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">{locataire.nom}</div>
                        {locataire.telephone && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {locataire.telephone}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {Number(locataire.loyer_mensuel_du).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {locataire.date_echeance || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge statut={locataire.statut} />
                      </td>
                      <td className="px-5 py-4">
  {estGratuit ? (
    // Free mode: Show locked padlock that shows upgrade modal when clicked
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
    // Paid mode: Working toggle switch
    <div className="flex items-center justify-center">
      <label className="relative inline-flex h-6 w-11 items-center">
        <input
          type="checkbox"
          checked={locataire.rappels_actifs}
          onChange={(e) => {
            gererBasculeRappels(locataire);
          }}
          disabled={rappelEnCours === locataire.id}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-200 dark:peer-focus:ring-indigo-100 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 transition ease-in-out duration-200">
          <div className={`absolute inset-0 ${
            locataire.rappels_actifs ? 'translate-x-5 bg-gray-100' : 'translate-x-0'
          } rounded-full bg-white peer-focus:ring-indigo-600 peer-hover:cursor-pointer transition ease-in-out duration-200 shadow-lg ${!locataire.rappels_actifs ? 'opacity-75' : ''}`} />
        </div>
        </label>
      </div>
  )}
</td>
                      <td className="px-5 py-4 text-slate-600 text-sm">
                        <div className="flex items-center gap-2">
                          <a
                            href={lienPaiement}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-4 h-4 text-[#4F46E5]"
                            title="Lien de paiement"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </a>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(lienPaiement);
                              setCopyingId(locataire.id);
                              if (copyingTimeoutRef.current) {
                                clearTimeout(copyingTimeoutRef.current);
                              }
                              copyingTimeoutRef.current = setTimeout(() => {
                                setCopyingId(null);
                              }, 1500);
                            }}
                            className="p-1 text-[#4F46E5] hover:text-[#4F46E5]/80"
                            title="Copier le lien"
                          >
                            {copyingId === locataire.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => ouvrirModalEdition(locataire)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50"
                            aria-label="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => gererSuppression(locataire)}
                            disabled={suppressionEnCours === locataire.id}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                            aria-label="Supprimer"
                          >
                            {suppressionEnCours === locataire.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        ouverte={modalOuverte}
        titre={locataireEnEdition ? 'Modifier le locataire' : 'Nouveau locataire'}
        onFermer={fermerModal}
      >
        {erreurFormulaire && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {erreurFormulaire}
          </div>
        )}

        <form onSubmit={gererSoumission} className="space-y-4">
          <LocataireForm formulaire={formulaire} setFormulaire={setFormulaire} />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={fermerModal}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={enregistrement}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              {enregistrement && <Loader2 className="w-4 h-4 animate-spin" />}
              {locataireEnEdition ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      <ModalMiseANiveau
        ouverte={modalMiseANiveauOuverte}
        onFermer={() => setModalMiseANiveauOuverte(false)}
        fonctionnalite={raisonBlocage}
      />
    </div>
  );
}