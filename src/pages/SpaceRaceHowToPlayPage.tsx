import { Link } from 'react-router-dom'

const gameplaySections = [
  {
    title: 'Core Loop',
    body: 'Each turn, assign all 6 dice to Move, Claim, or Sabotage. Then resolve the turn and adapt your next allocation based on board state, rewards, and rival pressure.',
  },
  {
    title: 'Color Affinity',
    body: 'Any die can be placed in any action. Matching color to action gives +1 roll value, off-color gives -1 (minimum 1). Smart allocation beats random placement.',
  },
  {
    title: 'Claim Timing',
    body: 'Claim only checks the planet where you end movement. Plan your Move and Claim together so you consistently land on high-value planets before rivals do.',
  },
  {
    title: 'Sabotage Pressure',
    body: 'Sabotage targets the nearest rival within range 2. Skip turns are sabotage total minus defense (minimum 0), capped at 3. Use sabotage to slow leaders at key moments.',
  },
  {
    title: 'Rewards and Perfect Claim',
    body: 'Face 3/4/5/6 planets award +1/+2/+3/+4 MacGuffins. If every claim die succeeds, Perfect Claim doubles that reward (cap +8). Claimed planets no longer pay out.',
  },
  {
    title: 'Win Conditions',
    body: 'Reach 7 MacGuffins first for Race Victory. If the galaxy collapses first, Survival Victory goes to highest MacGuffins, then farthest position, then fewest pending skips.',
  },
  {
    title: 'Read the Board Fast',
    body: 'Use Turn Resolution for immediate outcomes, Turn Log for history, and Player Status for standings. This gives you enough context each turn to decide between speed, claims, and disruption.',
  },
]

export function SpaceRaceHowToPlayPage() {
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
              <h1 className="text-2xl font-bold text-cyan-200">How to Play Space Race</h1>
              <p className="text-sm text-slate-300">The complete play guide for the current Dice Odysseys game.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/games/space-race"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              Play Space Race
            </Link>
            <Link
              to="/about"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              About Dice Odysseys
            </Link>
            <Link
              to="/"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Quick Start</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Turn Sequence</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>Assign all 6 dice to Move, Claim, and Sabotage.</li>
              <li>Click Resolve Turn.</li>
              <li>Actions resolve in order: Move, then Claim, then Sabotage.</li>
              <li>Review outcomes and re-plan for your next turn.</li>
            </ol>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">What Decides Games</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Landing on good claim planets at the right time.</li>
              <li>Using sabotage to slow leaders, not just nearest rivals blindly.</li>
              <li>Managing tempo as the galaxy shrinks and turns become tighter.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">What, How, Win</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">What</h3>
            <p className="mt-1 text-sm text-slate-300">
              Space Race is a turn-based space race. Move across planets, claim MacGuffins,
              and disrupt rivals before the galaxy collapses.
            </p>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">How</h3>
            <p className="mt-1 text-sm text-slate-300">
              Assign all dice to Move, Claim, or Sabotage. Any color can go anywhere.
              Matching color to slot gets +1 roll value; off-color gets -1.
            </p>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Win</h3>
            <p className="mt-1 text-sm text-slate-300">
              Reach 7 MacGuffins first for race victory. If the galaxy runs out, survival winner
              is highest MacGuffins.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Visual Turn Guide</h2>
        <img
          src="/assets/infographics/turn-flow-infographic.png"
          alt="Infographic of Space Race turn flow: allocate 6 dice, resolve turn, then move, claim, sabotage"
          className="mt-2 w-full rounded border border-slate-700 object-cover"
        />
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Action Icons</h2>
        <p className="mt-1 text-sm text-slate-300">These icons match the in-game allocation panel.</p>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ui/icon-action-move.png"
                alt="Move action icon"
                className="h-12 w-12 rounded border border-slate-700 object-cover"
              />
              <div>
                <h3 className="text-sm font-semibold text-blue-300">Move</h3>
                <p className="mt-1 text-sm text-slate-300">Advance by your move roll total (capped at galaxy end). If you start on the last planet, move goes backward.</p>
              </div>
            </div>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ui/icon-action-claim.png"
                alt="Claim action icon"
                className="h-12 w-12 rounded border border-slate-700 object-cover"
              />
              <div>
                <h3 className="text-sm font-semibold text-emerald-300">Claim</h3>
                <p className="mt-1 text-sm text-slate-300">Roll at or above the landed planet face to gain MacGuffins. Face 3/4/5/6 awards +1/+2/+3/+4. Perfect Claim doubles reward (cap +8).</p>
              </div>
            </div>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ui/icon-action-sabotage.png"
                alt="Sabotage action icon"
                className="h-12 w-12 rounded border border-slate-700 object-cover"
              />
              <div>
                <h3 className="text-sm font-semibold text-red-300">Sabotage</h3>
                <p className="mt-1 text-sm text-slate-300">Pressure the nearest rival in range and apply skip turns after defense.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {gameplaySections.map((section) => (
          <article key={section.title} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h2 className="text-sm font-semibold text-cyan-200">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Play Modes in Space Race</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Instant Adventure</h3>
            <p className="mt-1 text-sm text-slate-300">Single-player sessions versus AI captains for fast practice and strategy testing.</p>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Hotseat Multiplayer</h3>
            <p className="mt-1 text-sm text-slate-300">Local multiplayer on one device with alternating turns.</p>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Online Match</h3>
            <p className="mt-1 text-sm text-slate-300">Play live matches against waiting humans or AI opponents online.</p>
          </article>
        </div>
      </section>
    </main>
  )
}
