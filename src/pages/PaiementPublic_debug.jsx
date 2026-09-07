import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ouvrirPaiementKkiapay, useKkiapayListener } from '../lib/kkiapay';
import { CheckCircle2, Loader2, User } from 'lucide-react';

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function libelleMois(cle) {
  const [annee, mois] = cle.split('-');
  return `${MOIS_LABELS[Number(mois) - 1]} ${annee}`;
}

export default function PaiementPublic() {
  const { locataireId, moisConcerne } = useParams();

  // Convertir en chaîne de caractères et supprimer les espaces blancs éventuels
  const cleanLocataireId = locataireId?.toString().trim() || '';
  const cleanMoisConcerne = moisConcerne?.toString().trim() || '';

  console.log('PAIEMENT_PUBLIC_DEBUG: Raw params - locataireId:', locataireId, 'type:', typeof locataireId);
  console.log('PAIEMENT_PUBLIC_DEBUG: Raw params - moisConcerne:', moisConcerne, 'type:', typeof moisConcerne);
  console.log('PAIEMENT_PUBLIC_DEBUG: After cleaning - cleanLocataireId:', cleanLocataireId, 'length:', cleanLocataireId.length);
  console.log('PAIEMENT_PUBLIC_DEBUG: After cleaning - cleanMoisConcerne:', cleanMoisConcerne, 'length:', cleanMoisConcerne.length);

  const [locataire, setLocataire] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [paiementEnCours, setPaiementEnCours] = useState(false);
  const [paiementReussi, setPaiementReussi] = useState(false);

  useEffect(() => {
    if (!cleanLocataireId || !cleanMoisConcerne) {
      setErreur('Lien invalide : paramètres manquants.');
      setChargement(false);
      return;
    }

    console.log('PAIEMENT_PUBLIC_DEBUG: About to query Supabase with ID:', cleanLocataireId);

    // Récupérer les infos du locataire (en mode public, on limite les données exposées)
    supabase
      .from('locataires')
      .select('id, nom, telephone, loyer_mensuel_du, logement_id, logements(nom)')
      .filter('id', 'ilike', cleanLocataireId)
      .single()
      .then(({ data, error }) => {
        console.log('PAIEMENT_PUBLIC_DEBUG: Supabase response:', { data, error });

        if (error) {
          console.log('PAIEMENT_PUBLIC_DEBUG: Supabase error:', error);
          setErreur('Locataire introuvable ou lien expiré.');
          setChargement(false);
          return;
        }
        if (!data) {
          console.log('PAIEMENT_PUBLIC_DEBUG: No data returned');
          setErreur('Locataire introuvable ou lien expiré.');
          setChargement(false);
          return;
        }
        console.log('PAIEMENT_PUBLIC_DEBUG: Locataire found:', data);
        setLocataire(data);
        setChargement(false);
      })
      .catch((err) => {
        console.log('PAIEMENT_PUBLIC_DEBUG: Error during Supabase request:', err);
        setErreur('Erreur lors de la récupération des informations : ' + err.message);
        setChargement(false);
      });
  }, [cleanLocataireId, cleanMoisConcerne]);

  // Écouter le succès du paiement Kkiapay
  useKkiapayListener((detail) => {
    // Le paiement a réussi côté widget, on vérifie avec notre edge function
    setPaiementEnCours(true);

    // Vérifier que les détails de l'événement sont valides
    if (!detail || !detail.transaction_id) {
      setErreur('Détails de paiement incomplets reçus.');
      setPaiementEnCours(false);
      return;
    }

    supabase.functions.invoke('verify-kkiapay-paiement-locataire', {
      body: {
        transactionId: detail.transaction_id,
        locataireId: cleanLocataireId,
        moisConcerne: cleanMoisConcerne
      }
    })
    .then(({ data, error }) => {
      // Journaliser la réponse pour le débogage (supprimer en production)
      console.log('Réponse de l\'edge function verify-kkiapay-paiement-locataire:', { data, error });

      if (error) {
        setErreur(`Vérification échouée : ${error.message}`);
        setPaiementEnCours(false);
        return;
      }

      // Vérifier le succès avec différentes possibilités de format de réponse
      const isSuccessful =
        data && (
          data.succes === true ||
          data.success === true ||
          (data.data && (data.data.succes === true || data.data.success === true)) ||
          (typeof data === 'boolean' && data === true)
        );

      if (isSuccessful) {
        setPaiementReussi(true);
      } else {
        setErreur('Paiement non confirmé par nos systèmes.');
        setPaiementEnCours(false);
      }
    })
    .catch((err) => {
      setErreur(`Erreur lors de la vérification : ${err.message}`);
      console.error('Erreur lors de l\'appel à l\'edge function:', err);
      setPaiementEnCours(false);
    });
  });

  const gererPaiement = () => {
    if (!locataire) return;

    // Utiliser le loyer mensuel du locataire comme montant à payer
    const montantAPayer = locataire.loyer_mensuel_du;

    // Vérifier que le montant est valide
    if (typeof montantAPayer !== 'number' || isNaN(montantAPayer) || montantAPayer <= 0) {
      setErreur('Montant de paiement invalide.');
      setChargement(false);
      return;
    }

    // Ouvrir le widget Kkiapay
    try {
      ouvrirPaiementKkiapay({
        montant: montantAPayer,
        numero: locataire.telephone && locataire.telephone.trim() !== '' ? locataire.telephone.trim() : undefined
      });
    } catch (error) {
      setErreur(`Erreur lors de l'ouverture du widget de paiement : ${error.message}`);
      setChargement(false);
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
            pour {libelleMois(cleanMoisConcerne)} a bien été enregistré.
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