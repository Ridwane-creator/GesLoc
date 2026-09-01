import Sidebar from './Sidebar'

// Enveloppe les pages privées (dashboard, logements, etc.) avec la barre
// de navigation latérale, comme sur la maquette.
export default function MiseEnPage({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
