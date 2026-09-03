import { Building2, LineChart, Users } from 'lucide-react';
import logo from '../assets/logo.svg';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl">
        {/* Panneau de marque, à gauche */}
        <div
          className="hidden md:flex flex-col justify-between p-10 text-white"
          style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          }}
        >
          <div className="flex items-center gap-2">
            <img src={logo} alt="GesLoc" className="w-8 h-8 rounded-full" />
            <span className="text-lg font-semibold">GesLoc</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold leading-tight mb-4">
              Gérez vos loyers avec précision.
            </h1>
            <p className="text-white/80 mb-8">
              Suivez vos revenus locatifs en FCFA, sans cahier papier.
            </p>

            <ul className="space-y-4 text-sm text-white/90">
              <li className="flex items-start gap-3">
                <LineChart className="w-5 h-5 mt-0.5 shrink-0" />
                <span>Visualisez les loyers collectés vs attendus, mois par mois.</span>
              </li>
              <li className="flex items-start gap-3">
                <Users className="w-5 h-5 mt-0.5 shrink-0" />
                <span>Centralisez tous vos logements et locataires.</span>
              </li>
              <li className="flex items-start gap-3">
                <Building2 className="w-5 h-5 mt-0.5 shrink-0" />
                <span>Sachez d'un coup d'œil qui est à jour, en retard ou en avance.</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-white/60">© 2026 GesLoc</p>
        </div>

        {/* Formulaire, à droite */}
        <div className="bg-white p-8 sm:p-10 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}