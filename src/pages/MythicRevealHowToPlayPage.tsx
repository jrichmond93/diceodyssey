import { Link, useLocation } from 'react-router-dom'

const sections = [
  {
    title: 'Objective',
    body: 'Reveal all 6 sections of your prophecy image before your rival completes theirs.',
  },
  {
    title: 'Turn Flow',
    body: 'Roll 6 dice, choose one revealed face from the roll to uncover that image section, then end turn.',
  },
  {
    title: 'One Reveal per Turn',
    body: 'You may reveal at most one new section each turn. Duplicate rolled faces do not grant extra reveals.',
  },
  {
    title: 'Sabotage Rule',
    body: 'If your roll includes the sabotage trigger, you may sabotage once that turn to hide one revealed rival section.',
  },
  {
    title: 'No Duplicate Boards',
    body: 'Both players receive different prophecy images within the same match.',
  },
  {
    title: 'Win Condition',
    body: 'The first player to reveal all 6 sections wins the duel immediately.',
  },
]

export function MythicRevealHowToPlayPage() {
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
              <h1 className="text-2xl font-bold text-cyan-200">How to Play Mythic Reveal</h1>
              <p className="text-sm text-slate-300">
                Core rules for the third Dice Odysseys duel mode.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {fromGame && (
              <Link
                to="/games/mythic-reveal"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                Play Mythic Reveal
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
          <li>Open Mythic Reveal from the game catalog.</li>
          <li>Roll 6 dice on your turn.</li>
          <li>Choose one face you rolled to reveal that image section.</li>
          <li>If sabotage is available, decide whether to hide one rival section.</li>
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
        <h2 className="text-lg font-semibold text-slate-100">Mode Scope</h2>
        <p className="mt-1 text-sm text-slate-300">
          The initial release targets single-player local duels versus AI rivals. Online mode is planned for a
          later phase.
        </p>
      </section>
    </main>
  )
}
