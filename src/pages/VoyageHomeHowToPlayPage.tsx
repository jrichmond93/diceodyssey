import { Link, useLocation } from 'react-router-dom'

const sections = [
  {
    title: 'Objective',
    body: 'Reach 80 banked leagues and finish the round as the clear leader.',
  },
  {
    title: 'Turn Flow',
    body: 'On your turn, roll repeatedly to build turn total. Roll 1 and you shipwreck: turn total resets to 0 and your turn ends. Hold to bank your turn total and pass turn.',
  },
  {
    title: 'Curses',
    body: 'Each captain may curse once per turn at turn start, and only the current leader can be cursed. Curses do not stack.',
  },
  {
    title: 'Cursed Start Roll',
    body: 'A cursed captain performs one extra start roll on their next turn. If that roll is 1, immediate bust and turn ends. If >1, curse is consumed and normal rolling continues.',
  },
  {
    title: 'Sudden Death',
    body: 'If tied at top at 80+ leagues at round end, sudden death starts. Tied contenders keep playing until one has a unique lead at round boundary.',
  },
]

export function VoyageHomeHowToPlayPage() {
  const location = useLocation()
  const fromGame = Boolean((location.state as { fromGame?: boolean } | null)?.fromGame)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Go to Home" className="shrink-0">
              <img
                src="/assets/branding/dice-odyssey-logo.png"
                alt="Dice Odysseys logo"
                className="h-14 w-14 rounded-md border border-slate-700 object-cover"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-cyan-200">How to Play Voyage Home</h1>
              <p className="text-sm text-slate-300">Local-only MVP guide: single and hotseat modes.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {fromGame && (
              <Link
                to="/games/voyage-home"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                Play Voyage Home
              </Link>
            )}
            <Link
              to="/how-to-play"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              How to Play
            </Link>
            <Link
              to="/"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              Home
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Quick Start</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
          <li>Choose Voyage Home from the home game picker.</li>
          <li>Select Instant Adventure or Hotseat Multiplayer.</li>
          <li>Roll, decide risk vs safety, and hold at the right time.</li>
          <li>Use curses to pressure the leader at key moments.</li>
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h2 className="text-sm font-semibold text-cyan-200">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">AI Profiles</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Posei</h3>
            <p className="mt-1 text-sm text-slate-300">Aggressive curse usage with high risk tolerance before holding.</p>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Odys</h3>
            <p className="mt-1 text-sm text-slate-300">Balanced thresholds and selective curse usage when gap is large.</p>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Poly</h3>
            <p className="mt-1 text-sm text-slate-300">Reckless hold thresholds and curses when trailing.</p>
          </article>
        </div>
      </section>
    </main>
  )
}
