import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const baseLinkClass =
  'rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${baseLinkClass} ${
    isActive
      ? 'border-cyan-400 bg-cyan-900/30 text-cyan-100'
      : 'border-slate-600 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:text-slate-100'
  }`

interface SocialLink {
  label: string
  href: string
  icon: ReactNode
}

const socialLinks: SocialLink[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/aisuretech/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
        <path d="M13.5 8H16V5h-2.5c-2.4 0-4 1.6-4 4v2H7v3h2.5v5H13v-5h2.7l.8-3H13V9c0-.7.3-1 1-1Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/aisuretech',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
        <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm10.2 1.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.8a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@aisuretech',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
        <path d="M14 3c.4 1.7 1.8 3 3.5 3.3V9A7 7 0 0 1 14 7.9v6.6a4.8 4.8 0 1 1-4.8-4.8h.2v2.5h-.2a2.3 2.3 0 1 0 2.3 2.3V3H14Z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/aisuretech',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
        <path d="M4.9 8.1A1.6 1.6 0 1 1 4.9 5a1.6 1.6 0 0 1 0 3.2ZM3.5 9.4h2.8V19H3.5V9.4Zm4.4 0h2.7v1.3h.1c.4-.8 1.3-1.6 2.8-1.6 3 0 3.6 2 3.6 4.6V19h-2.8v-4.7c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V19H7.9V9.4Z" />
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com/aisuretech',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
        <path d="M4 4h3.9l4.2 5.6L16.8 4H20l-6.2 7.1L20.5 20h-3.9l-4.6-6.1L6.7 20H3.5l6.6-7.6L4 4Z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@AISureTech',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
        <path d="M21 8.5c-.2-1.2-1.1-2.1-2.3-2.3C16.9 5.9 15 5.8 12 5.8s-4.9.1-6.7.4C4.1 6.4 3.2 7.3 3 8.5c-.3 1.8-.3 5.2 0 7 .2 1.2 1.1 2.1 2.3 2.3 1.8.3 3.7.4 6.7.4s4.9-.1 6.7-.4c1.2-.2 2.1-1.1 2.3-2.3.3-1.8.3-5.2 0-7ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" />
      </svg>
    ),
  },
]

export function AppFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/90 px-4 py-3 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2 2xl:flex-nowrap 2xl:justify-start 2xl:gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 2xl:flex-nowrap">
            <span>Dice Odysseys</span>
            <a
              href="https://diceodysseys.com"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:text-cyan-200"
            >
              diceodysseys.com
            </a>
            <span className="text-slate-500">•</span>
            <span>Website by</span>
            <a
              href="https://aisuretech.com/"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:text-cyan-200"
            >
              AI Sure Tech
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-1.5" aria-label="Social media links">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                title={social.label}
                className="rounded-md border border-slate-600 bg-slate-900/60 p-2 text-slate-300 transition-colors hover:border-slate-500 hover:text-cyan-200"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
        <nav aria-label="Site pages" className="flex flex-wrap items-center gap-2 2xl:flex-nowrap 2xl:justify-end">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/opponents" className={navLinkClass}>
            Opponents
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>
      </div>
    </footer>
  )
}
