import { Link } from 'react-router-dom'
import { GAME_CATALOG } from '../data/games'

const GUIDE_PATH_BY_GAME_SLUG: Record<string, string> = {
  'space-race': '/games/space-race/how-to-play',
  'voyage-home': '/games/voyage-home/how-to-play',
  'mythic-reveal': '/games/mythic-reveal/how-to-play',
}

export function HowToPlayPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" aria-label="Go to Home" className="shrink-0">
              <img
                src="/assets/branding/dice-odyssey-logo.png"
                alt="Dice Odysseys logo"
                className="h-14 w-14 rounded-md border border-slate-700 object-cover"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-cyan-200">How to Play Dice Odysseys</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-300">
                Dice Odysseys is a turn-based strategy collection where each game has its own rules and tempo. Start here for the basics,
                then jump into each game-specific guide.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
        <h2 className="text-lg font-semibold text-slate-100">General Basics</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Pick a game from the home launcher.</li>
          <li>Choose a mode: Instant Adventure, Hotseat Multiplayer, or Online Match where available.</li>
          <li>Follow each game&apos;s objective, turn loop, and win condition from its guide page.</li>
          <li>Use the in-game event log and status indicators to track outcomes and momentum.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Game Guides</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {GAME_CATALOG.flatMap((game) => {
            const guidePath = GUIDE_PATH_BY_GAME_SLUG[game.slug]
            const gameTile = (
              <article key={game.slug} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-cyan-200">{game.name}</h3>
                  {game.status !== 'active' ? (
                    <span className="rounded border border-amber-300/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                      Coming Soon
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-300">{game.summary}</p>
                <div className="mt-3">
                  {guidePath ? (
                    <Link
                      to={guidePath}
                      className="inline-flex rounded border border-slate-600 px-2 py-1 text-xs font-semibold text-cyan-200 hover:border-slate-500"
                    >
                      Read {game.name} Guide
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">Guide coming soon</span>
                  )}
                </div>
              </article>
            )

            if (game.slug !== 'mythic-reveal') {
              return [gameTile]
            }

            return [
              gameTile,
              <article key="space-race-branding-tile" className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <img
                  src="/assets/branding/space-race.jpg"
                  alt="Space Race key art"
                  className="mt-2 h-20 w-full rounded-md border border-slate-700 object-cover"
                />
              </article>,
            ]
          })}
        </div>
      </section>
    </main>
  )
}
