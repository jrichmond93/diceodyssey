import { Link } from 'react-router-dom'

export const FAQ_ITEMS = [
  {
    question: 'How do I start a game quickly?',
    answer:
      'From Home, choose Instant Adventure for solo play, Online Match for live matchmaking, or Hotseat for local multiplayer on one device.',
  },
  {
    question: 'How many dice do I assign each turn?',
    answer:
      'You assign all 6 dice every turn across Move, Claim, and Sabotage before resolving the turn.',
  },
  {
    question: 'How does color affinity work?',
    answer:
      'Any die can go in any action. Matching action color gives +1 roll value, off-color gives -1 (minimum 1).',
  },
  {
    question: 'How do I win?',
    answer:
      'Reach 7 MacGuffins first for Race Victory. If the galaxy collapses first, Survival Victory is decided by highest MacGuffins, then position, then pending skips.',
  },
  {
    question: 'What does sabotage do?',
    answer:
      'Sabotage targets the nearest rival in range and can apply skipped turns after defense is accounted for.',
  },
  {
    question: 'Can I play with friends?',
    answer:
      'Yes. Use Online Match for live sessions or Hotseat for turn-based local play on a shared device.',
  },
  {
    question: 'What frontend tech stack powers Dice Odysseys?',
    answer:
      'The game UI is built with React + TypeScript, bundled with Vite, and styled with Tailwind CSS.',
  },
  {
    question: 'How is drag-and-drop dice allocation implemented?',
    answer:
      'Dice allocation interactions use React DnD with mouse and touch backends for cross-device support.',
  },
  {
    question: 'What powers online sessions and matchmaking?',
    answer:
      'Online play uses serverless API routes with realtime session updates and an authoritative session snapshot flow.',
  },
  {
    question: 'Where is Dice Odysseys hosted?',
    answer:
      'The web app is deployed on Vercel with a TypeScript build pipeline and static asset delivery from the same project.',
  },
]

export function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Go to Home" className="shrink-0">
              <img
                src="/assets/branding/dice-odyssey-logo.png"
                alt="Dice Odysseys logo"
                className="h-12 w-12 rounded-md border border-slate-700 object-cover"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-cyan-200">FAQ</h1>
              <p className="text-sm text-slate-300">Quick answers for common Dice Odysseys questions.</p>
            </div>
          </div>
          <Link
            to="/"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
          >
            Home
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
        <img
          src="/assets/branding/faq.png"
          alt="FAQ hero banner"
          className="max-h-56 w-full object-cover"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {FAQ_ITEMS.map((item) => (
          <article key={item.question} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h2 className="text-sm font-semibold text-cyan-200">{item.question}</h2>
            <p className="mt-1 text-sm text-slate-300">{item.answer}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
