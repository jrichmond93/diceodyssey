import { Link } from 'react-router-dom'

export function ReturnToIthacaPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
        <div className="border-b border-slate-700 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <Link to="/odyssey" className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 hover:text-cyan-200">
              Odyssey Lore
            </Link>
            <Link
              to="/"
              className="rounded border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:border-slate-500"
            >
              Home
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Return to Ithaca</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            Homecoming, reckoning, and the epic closure of Odysseus&apos; long return.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/return-to-ithaca-hero.jpg"
            alt="Odysseus revealing himself in Ithaca as the suitors face their final reckoning"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          After twenty years of war and wandering, Odysseus finally reaches Ithaca. Athena disguises him as a beggar so he can assess a palace consumed by lawless suitors. Penelope endures through strategy and patience, Telemachus has grown into resolve, and loyal allies still remain. Father and son reunite in secret and prepare to reclaim the household. What follows is the arc&apos;s final test: identity revealed, justice enacted, and order restored.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s the Epic Closure</h2>
          <p>
            The ending completes the journey by turning outward survival into inward restoration. Odysseus must prove not only that he can return, but that he can rebuild what absence has broken.
          </p>
          <p>
            This finale balances vengeance with renewal: the suitors fall, loyalty is recognized, and peace is re-established under divine oversight. The closure lands because it resolves both plot and purpose, showing that homecoming is earned, not simply reached.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of the Return to Ithaca</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Phaeacian Return:</strong> Odysseus is finally delivered to Ithaca with gifts and silent dawn arrival.
            </li>
            <li>
              <strong>Disguise and Reconnaissance:</strong> Athena hides his identity while he tests loyalties and gathers allies.
            </li>
            <li>
              <strong>The Bow Test:</strong> Penelope&apos;s contest identifies the rightful king through impossible skill.
            </li>
            <li>
              <strong>The Suitors&apos; Defeat:</strong> Odysseus, Telemachus, and loyal servants retake the hall in a decisive reckoning.
            </li>
            <li>
              <strong>Recognition and Peace:</strong> Penelope confirms his identity, and divine intervention prevents further blood feud.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            The bow contest motif appears across world epics as a legitimacy test, where mastery under pressure symbolizes rightful rule.
          </p>
        </section>

        <div className="flex justify-start gap-2 pt-2">
          <Link
            to="/odyssey/sirens-scylla-charybdis"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Sirens &amp; Scylla/Charybdis
          </Link>
        </div>
      </article>
    </main>
  )
}
