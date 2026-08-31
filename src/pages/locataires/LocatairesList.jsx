import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../../components/Modal';
import LocataireForm from './LocataireForm';

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
  const [rappelEnCours, setRappelEnCours] = useState(null);

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

    setEnregistrement(true);

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

  async function gererBasculeRappels(locataire) {
    const nouvelEtat = !locataire.rappels_actifs;

    setLocataires((precedent) =>
      precedent.map((l) => (l.id === locataire.id ? { ...l, rappels_actifs: nouvelEtat } : l))
    );
    setRappelEnCours(locataire.id);

    const { error } = await supabase
      .from('locataires')
      .update({ rappels_actifs: nouvelEtat })
      .eq('id', locataire.id);

    setRappelEnCours(null);

    if (error) {
      setLocataires((precedent) =>
        precedent.map((l) =>
          l.id === locataire.id ? { ...l, rappels_actifs: !nouvelEtat } : l
        )
      );
      alert(
        "Impossible d'activer/désactiver les rappels. Vérifie que la colonne 'rappels_actifs' existe bien sur la table locataires."
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/logements"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#4F46E5] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux logements
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Locataires {logement ? `— ${logement.nom}` : ''}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gère les locataires de ce logement.
            </p>
          </div>
          <button
            onClick={ouvrirModalCreation}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            <Plus className="w-4 h-4" />
            Nouveau locataire
          </button>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Locataire</th>
                  <th className="text-left px-5 py-3 font-medium">Loyer mensuel</th>
                  <th className="text-left px-5 py-3 font-medium">Échéance</th>
                  <th className="text-left px-5 py-3 font-medium">Rappels</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locataires.map((locataire) => (
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
                      <button
                        onClick={() => gererBasculeRappels(locataire)}
                        disabled={rappelEnCours === locataire.id}
                        role="switch"
                        aria-checked={!!locataire.rappels_actifs}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                          locataire.rappels_actifs ? 'bg-[#4F46E5]' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            locataire.rappels_actifs ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
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
                ))}
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
    </div>
  );
}