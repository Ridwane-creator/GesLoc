import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ouvrirPaiementKkiapay, useKkiapayListener } from '../lib/kkiapay';
import { ArrowLeft, CheckCircle2, Loader2, User } from 'lucide-react';

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function libelleMois(cle) {
  const [annee, mois] = cle.split('-');
  return `${MOIS_LABELS[Number(mois) - 1]} ${annee}`;
}

function formaterDate(dateIso) {
  return new Date(dateIso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PaiementPublic() {
  const [searchParams] = useSearchParams();
  const locataireId = searchParams.get('locataire');
  const moisConcerne = searchParams.get('mois'); // Format: YYYY-MM-01

  const [locataire, setLocataire] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [paiementEnCours, setPaiementEnCours] = useState(false);
  const [paiementReussi, setPaiementReussi] = useState(false);

  useEffect(() => {
    if (!locataireId || !moisConcerne) {
      setErreur('Lien invalide : paramètres manquants.');
      setChargement(false);
      return;
    }

    // Récupérer les infos du locataire (en mode public, on limite les données exposées)
    supabase
      .from('locataires')
      .select('id, nom, telephone, loyer_mensuel_du, logement_id, logements!inner(nom)')
      .eq('id', locataireId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setErreur('Locataire introuvable ou lien expiré.');
          setChargement(false);
          return;
        }
        setLocataire(data);
        setChargement(false);
      });
  }, [locataireId, moisConcerne]);

  // Écouter le succès du paiement Kkiapay
  useKkiapayListener((detail) => {
    // Le paiement a réussi côté widget, on vérifie avec notre edge function
    setPaiementEnCours(true);

    supabase.functions.invoke('verify-kkiapay-paiement-locataire', {
      body: {
        transactionId: detail.transaction_id,
        locataireId: locataireId,
        moisConcerne: moisConcerne
      }
    })
    .then(({ data, error }) => {
      if (error) {
        setErreur(`Vérification échouée : ${error.message}`);
        setPaiementEnCours(false);
        return;
      }

      if (data && data.succes) {
        setPaiementReussi(true);
      } else {
        setErreur('Paiement non confirmé par nos systèmes.');
        setPaiementEnCours(false);
      }
    })
    .catch((err) => {
      setErreur(`Erreur lors de la vérification : ${err.message}`);
      setPaiementEnCours(false);
    });
  });

  const gererPaiement = () => {
    if (!locataire) return;

    // Utiliser le loyer mensuel du locataire comme montant à payer
    const montantAPayer = locataire.loyer_mensuel_du;

    // Ouvrir le widget Kkiapay
    ouvrirPaiementKkiapay({
      montant: montantAPayer,
      numero: locataire.telephone // Optionnel : pré-remplir le numéro si disponible
    });
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
            aria-label="Retour à la page précédente"
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

  if (paiementReussi) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Paiement effectué avec succès</h2>
          <p className="text-slate-500 text-sm mb-6">
            Merci {locataire.nom}! Votre paiement de {Number(locataire.loyer_mensuel_du).toLocaleString('fr-FR')} FCFA
            pour {libelleMois(moisConcerne)} a bien été enregistré.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
            aria-label="Retour à l'accueil"
          >
            Retour à l'accueil
          </button>
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
              Logement : {locataire.logements?.nom || 'Non spécifié'}
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
                    {libelleMois(moisConcerne)}
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