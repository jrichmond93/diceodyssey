import { Link } from 'react-router-dom'

export function CyclopsPolyphemusPage() {
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
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Cyclops (Polyphemus)</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            The one-eyed giant&apos;s trap and Odysseus&apos; "Nobody" trick.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/cyclops-polyphemus-hero.jpg"
            alt="Odysseus and his men escaping Polyphemus while hidden beneath rams"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          Picture a rugged, sun-baked island far from civilization, where massive sheep roam free and the air hums with the distant crash of waves. This is the land of the Cyclopes, one-eyed giants who live as lawless shepherds, scorning the gods and feasting on whatever crosses their path. Odysseus and his weary crew, still reeling from the forgetful haze of the Lotus-Eaters, anchor their ships in a secluded bay, hoping for respite after days at sea. Instead, they stumble into the lair of Polyphemus, a colossal son of Poseidon whose single eye burns with hunger. As the men explore a nearby cave filled with cheeses and lambs, Polyphemus returns, rolls a massive boulder across the entrance, and traps them inside.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s a Warning About Hubris and Cleverness</h2>
          <p>
            The Cyclops episode is a cautionary tale about the danger of arrogance and the cost of underestimating consequences. Polyphemus embodies brute force without law or hospitality, but Odysseus also makes a costly mistake after surviving.
          </p>
          <p>
            His famous taunt from the departing ship reveals his true name and invites Poseidon&apos;s wrath. A narrow tactical victory becomes a long strategic disaster. At the same time, the story celebrates cleverness: the "Nobody" trick proves that wit can defeat overwhelming strength when discipline holds.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of the Cyclops</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Arrival and Trap:</strong> Curiosity draws the crew into Polyphemus&apos; cave, where they are sealed in by an immovable boulder.
            </li>
            <li>
              <strong>The &quot;Nobody&quot; Ruse:</strong> Odysseus gives the giant wine, names himself Nobody, then blinds him with a heated olive-wood stake.
            </li>
            <li>
              <strong>The Escape:</strong> Odysseus and his men cling to the undersides of rams to pass the blind giant undetected.
            </li>
            <li>
              <strong>The Curse:</strong> Odysseus reveals his identity while sailing away, prompting Polyphemus to call on Poseidon for vengeance.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            Some historians suggest Cyclops myths may have been inspired by ancient elephant skulls, whose central nasal cavity can resemble a giant single eye socket.
          </p>
        </section>

        <div className="flex justify-between gap-2 pt-2">
          <Link
            to="/odyssey/lotus-eaters"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Lotus-Eaters
          </Link>
          <Link
            to="/odyssey/aeolus-and-the-winds"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Next: Aeolus &amp; the Winds
          </Link>
        </div>
      </article>
    </main>
  )
}
