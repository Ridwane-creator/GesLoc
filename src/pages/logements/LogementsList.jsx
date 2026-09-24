import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../../components/Modal';
import ModalMiseANiveau from '../../components/ModalMiseaniveau';
import { useAbonnement } from '../../hooks/useAbonnement';

const ETAT_INITIAL_FORMULAIRE = { nom: '', adresse: '' };

// Limite de logements par plan. Agence = illimité (Infinity).
const LIMITES_LOGEMENTS = { gratuit: 1, pro: 4, agence: Infinity };

export default function LogementsList() {
  const navigate = useNavigate();
  const { plan, estGratuit } = useAbonnement();
  const limiteActuelle = LIMITES_LOGEMENTS[plan] ?? LIMITES_LOGEMENTS.gratuit;

  const [logements, setLogements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [modalOuverte, setModalOuverte] = useState(false);
  const [modalMiseANiveauOuverte, setModalMiseANiveauOuverte] = useState(false);
  const [logementEnEdition, setLogementEnEdition] = useState(null);
  const [formulaire, setFormulaire] = useState(ETAT_INITIAL_FORMULAIRE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState(null);

  const [suppressionEnCours, setSuppressionEnCours] = useState(null);
  const [suppressionTousEnCours, setSuppressionTousEnCours] = useState(false);

  useEffect(() => {
    chargerLogements();
  }, []);

  async function chargerLogements() {
    setChargement(true);
    setErreur(null);

    const { data: { user }, error: erreurUtilisateur } = await supabase.auth.getUser();

    if (erreurUtilisateur || !user) {
      setErreur('Tu dois être connecté(e) pour voir tes logements.');
      setChargement(false);
      return;
    }

    const { data, error } = await supabase
      .from('logements')
      .select('*')
      .eq('proprietaire_id', user.id)
      .order('nom', { ascending: true });

    if (error) {
      setErreur("Impossible de charger les logements. Réessaie dans un instant.");
    } else {
      setLogements(data || []);
    }

    setChargement(false);
  }

  function ouvrirModalCreation() {
    setLogementEnEdition(null);
    setFormulaire(ETAT_INITIAL_FORMULAIRE);
    setErreurFormulaire(null);
    setModalOuverte(true);
  }

  function gererClicNouveauLogement() {
    // Limite de logements selon le plan actif (1 en gratuit, 4 en pro, illimité en agence).
    if (logements.length >= limiteActuelle) {
      setModalMiseANiveauOuverte(true);
      return;
    }
    ouvrirModalCreation();
  }

  function ouvrirModalEdition(logement) {
    setLogementEnEdition(logement);
    setFormulaire({ nom: logement.nom, adresse: logement.adresse || '' });
    setErreurFormulaire(null);
    setModalOuverte(true);
  }

  function fermerModal() {
    setModalOuverte(false);
  }

  async function gererSoumission(evenement) {
    evenement.preventDefault();
    setErreurFormulaire(null);

    if (!formulaire.nom.trim()) {
      setErreurFormulaire('Le nom du logement est obligatoire.');
      return;
    }

    // Double vérification côté soumission (au cas où l'état local serait
    // désynchronisé), en plus du contrôle déjà fait au clic du bouton.
    if (!logementEnEdition && logements.length >= limiteActuelle) {
      setErreurFormulaire(
        `Ton plan actuel est limité à ${limiteActuelle} logement${limiteActuelle > 1 ? 's' : ''}. Passe à un plan supérieur pour en ajouter davantage.`
      );
      return;
    }

    setEnregistrement(true);

    if (logementEnEdition) {
      const { error } = await supabase
        .from('logements')
        .update({ nom: formulaire.nom.trim(), adresse: formulaire.adresse.trim() })
        .eq('id', logementEnEdition.id);

      setEnregistrement(false);

      if (error) {
        setErreurFormulaire("La modification a échoué. Réessaie.");
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setEnregistrement(false);
        setErreurFormulaire("Tu dois être connecté(e) pour ajouter un logement.");
        return;
      }

      const { error } = await supabase.from('logements').insert({
        proprietaire_id: user.id,
        nom: formulaire.nom.trim(),
        adresse: formulaire.adresse.trim(),
      });

      setEnregistrement(false);

      if (error) {
        setErreurFormulaire("La création a échoué. Réessaie.");
        return;
      }
    }

    setModalOuverte(false);
    chargerLogements();
  }

  async function gererSuppression(logement) {
    const { count, error: erreurComptage } = await supabase
      .from('locataires')
      .select('*', { count: 'exact', head: true })
      .eq('logement_id', logement.id);

    if (erreurComptage) {
      alert("Impossible de vérifier les locataires liés à ce logement. Réessaie.");
      return;
    }

    if (count > 0) {
      alert(
        `Impossible de supprimer "${logement.nom}" : ${count} locataire(s) y sont encore rattaché(s). Retire-les d'abord.`
      );
      return;
    }

    const confirmation = window.confirm(
      `Supprimer définitivement le logement "${logement.nom}" ?`
    );
    if (!confirmation) return;

    setSuppressionEnCours(logement.id);

    const { error } = await supabase.from('logements').delete().eq('id', logement.id);

    setSuppressionEnCours(null);

    if (error) {
      alert('La suppression a échoué. Réessaie.');
      return;
    }

    setLogements((precedent) => precedent.filter((l) => l.id !== logement.id));
  }

  async function gererSuppressionTousLogements() {
    const confirmation = window.confirm(
      'Supprimer définitivement tous les logements ? Cette action supprimera également tous les locataires associés à ces logements.'
    );
    if (!confirmation) return;

    setSuppressionTousEnCours(true);

    try {
      // Get current user
      const { data: { user }, error: erreurUtilisateur } = await supabase.auth.getUser();
      if (erreurUtilisateur || !user) {
        setSuppressionTousEnCours(false);
        alert('Tu dois être connecté(e) pour effectuer cette action.');
        return;
      }

      // First, delete all locataires associated with user's logements
      const { data: logementsUtilisateur, error: erreurLogements } = await supabase
        .from('logements')
        .select('id')
        .eq('proprietaire_id', user.id);

      if (erreurLogements) {
        throw new Error('Impossible de charger les logements.');
      }

      if (logementsUtilisateur && logementsUtilisateur.length > 0) {
        const logementIds = logementsUtilisateur.map(l => l.id);

        // Delete locataires associated with these logements
        const { error: erreurLocataires } = await supabase
          .from('locataires')
          .delete()
          .in('logement_id', logementIds);

        if (erreurLocataires) {
          throw new Error('Impossible de supprimer les locataires associés.');
        }
      }

      // Delete all logements for the user
      const { error: erreurSuppressionLogements } = await supabase
        .from('logements')
        .delete()
        .eq('proprietaire_id', user.id);

      if (erreurSuppressionLogements) {
        throw new Error('Impossible de supprimer les logements.');
      }

      // Refresh the list
      setLogements([]);
    } catch (error) {
      alert(`Erreur lors de la suppression : ${error.message}`);
    } finally {
      setSuppressionTousEnCours(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Logements</h1>
            <p className="text-slate-500 text-sm mt-1">
              Gère la liste de tes biens immobiliers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={gererClicNouveauLogement}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              <Plus className="w-4 h-4" />
              Ajouter un logement
            </button>
            <button
              onClick={gererSuppressionTousLogements}
              disabled={suppressionTousEnCours || logements.length === 0}
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
            Chargement des logements...
          </div>
        )}

        {!chargement && erreur && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {erreur}
          </div>
        )}

        {!chargement && !erreur && logements.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Aucun logement pour l'instant. Ajoute ton premier bien.
            </p>
          </div>
        )}

        {!chargement && !erreur && logements.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {logements.map((logement) => (
              <div
                key={logement.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[#4F46E5]" />
                      </div>
                      <h3 className="font-semibold text-slate-900">{logement.nom}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => ouvrirModalEdition(logement)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50"
                        aria-label="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => gererSuppression(logement)}
                        disabled={suppressionEnCours === logement.id}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label="Supprimer"
                      >
                        {suppressionEnCours === logement.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {logement.adresse && (
                    <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {logement.adresse}
                    </p>
                  )}
                </div>

                <Link
                  to={`/locataires/${logement.id}`}
                  className="flex items-center gap-1.5 text-sm text-[#4F46E5] font-medium mt-4 hover:underline"
                >
                  <Users className="w-4 h-4" />
                  Voir les locataires
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        ouverte={modalOuverte}
        titre={logementEnEdition ? 'Modifier le logement' : 'Ajouter un logement'}
        onFermer={fermerModal}
      >
        {erreurFormulaire && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {erreurFormulaire}
          </div>
        )}

        <form onSubmit={gererSoumission} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du logement
            </label>
            <input
              type="text"
              value={formulaire.nom}
              onChange={(e) => setFormulaire((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Ex : Résidence Horizon"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              value={formulaire.adresse}
              onChange={(e) => setFormulaire((f) => ({ ...f, adresse: e.target.value }))}
              placeholder="Ex : Cocody, Abidjan"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
            />
          </div>

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
              {logementEnEdition ? 'Enregistrer' : 'Ajouter'}
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
  );
}