import Sidebar from './Sidebar'

// Enveloppe les pages privées (dashboard, logements, etc.) avec la barre
// de navigation latérale.
// Mobile : barre du haut puis contenu (colonne). Desktop (md+) : sidebar à gauche (ligne).
export default function MiseEnPage({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}