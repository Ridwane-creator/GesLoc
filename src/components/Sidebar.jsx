import { useState } from 'react'
import logo from '../assets/logo.svg'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const LIENS = [
  { to: '/dashboard', label: 'Tableau de Bord' },
  { to: '/logements', label: 'Logements' },
  { to: '/paiements/nouveau', label: 'Paiements' },
  { to: '/bilans-mensuels', label: 'Bilans Mensuels' },
  { to: '/abonnement', label: 'Abonnement' },
]

function ContenuNavigation({ onNaviguer }) {
  return (
    <>
      <div className="flex items-center gap-2 px-6 py-5">
        <img src={logo} alt="GesLoc" className="h-9 w-9 rounded-lg" />
        <span className="text-lg font-semibold text-slate-900">GesLoc</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LIENS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNaviguer}
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
    </>
  )
}

export default function Sidebar() {
  const [menuOuvert, setMenuOuvert] = useState(false)

  return (
    <>
      {/* Barre du haut, mobile uniquement */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src={logo} alt="GesLoc" className="h-8 w-8 rounded-lg" />
          <span className="text-base font-semibold text-slate-900">GesLoc</span>
        </div>
        <button
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-50"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar fixe, desktop uniquement */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <ContenuNavigation />
      </aside>

      {/* Menu coulissant, mobile uniquement */}
      {menuOuvert && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOuvert(false)}
          />
          <aside className="absolute left-0 top-0 h-screen w-64 flex flex-col bg-white shadow-xl">
            <div className="flex items-center justify-end px-4 py-3">
              <button
                onClick={() => setMenuOuvert(false)}
                aria-label="Fermer le menu"
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ContenuNavigation onNaviguer={() => setMenuOuvert(false)} />
          </aside>
        </div>
      )}
    </>
  )
}