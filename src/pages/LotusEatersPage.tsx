import { Link } from 'react-router-dom'

export function LotusEatersPage() {
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
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Lotus-Eaters</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            The island of forgetful bliss and why it remains a warning about distraction.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/lotus-eaters-hero.jpg"
            alt="Odysseus pulling his men away from the lotus shore toward the waiting ships"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          Imagine landing on a paradise island where every worry melts away like ice cream on a hot day. That is the allure of the Lotus-Eaters in Homer&apos;s <em>Odyssey</em>, one of the first stops in Odysseus&apos; adventures after leaving Troy. Blown off course by relentless winds, Odysseus and his crew arrive at a mysterious land inhabited by peaceful people who feast on the lotus plant. The scouts sent to explore return not with reports of danger or treasure, but with hazy forgetfulness, content to lounge forever under the sun while eating fruit that erases thoughts of home, family, and duty. Odysseus drags his enchanted men back to the ships by force and ties them to the benches so they can leave. This brief encounter sets the tone for dangers that are not always monsters with fangs, but subtle temptations that can derail even the strongest will.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s a Warning About Distractions</h2>
          <p>
            The Lotus-Eaters episode is more than a pit stop. It is a cautionary tale about losing focus in pursuit of long-term goals. The lotus symbolizes anything that lulls people into complacency and makes them forget what matters most.
          </p>
          <p>
            This warning is powerful because the threat is internal as much as external. Odysseus&apos; battle-tested crew does not fail against swords. They falter against comfort and sweetness. The scene reminds us that achievement requires discipline: shake off the haze and keep moving, even when a detour feels easy and pleasant.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of the Lotus-Eaters</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Arrival:</strong> After nine days of brutal north winds, Odysseus&apos; fleet lands on an island of plenty with hidden peril.
            </li>
            <li>
              <strong>The Enchantment:</strong> Scouts eat the lotus and forget their mission, crewmates, and longing for Ithaca.
            </li>
            <li>
              <strong>Odysseus&apos; Resolve:</strong> He forcibly retrieves his men and binds them to prevent escape.
            </li>
            <li>
              <strong>Quick Escape:</strong> The crew rows away swiftly, preserving the journey before it dissolves in comfort.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            The lotus may echo real ancient plants associated with mild narcotic effects. The scene has been reimagined by later writers, including Alfred Lord Tennyson, as a symbol of dreamy escapism that still resonates today.
          </p>
        </section>

        <div className="flex justify-between gap-2 pt-2">
          <Link
            to="/odyssey/apologoi"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Apologoi
          </Link>
          <Link
            to="/odyssey/cyclops-polyphemus"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Next: Cyclops (Polyphemus)
          </Link>
        </div>
      </article>
    </main>
  )
}
