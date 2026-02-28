import { NavLink } from 'react-router-dom'

const baseLinkClass =
  'rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${baseLinkClass} ${
    isActive
      ? 'border-cyan-400 bg-cyan-900/30 text-cyan-100'
      : 'border-slate-600 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:text-slate-100'
  }`

export function AppFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/90 px-4 py-3 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">Dice Odyssey</p>
        <nav aria-label="Site pages" className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/opponents" className={navLinkClass}>
            Opponents
          </NavLink>
        </nav>
      </div>
    </footer>
  )
}
