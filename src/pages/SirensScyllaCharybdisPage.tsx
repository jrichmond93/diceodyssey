import { Link } from 'react-router-dom'

export function SirensScyllaCharybdisPage() {
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
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Sirens &amp; Scylla/Charybdis</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            Deadly temptations and impossible choices on the narrowing sea.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/sirens-scylla-charybdis-hero.jpg"
            alt="Odysseus bound to the mast as his ship passes the Sirens and then Scylla near Charybdis"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          Leaving Circe&apos;s island with hard-won instructions, Odysseus sails into a corridor of compounded peril. First come the Sirens, whose song promises total knowledge while pulling sailors toward shipwreck. Odysseus has his crew seal their ears with wax and lash him to the mast so he can hear without steering them to ruin. The ship survives the song, only to enter the strait of Scylla and Charybdis, where every option is terrible: one side threatens total annihilation, the other guaranteed losses. Odysseus chooses the narrower catastrophe and presses through.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s a Warning About Deadly Temptations and Impossible Choices</h2>
          <p>
            The Sirens and the strait work as a paired lesson. The Sirens represent seductive distraction, the polished voice that promises everything while demanding your destruction.
          </p>
          <p>
            Scylla and Charybdis represent leadership under impossible constraints, where delay and denial are worse than a painful decision. The warning is severe: preparation matters, and sometimes survival means accepting the least devastating path.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of the Sirens &amp; Scylla/Charybdis</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Sirens&apos; Song:</strong> Personalized promises of glory and knowledge lure sailors to fatal rocks.
            </li>
            <li>
              <strong>Wax and Ropes:</strong> Odysseus prepares in advance, binding himself while protecting the crew from hearing.
            </li>
            <li>
              <strong>The Narrow Strait:</strong> Charybdis threatens total loss; Scylla guarantees partial loss.
            </li>
            <li>
              <strong>The Devastating Strike:</strong> Scylla seizes sailors as the ship threads past the vortex.
            </li>
            <li>
              <strong>Aftermath:</strong> The survivors continue with grief, proving endurance sometimes means carrying irreversible cost.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            Many scholars link Scylla and Charybdis to hazards in the Strait of Messina, where dangerous currents and cliffs likely shaped this enduring maritime nightmare.
          </p>
        </section>

        <div className="flex justify-between gap-2 pt-2">
          <Link
            to="/odyssey/underworld-tiresias"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Underworld (Tiresias)
          </Link>
          <Link
            to="/odyssey/return-to-ithaca"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Next: Return to Ithaca
          </Link>
        </div>
      </article>
    </main>
  )
}
