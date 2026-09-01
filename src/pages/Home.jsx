import { Link } from 'react-router-dom'
import heroImage from '../assets/hero.jpg'

export default function Home() {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${heroImage})` }}
    >
      {/* Voile sombre pour la lisibilité du texte sur la photo */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/85 via-purple-950/80 to-indigo-950/85" />

      <div className="relative z-10 flex min-h-screen flex-col justify-between px-6 py-10 sm:px-12 lg:px-16">
        {/* En-tête : logo à gauche, boutons à droite */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
              <span className="text-sm font-bold text-indigo-700">G</span>
            </div>
            <span className="text-lg font-semibold">GesLoc</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Se connecter
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              S'inscrire
            </Link>
          </div>
        </header>

        {/* Corps principal */}
        <main className="max-w-xl py-16">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Gérez votre patrimoine avec{' '}
            <span className="text-indigo-300">précision</span>.
          </h1>

          <p className="mt-5 max-w-md text-white/80">
            La plateforme de gestion immobilière n°1 pour les propriétaires en
            Afrique. Suivez vos revenus en FCFA et automatisez vos quittances.
          </p>

          <ul className="mt-10 space-y-6">
            {[
              {
                titre: 'Suivi des Paiements',
                description:
                  "Gardez un œil sur chaque versement, qu'il soit fait par virement ou Mobile Money.",
              },
              {
                titre: 'Analyses Financières',
                description:
                  'Visualisez vos revenus mensuels attendus vs collectés avec des graphiques clairs.',
              },
              {
                titre: 'Gestion Locative',
                description:
                  'Centralisez toutes les fiches de vos locataires et leurs contrats de bail.',
              },
            ].map((item) => (
              <li key={item.titre} className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-400/20 text-indigo-300">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold">{item.titre}</p>
                  <p className="text-sm text-white/70">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </main>

        {/* Pied de page */}
        <footer className="flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            </svg>
            <span>Sécurité de niveau bancaire</span>
          </div>
          <span>© 2026 GesLoc</span>
        </footer>
      </div>
    </div>
  )
}
