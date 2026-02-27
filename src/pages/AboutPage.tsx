const sections = [
  {
    title: 'Game Overview',
    body: 'Dice Odyssey is a turn-based strategy race across a collapsing galaxy. You allocate six dice each turn, then actions resolve in order: Move, Claim, and Sabotage.',
  },
  {
    title: 'Turn Flow',
    body: '1) Allocate all 6 dice. 2) Press Resolve Turn. 3) Read outcomes in Turn Resolution and Turn Log. Color affinity applies to all rolls: matching action color gets +1, off-color gets -1 (minimum 1).',
  },
  {
    title: 'Actions Explained',
    body: 'Move: advances your ship by the move roll total (capped by galaxy size). Claim: only checks the planet you land on. Rolls at or above planet face are successes. Sabotage: targets nearest rival within range 2 and can force skip turns.',
  },
  {
    title: 'Defense and Skips',
    body: 'Every player has Defense 1 by default. Incoming sabotage skips are computed as sabotage total minus defense (minimum 0). Pending skips are capped at 3 and consumed on future turns.',
  },
  {
    title: 'Planets and Rewards',
    body: 'Landing reveals a planet. Faces 4-5 yield 1 MacGuffin and face 6 yields 2 when successfully claimed. Claimed planets no longer provide reward.',
  },
  {
    title: 'Galaxy Collapse and Winning',
    body: 'The galaxy shrinks every 5 turns by 2 planets. First player to 5 MacGuffins wins by race. If the galaxy empties first, survival winner is highest MacGuffins, then farthest position, then fewest pending skips.',
  },
  {
    title: 'Reading the UI',
    body: 'Turn Resolution shows ordered outcomes. Turn Log stores turn-by-turn summaries. Player Status shows position, MacGuffins, pending skips, and defense. Help & Tips in-game covers quick reference rules.',
  },
]

export function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <img
            src="/assets/branding/dice-odyssey-logo.png"
            alt="Dice Odyssey logo"
            className="h-14 w-14 rounded-md border border-slate-700 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">About Dice Odyssey</h1>
            <p className="text-sm text-slate-300">Everything you need to understand the game in one place.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">MVP Scope and Product Decisions</h2>
        <p className="mt-1 text-sm text-slate-300">
          Dice Odyssey is intentionally built as an MVP: a fast, client-side prototype that proves the
          core dice-allocation strategy loop before expanding into a larger online product.
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Why This MVP Was Built This Way</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Focus on validating core mechanics: allocate, resolve, race, and sabotage.</li>
              <li>Use rule-based AI for predictable, tunable behavior and quick iteration.</li>
              <li>Keep architecture lightweight with local state and no backend dependency.</li>
              <li>Prioritize readability and UX clarity over advanced effects or complex systems.</li>
            </ul>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Current Feature Set</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Single-player (human vs AI) and hotseat multiplayer on one device.</li>
              <li>Drag-and-drop dice allocation with color affinity and auto resolution order.</li>
              <li>Galaxy shrink pacing, sabotage/skip mechanics, and race or survival win conditions.</li>
              <li>Turn Resolution and Turn Log for transparent, step-by-step outcome feedback.</li>
            </ul>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Current Limitations</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>No real-time online multiplayer, matchmaking, or server-side persistence.</li>
              <li>AI is heuristic-based and does not use deep lookahead search.</li>
              <li>Prototype scope intentionally limits extra dice colors, hazards, and variant modes.</li>
              <li>Visual/audio polish is intentionally minimal to prioritize gameplay iteration speed.</li>
            </ul>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">What a Robust Version Could Add</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Online multiplayer with simultaneous allocation timers and reconnect support.</li>
              <li>Deeper AI levels using minimax or MCTS for stronger tactical play.</li>
              <li>Expanded systems: more die colors, hazards, events, and mode variants.</li>
              <li>Progression features such as leaderboards, profiles, and richer audiovisual polish.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Tech Stack</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Built With</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>React + TypeScript for UI and game state logic.</li>
              <li>Vite for fast local development and production bundling.</li>
              <li>Tailwind CSS for styling and layout consistency.</li>
              <li>React DnD for drag-and-drop dice allocation interactions.</li>
            </ul>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Hosted With</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Vercel for static hosting and deployment.</li>
              <li>Build command: npm run build, output directory: dist.</li>
              <li>SPA rewrite routes all paths to index.html for client-side navigation.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Visual Turn Guide</h2>
        <img
          src="/assets/infographics/turn-flow-infographic.png"
          alt="Turn flow infographic"
          className="mt-2 w-full rounded border border-slate-700 object-cover"
        />
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Action Icons</h2>
        <p className="mt-1 text-sm text-slate-300">These are the same action markers used in the in-game dice allocation panel.</p>
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
                <p className="mt-1 text-sm text-slate-300">Advance by your move roll total (capped at galaxy end).</p>
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
                <p className="mt-1 text-sm text-slate-300">Roll above the landed planet face to gain MacGuffins.</p>
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
        {sections.map((section) => (
          <article key={section.title} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h2 className="text-sm font-semibold text-cyan-200">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
