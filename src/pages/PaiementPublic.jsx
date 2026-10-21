import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { demarrerPaiementLoyer } from '../lib/moneyfusion';
import { Loader2, User } from 'lucide-react';
import { formatMonthLabel } from '../lib/utils/dateUtils';

export default function PaiementPublic() {
  const { locataireId, moisConcerne } = useParams();

  const cleanLocataireId = locataireId?.toString().trim() || '';
  const cleanMoisConcerne = moisConcerne?.toString().trim() || '';

  const [locataire, setLocataire] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [paiementEnCours, setPaiementEnCours] = useState(false);

  // Set page title and log mount
  useEffect(() => {
    document.title = 'MyGesLoc';
  }, []);

  // Fetch locataire info
  useEffect(() => {
    if (!cleanLocataireId || !cleanMoisConcerne) {
      setErreur('Lien invalide : paramètres manquants.');
      setChargement(false);
      return;
    }

    // Passe par une fonction RPC dédiée (pas un select direct sur la table),
    // car cette page est publique : le visiteur n'est pas authentifié et
    // les règles RLS bloqueraient un accès direct à la table locataires.
    supabase
      .rpc('obtenir_infos_paiement_public', { p_locataire_id: cleanLocataireId })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setErreur('Locataire introuvable ou lien expiré.');
          setChargement(false);
          return;
        }
        setLocataire(data[0]);
        setChargement(false);
      })
      .catch((err) => {
        setErreur(`Erreur lors de la récupération des informations : ${err.message}`);
        setChargement(false);
      });
  }, [cleanLocataireId, cleanMoisConcerne]);

  // Set page title
  useEffect(() => {
    document.title = 'MyGesLoc';
  }, []);

  const gererPaiement = async () => {
    if (!locataire || paiementEnCours) return;

    setPaiementEnCours(true);
    setErreur(null);
    try {
      // Le montant est décidé côté serveur ; on est redirigé vers MoneyFusion
      await demarrerPaiementLoyer({
        locataireId: cleanLocataireId,
        moisConcerne: cleanMoisConcerne,
      });
    } catch (error) {
      setErreur(error.message);
      setPaiementEnCours(false);
    }
  };

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">{erreur}</p>
          <button
            onClick={() => window.history.back()}
            className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!locataire) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-500">Locataire non trouvé.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <User className="w-6 h-6 text-[#4F46E5]" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Paiement de loyer pour {locataire.nom}
            </h1>

            <p className="text-slate-500 mb-6">
              Logement : {locataire.logement_nom || 'Non spécifié'}
            </p>

            <div className="bg-[#F8FAFC] rounded-xl p-6 mb-6">
              <div className="text-sm font-medium text-slate-700 mb-3">
                Résumé du paiement
              </div>

              <div className="space-y-4 text-lg">
                <div className="flex justify-between">
                  <span className="text-slate-500">Montant du loyer</span>
                  <span className="font-medium text-slate-900">
                    {Number(locataire.loyer_mensuel_du).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Période concernée</span>
                  <span className="font-medium text-slate-900">
                    {formatMonthLabel(cleanMoisConcerne)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={gererPaiement}
              disabled={paiementEnCours}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              {paiementEnCours ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement du paiement...</span>
                </>
              ) : (
                <span>Payer maintenant</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}