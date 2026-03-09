import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" aria-label="Go to Home" className="shrink-0">
              <img
                src="/assets/branding/dice-odyssey-logo.png"
                alt="Dice Odysseys logo"
                className="h-14 w-14 rounded-md border border-slate-700 object-cover"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-cyan-200">About Dice Odysseys</h1>
              <p className="text-sm text-slate-300">What we are building and where the platform is headed.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/how-to-play"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              How To Play
            </Link>
            <Link
              to="/legal"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              Legal
            </Link>
            <Link
              to="/"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">About Us</h2>
        <p className="mt-1 text-sm text-slate-300">
          Dice Odysseys is created by AI Sure Tech. We build games and interactive products with a focus
          on clear systems, approachable strategy, and responsive UX.
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Our Mission</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Create strategy games that are easy to learn and rewarding to master.</li>
              <li>Keep rules transparent so players understand outcomes and improve quickly.</li>
              <li>Deliver smooth, readable interfaces across desktop and mobile web.</li>
            </ul>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">What Players Can Expect</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Competitive turn-based matches with meaningful choices every turn.</li>
              <li>Readable feedback through resolution summaries, recaps, and status panels.</li>
              <li>Continuous quality improvements focused on reliability and clarity.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Games and Roadmap</h2>
        <p className="mt-1 text-sm text-slate-300">
          Dice Odysseys is now a multi-game platform. Space Race is the current live game, and upcoming
          titles will launch on their own routes with corresponding how-to-play pages.
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Live Now</h3>
            <p className="mt-1 text-sm text-slate-300">
              Space Race is playable now and has a dedicated guide at <code>/games/space-race/how-to-play</code>.
            </p>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Future Titles</h3>
            <p className="mt-1 text-sm text-slate-300">
              Coming-soon games are visible from the home launcher. As they go live, each title will get
              its own gameplay route and complete guide page.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}
