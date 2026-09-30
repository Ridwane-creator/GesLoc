import { useEffect, useState, useRef } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2, Lock, Pencil, Phone, Plus, Trash2, Users, Link as LinkIcon, MessageCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../../components/Modal';
import LocataireForm from './LocataireForm';
import { useLocataires } from '../../hooks/useLocataires';
import { useAbonnement } from '../../hooks/useAbonnement';
import { usePlan } from '../../hooks/usePlan';
import ModalMiseANiveau from '../../components/ModalMiseaniveau';
import { validatePhone, formatPhone } from '../../lib/utils/phoneUtils';
import { getCurrentMonthISO } from '../../lib/utils/dateUtils';
import { genererLienRappelWhatsApp, estVeilleDeLoyer } from '../../lib/whatsapp';

// Utilisons getCurrentMonthISO() qui retourne déjà YYYY-MM-01

const LIMITE_LOCATAIRES_GRATUIT = 4; // Au total, tous logements confondus.

const ETAT_INITIAL_FORMULAIRE = {
  nom: '',
  telephone: '',
  loyer_mensuel_du: '',
  date_echeance: '',
};

export default function LocatairesList() {
  const { logementId } = useParams();

  const [logement, setLogement] = useState(null);
  const [locataires, setLocataires] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [modalOuverte, setModalOuverte] = useState(false);
  const [locataireEnEdition, setLocataireEnEdition] = useState(null); // null = création
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
  const { plan, estGratuit } = useAbonnement();
  const { peutUtiliserRappels } = usePlan();
  const LIMITES_LOGEMENTS = { gratuit: 1, pro: 4, agence: Infinity };
  const limiteActuelle = LIMITES_LOGEMENTS[plan] ?? LIMITES_LOGEMENTS.gratuit;

  useEffect(() => {
    return () => {
      if (copyingTimeoutRef.current) {
        clearTimeout(copyingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    chargerDonnees();
  }, [logementId]);

  async function chargerDonnees() {
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

    const { data, error } = await supabase
      .from('locataires')
      .select('*')
      .eq('logement_id', logementId)
      .order('nom', { ascending: true });

    if (error) {
      setErreur("Impossible de charger les locataires. Réessaie dans un instant.");
    } else {
      setLocataires(data || []);
    }

    setChargement(false);
  }

  function ouvrirModalCreation() {
    setLocataireEnEdition(null);
    setFormulaire(ETAT_INITIAL_FORMULAIRE);
    setErreurFormulaire(null);
    setModalOuverte(true);
  }

  function ouvrirModalEdition(locataire) {
    setLocataireEnEdition(locataire);
    setFormulaire({
      nom: locataire.nom,
      telephone: locataire.telephone || '',
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
      telephone: formulaire.telephone.trim(),
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
    chargerDonnees();
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

    setLocataires((precedent) => precedent.filter((l) => l.id !== locataire.id));
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
      chargerDonnees();
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

        {chargement && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Chargement des locataires...
          </div>
        )}

        {!chargement && erreur && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {erreur}
          </div>
        )}

        {!chargement && !erreur && locataires.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Aucun locataire pour l'instant dans ce logement.
            </p>
          </div>
        )}

        {!chargement && !erreur && locataires.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Locataire
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Loyer mensuel
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Échéance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Lien de paiement
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Rappel WhatsApp
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {locataires.map((locataire) => {
                    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
                    const lienPaiement = `${baseUrl}/payer/${locataire.id}/${getCurrentMonthISO()}`;
                    return (
                      <tr key={locataire.id} className="hover:bg-gray-50 transition-background duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                                <Phone className="w-5 h-5 text-indigo-500" />
                              </div>
                            </div>
                            <div className="flex-1 space-x-2">
                              <h3 className="text-base font-semibold text-gray-900">{locataire.nom}</h3>
                              {locataire.telephone && (
                                <p className="text-xs text-gray-500 flex items-center space-x-1">
                                  <Phone className="w-3 h-3 text-gray-400" /> {locataire.telephone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">
                            <p className="text-base font-medium">{Number(locataire.loyer_mensuel_du).toLocaleString('fr-FR')} <span className="text-xs text-gray-500">FCFA</span></p>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500">
                            {locataire.date_echeance ? (
                              <>
                                <Calendar className="w-4 h-4 text-gray-400 mr-2 inline-block" />
                                <span className="text-sm">{locataire.date_echeance}</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <a
                                href={lienPaiement}
                                target="_blank"
                    rel="noopener noreferrer"
                                className="flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-all duration-200"
                                title="Lien de paiement"
                              >
                                <LinkIcon className="w-5 h-5 text-indigo-500" />
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
                                className="flex items-center justify-center w-10 h-10 text-indigo-600 hover:bg-indigo-50 hover:text-white rounded-full transition-all duration-200 transform hover:scale-105"
                                title="Copier le lien"
                              >
                                {copyingId === locataire.id ? (
                                  <Check className="w-5 h-5" />
                                ) : (
                                  <Copy className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {peutUtiliserRappels ? (
                              // Paid mode: WhatsApp button that generates and sends reminder
                              <button
                                onClick={async () => {
                                  // Check if it's the eve of rent
                                  const estVeille = estVeilleDeLoyer(locataire.date_echeance);
                                  // Generate WhatsApp link
                                  const lienWhatsApp = await genererLienRappelWhatsApp(
                                                locataire,
                                                estVeille
                                              );
                                  // Open WhatsApp with the pre-filled message
                                  window.open(lienWhatsApp, '_blank');
                                }}
                                className="flex items-center justify-center w-10 h-10 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-white rounded-full transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                title="Envoyer un rappel WhatsApp"
                              >
                                <MessageCircle className="w-5 h-5" />
                              </button>
                            ) : (
                              // Free mode: Locked padlock that shows upgrade modal when clicked
                              <button
                                onClick={() => {
                                  setRaisonBlocage('Le rappel automatique');
                                  setModalMiseANiveauOuverte(true);
                                }}
                                className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-full border-2 border-dashed border-gray-300 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <Lock className="w-5 h-5 text-gray-400" />
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => ouvrirModalEdition(locataire)}
                              className="flex items-center justify-center w-10 h-10 text-gray-600 hover:bg-indigo-50 hover:text-white rounded-full transition-all duration-200"
                              aria-label="Modifier"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => gererSuppression(locataire)}
                              disabled={suppressionEnCours === locataire.id}
                              className="flex items-center justify-center w-10 h-10 bg-red-50 text-red-400 hover:bg-red-100 hover:text-white rounded-full transition-all duration-200 transform hover:scale-105"
                              aria-label="Supprimer"
                            >
                              {suppressionEnCours === locataire.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
          fonctionnalite={`Ajouter plus de ${limiteActuelle === Infinity ? '' : limiteActuelle} logement${limiteActuelle > 1 ? 's' : ''}`}
          planCible={plan === 'pro' ? 'Agence' : 'Pro'}
        />
      </div>
    </div>
  );
}