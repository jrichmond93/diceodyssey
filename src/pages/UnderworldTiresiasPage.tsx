import { Link } from 'react-router-dom'

export function UnderworldTiresiasPage() {
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
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Underworld (Tiresias)</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            Ghostly prophecies, hard truths, and the limits of forbidden knowledge.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/underworld-tiresias-hero.jpg"
            alt="Odysseus at the Underworld trench as Tiresias rises to deliver prophecy"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          Following Circe&apos;s instructions, Odysseus sails to the far edge of the world where the rivers of the dead meet. There he performs a strict ritual: libations, sacrifice, and a blood-filled trench to summon the shades. Spirits gather in a pale, desperate throng, and Odysseus must hold them back until Tiresias drinks first. The blind prophet then reveals the next arc of trials, from Helios&apos; cattle to the final reckoning at Ithaca. The journey gives Odysseus guidance, but at a heavy emotional cost as he confronts the dead and the fragility of human plans.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s a Warning About the Limits of Knowledge</h2>
          <p>
            The Underworld episode shows that prophecy can clarify direction while deepening fear. Insight does not erase danger; it often reveals exactly how much must still be suffered.
          </p>
          <p>
            Homer frames forbidden knowledge as both tool and burden. Odysseus gains vital instruction, but he also inherits the emotional weight of coming losses. The warning endures: certainty can be costly, and some truths are heavy to carry.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of the Underworld</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Ritual Summons:</strong> Odysseus follows Circe&apos;s rites to open a brief channel between living and dead.
            </li>
            <li>
              <strong>The Swarming Ghosts:</strong> Shades crowd the trench, including loved ones and fallen comrades.
            </li>
            <li>
              <strong>Tiresias&apos; Prophecies:</strong> He warns of future trials and conditions for eventual return.
            </li>
            <li>
              <strong>Encounters with Heroes:</strong> Dialogues with the dead add grief, perspective, and warning.
            </li>
            <li>
              <strong>The Return:</strong> Odysseus departs with guidance, but also with the haunting memory of what he has seen.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            The Underworld map in Homer, including rivers like Styx and Lethe, shaped later visions of the afterlife in Western literature for centuries.
          </p>
        </section>

        <div className="flex justify-between gap-2 pt-2">
          <Link
            to="/odyssey/circes-island"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Circe&apos;s Island
          </Link>
          <Link
            to="/odyssey/sirens-scylla-charybdis"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Next: Sirens &amp; Scylla/Charybdis
          </Link>
        </div>
      </article>
    </main>
  )
}
