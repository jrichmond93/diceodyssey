import { Link } from 'react-router-dom'

const odysseyChapters = [
  {
    title: 'What Are the Apologoi?',
    summary:
      'A quick introduction to Odysseus\' storytelling arc and why Books 9-12 form the dramatic core of the epic.',
    to: '/odyssey/apologoi',
  },
  {
    title: 'Lotus-Eaters',
    summary:
      'A warning about forgetting purpose, losing momentum, and drifting from home under seductive comfort.',
    to: '/odyssey/lotus-eaters',
  },
  {
    title: 'Cyclops (Polyphemus)',
    summary:
      'The cave encounter where cleverness saves lives, but pride invites a long and costly punishment.',
    to: '/odyssey/cyclops-polyphemus',
  },
  {
    title: 'Aeolus & the Winds',
    summary:
      'The near-home disaster that turns suspicion and impatience into self-inflicted exile.',
    to: '/odyssey/aeolus-and-the-winds',
  },
  {
    title: 'Laestrygonians',
    summary:
      'A catastrophic ambush that shows how quickly fortune can collapse in hostile territory.',
    to: '/odyssey/laestrygonians',
  },
  {
    title: "Circe's Island",
    summary:
      'Magic, transformation, and delayed departure: a chapter about discipline, temptation, and leadership.',
    to: '/odyssey/circes-island',
  },
  {
    title: 'Underworld (Tiresias)',
    summary:
      'Odysseus descends among the dead for hard truths about fate, restraint, and the road ahead.',
    to: '/odyssey/underworld-tiresias',
  },
  {
    title: 'Sirens & Scylla/Charybdis',
    summary:
      'An impossible stretch of sea where every option carries danger and command means choosing a loss.',
    to: '/odyssey/sirens-scylla-charybdis',
  },
  {
    title: 'Return to Ithaca',
    summary:
      'The homecoming finale of disguise, recognition, justice, and restored order.',
    to: '/odyssey/return-to-ithaca',
  },
]

export function OdysseyLoreIndexPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
        <div className="border-b border-slate-700 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/" aria-label="Go to Home" className="shrink-0">
                <img
                  src="/assets/branding/dice-odyssey-logo.png"
                  alt="Dice Odysseys logo"
                  className="h-14 w-14 rounded-md border border-slate-700 object-cover"
                />
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Odyssey Lore</p>
                <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">The Journey of Odysseus</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
                  Read every major stop in the Odyssey arc, from the first tales at Scheria to the return and reckoning in Ithaca.
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
        </div>

        <div className="p-4 text-sm text-slate-300 md:p-6">
          Choose a chapter below. Each page is written as a standalone guide with context, themes, and key takeaways.
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {odysseyChapters.map((chapter) => (
          <Link
            key={chapter.to}
            to={chapter.to}
            className="rounded-xl border border-slate-700 bg-cyan-950/40 p-4 transition-colors hover:border-cyan-400 hover:bg-cyan-950/60"
          >
            <h2 className="text-lg font-semibold text-cyan-100">{chapter.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{chapter.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}