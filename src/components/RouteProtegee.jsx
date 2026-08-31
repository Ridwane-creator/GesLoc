import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/**
 * Enveloppe une route pour exiger un utilisateur connecté.
 * Utilisation dans routes.jsx :
 *   <Route path="/logements" element={<RouteProtegee><LogementsList /></RouteProtegee>} />
 *
 * Tant que la session est en cours de vérification, affiche un loader.
 * Si aucun utilisateur n'est connecté, redirige vers /login.
 */
export default function RouteProtegee({ children }) {
  const [session, setSession] = useState(undefined); // undefined = en cours de vérification

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, nouvelleSession) => {
      setSession(nouvelleSession);
    });

    return () => abonnement.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}