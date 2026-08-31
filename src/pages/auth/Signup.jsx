import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { construireIdentifiant, messageErreurAuth } from '../../lib/authHelpers';
import AuthLayout from '../../components/AuthLayout';

export default function Signup() {
  const navigate = useNavigate();

  const [nom, setNom] = useState('');
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [inscriptionReussie, setInscriptionReussie] = useState(false);

  const gererInscription = async (evenement) => {
    evenement.preventDefault();
    setErreur(null);

    if (!nom.trim() || !identifiant.trim() || !motDePasse) {
      setErreur('Merci de remplir tous les champs.');
      return;
    }

    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setChargement(true);

    const { data, error } = await supabase.auth.signUp({
      ...construireIdentifiant(identifiant),
      password: motDePasse,
      options: {
        data: { nom: nom.trim() },
      },
    });

    setChargement(false);

    if (error) {
      setErreur(messageErreurAuth(error));
      return;
    }

    if (data?.session) {
      navigate('/dashboard');
      return;
    }

    // Certaines configs Supabase exigent une confirmation par email/SMS
    setInscriptionReussie(true);
  };

  if (inscriptionReussie) {
    return (
      <AuthLayout>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Compte créé 🎉</h2>
        <p className="text-slate-500 text-sm mb-6">
          Vérifie ta boîte mail (ou tes SMS) pour confirmer ton compte, puis connecte-toi.
        </p>
        <Link
          to="/login"
          className="inline-block text-center w-full py-2.5 rounded-lg text-white font-medium text-sm"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          Aller à la connexion
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Créer un compte</h2>
      <p className="text-slate-500 text-sm mb-6">
        Gère tes loyers en quelques minutes.
      </p>

      {erreur && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {erreur}
        </div>
      )}

      <form onSubmit={gererInscription} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Mamadou Diallo"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
              autoComplete="name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email ou téléphone
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="exemple@gesloc.com"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={motDePasseVisible ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Au moins 6 caractères"
              className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setMotDePasseVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {motDePasseVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={chargement}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          {chargement && <Loader2 className="w-4 h-4 animate-spin" />}
          Créer mon compte
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Déjà un compte ?{' '}
        <Link to="/login" className="text-[#4F46E5] font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}