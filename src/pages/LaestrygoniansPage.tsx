import { Link } from 'react-router-dom'

export function LaestrygoniansPage() {
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
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Laestrygonians</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            Giant cannibals, shattered fleets, and survival against overwhelming odds.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/laestrygonians-hero.jpg"
            alt="Giant Laestrygonians hurling boulders into Odysseus' trapped fleet in a narrow harbor"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          After the winds from Aeolus&apos; ill-fated bag hurled them backward, Odysseus and his fleet pushed onward and reached Laestrygonia, where a calm harbor seemed to promise safety. Eleven ships anchored inside the cliff-ringed bay while Odysseus kept his own vessel outside. Scouts entered inland and found the realm of the giant Laestrygonians, ruled by King Antiphates. Their first contact turned instantly horrific when Antiphates seized and devoured one of the men. The alarm spread. Giants surged to the cliffs and rained boulders and spears onto the trapped ships below.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s a Warning About Overwhelming Odds</h2>
          <p>
            This episode marks one of the most devastating reversals in the <em>Odyssey</em>. It shows that not every danger can be negotiated or outsmarted; some forces erase options faster than strategy can respond.
          </p>
          <p>
            Odysseus survives because of a single precaution, keeping his ship outside the harbor, but nearly his entire fleet is destroyed in minutes. The warning is stark: caution matters, and even good planning can leave only narrow margins when odds become extreme.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of the Laestrygonians</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Deceptive Harbor:</strong> Calm waters and steep cliffs create a natural trap for the anchored fleet.
            </li>
            <li>
              <strong>The King&apos;s Daughter:</strong> A seemingly ordinary encounter leads scouts directly to Antiphates&apos; hall.
            </li>
            <li>
              <strong>Antiphates&apos; Attack:</strong> The giant king kills and devours a scout, triggering a mass assault.
            </li>
            <li>
              <strong>The Massacre:</strong> Giants bombard the harbor from above, splintering ships and slaughtering crews.
            </li>
            <li>
              <strong>Odysseus&apos; Escape:</strong> His ship, anchored outside, cuts free and flees while the rest are lost.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            Ancient giant legends were sometimes linked to discoveries of oversized fossil bones, which may have helped fuel stories like the Laestrygonians across Mediterranean traditions.
          </p>
        </section>

        <div className="flex justify-between gap-2 pt-2">
          <Link
            to="/odyssey/aeolus-and-the-winds"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Aeolus &amp; the Winds
          </Link>
          <Link
            to="/odyssey/circes-island"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Next: Circe&apos;s Island
          </Link>
        </div>
      </article>
    </main>
  )
}
