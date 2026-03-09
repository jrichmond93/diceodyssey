import { Link } from 'react-router-dom'

export function AeolusAndWindsPage() {
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
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Aeolus &amp; the Winds</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            The bag of breezes gone wrong, and the warning behind curiosity&apos;s curse.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/aeolus-and-the-winds-hero.jpg"
            alt="Odysseus' crew opening Aeolus' bag of winds as a storm erupts at sea"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          Sailing away from Polyphemus&apos; cave, Odysseus and his crew glimpse hope at the floating island of Aeolia. Aeolus, keeper of the winds appointed by Zeus, welcomes them into his bronze-walled palace. After hearing Odysseus&apos; story, he gives him a tightly bound leather bag containing all unruly winds, leaving only the gentle West Wind to carry the fleet home. For nine days and nights, the voyage is smooth and Ithaca nears. Then Odysseus, exhausted, falls asleep. His crew, convinced the bag holds treasure, opens it. The trapped gales explode outward and hurl the ships back across the sea.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s a Warning About Curiosity&apos;s Curse</h2>
          <p>
            This episode shows how one impulsive act can collapse a hard-won advantage. Aeolus&apos; gift is a rare direct path home, but suspicion and envy turn it into disaster.
          </p>
          <p>
            Homer frames curiosity here as a test of restraint. The crew does not lose to an enemy fleet. They sabotage themselves by opening what they were meant to trust. The warning is timeless: discipline protects progress, while unchecked doubt can summon storms from calm seas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of Aeolus &amp; the Winds</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Hospitable Host:</strong> Aeolus receives Odysseus generously, reinforcing the Greek value of guest-friendship.
            </li>
            <li>
              <strong>The Magical Gift:</strong> A sealed wind bag contains dangerous gales while one favorable wind guides the fleet.
            </li>
            <li>
              <strong>The Fatal Mistake:</strong> Odysseus sleeps near Ithaca and the crew opens the bag out of jealousy and suspicion.
            </li>
            <li>
              <strong>The Rejection:</strong> Cast back to Aeolia, Odysseus is refused aid, as Aeolus interprets their fate as divine disfavor.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            Scholars often connect Aeolus&apos; island to the real Aeolian Islands near Sicily, long associated with violent winds and volcanic force.
          </p>
        </section>

        <div className="flex justify-between gap-2 pt-2">
          <Link
            to="/odyssey/cyclops-polyphemus"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Cyclops (Polyphemus)
          </Link>
          <Link
            to="/odyssey/laestrygonians"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Next: Laestrygonians
          </Link>
        </div>
      </article>
    </main>
  )
}
