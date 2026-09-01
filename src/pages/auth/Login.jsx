import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { construireIdentifiant, messageErreurAuth } from '../../lib/authHelpers';
import AuthLayout from '../../components/AuthLayout';

export default function Login() {
  const navigate = useNavigate();

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const gererConnexion = async (evenement) => {
    evenement.preventDefault();
    setErreur(null);

    if (!identifiant.trim() || !motDePasse) {
      setErreur('Merci de renseigner ton email/téléphone et ton mot de passe.');
      return;
    }

    setChargement(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      ...construireIdentifiant(identifiant),
      password: motDePasse,
    });

    setChargement(false);

    if (error) {
      setErreur(messageErreurAuth(error));
      return;
    }

    if (data?.session) {
      navigate('/dashboard');
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Bon retour parmi nous</h2>
      <p className="text-slate-500 text-sm mb-6">
        Connecte-toi pour accéder à ton tableau de bord.
      </p>

      {erreur && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {erreur}
        </div>
      )}

      <form onSubmit={gererConnexion} className="space-y-4">
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={motDePasseVisible ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
              autoComplete="current-password"
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
          Se connecter
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Nouveau sur GesLoc ?{' '}
        <Link to="/signup" className="text-[#4F46E5] font-medium hover:underline">
          Créer un compte gratuitement
        </Link>
      </p>
    </AuthLayout>
  );
}