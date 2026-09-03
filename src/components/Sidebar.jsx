import logo from '../assets/logo.svg'
import { NavLink } from 'react-router-dom'

const LIENS = [
  { to: '/dashboard', label: 'Tableau de Bord' },
  { to: '/logements', label: 'Logements' },
  { to: '/paiements/nouveau', label: 'Paiements' },
  { to: '/bilans-mensuels', label: 'Bilans Mensuels' },
  { to: '/abonnement', label: 'Abonnement' },
]

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5">
        <img src={logo} alt="GesLoc" className="h-9 w-9 rounded-lg" />
        <span className="text-lg font-semibold text-slate-900">GesLoc</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LIENS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}