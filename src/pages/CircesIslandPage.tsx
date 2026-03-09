import { Link } from 'react-router-dom'

export function CircesIslandPage() {
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
          <h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">Circe&apos;s Island</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
            Transformations, enchantments, and the double edge of magic.
          </p>
        </div>

        <div className="p-4 md:p-6">
          <img
            src="/assets/odyssey/circes-island-hero.jpg"
            alt="Odysseus confronting Circe in her enchanted hall as his transformed crew waits nearby"
            className="h-auto w-full rounded-lg border border-slate-700 object-cover"
          />
        </div>
      </section>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
        <p>
          After escaping the Laestrygonians, Odysseus and his remaining crew reach Aeaea, an island cloaked in mist and mystery. Scouts led by Eurylochus follow smoke to a grand hall in the woods and meet Circe, daughter of Helios and mistress of potent magic. She welcomes the men, then laces their drink with a spell and transforms them into swine. Eurylochus escapes and warns Odysseus, who advances to confront her with divine help. What starts as a deadly trap becomes a turning point where danger, strategy, and uneasy alliance overlap.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Why It&apos;s a Warning About Magic&apos;s Double Edge</h2>
          <p>
            Circe&apos;s episode warns that enchantment often arrives dressed as comfort. Power can seduce before it harms, and appearances can conceal intention.
          </p>
          <p>
            The same chapter also shows that knowledge and adaptability can reverse that danger. Odysseus survives not by brute force but by preparation and composure, turning spellcraft from a trap into a source of guidance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Key Elements of Circe&apos;s Island</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <strong>The Scouts&apos; Doom:</strong> Men enter Circe&apos;s hall and are transformed, though their minds remain aware.
            </li>
            <li>
              <strong>Hermes&apos; Intervention:</strong> Odysseus receives the herb moly, which protects him from Circe&apos;s potion.
            </li>
            <li>
              <strong>The Confrontation:</strong> Odysseus forces an oath of safety and compels Circe to restore his crew.
            </li>
            <li>
              <strong>Year of Enchantment:</strong> The crew remains on Aeaea while Circe provides rest and crucial foreknowledge.
            </li>
            <li>
              <strong>Departure Advice:</strong> Circe warns them about the Underworld, Sirens, Scylla, Charybdis, and Helios&apos; cattle.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
          <p>
            The herb moly in this episode has long fascinated readers and historians, with theories linking it to real medicinal plants known in the ancient Mediterranean.
          </p>
        </section>

        <div className="flex justify-between gap-2 pt-2">
          <Link
            to="/odyssey/laestrygonians"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Previous: Laestrygonians
          </Link>
          <Link
            to="/odyssey/underworld-tiresias"
            className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
          >
            Next: Underworld (Tiresias)
          </Link>
        </div>
      </article>
    </main>
  )
}
