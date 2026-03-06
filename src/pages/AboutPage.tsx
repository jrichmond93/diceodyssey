import { Link } from 'react-router-dom'

const sections = [
  {
    title: 'Core Loop',
    body: 'Each turn, assign all 6 dice to Move, Claim, or Sabotage. Then resolve the turn and adapt your next allocation based on board state, rewards, and rival pressure.',
  },
  {
    title: 'Color Affinity',
    body: 'Any die can be placed in any action. Matching color to action gives +1 roll value, off-color gives -1 (minimum 1). Smart allocation beats random placement.',
  },
  {
    title: 'Claim Timing',
    body: 'Claim only checks the planet where you end movement. Plan your Move and Claim together so you consistently land on high-value planets before rivals do.',
  },
  {
    title: 'Sabotage Pressure',
    body: 'Sabotage targets the nearest rival within range 2. Skip turns are sabotage total minus defense (minimum 0), capped at 3. Use sabotage to slow leaders at key moments.',
  },
  {
    title: 'Rewards and Perfect Claim',
    body: 'Face 3/4/5/6 planets award +1/+2/+3/+4 MacGuffins. If every claim die succeeds, Perfect Claim doubles that reward (cap +8). Claimed planets no longer pay out.',
  },
  {
    title: 'Win Conditions',
    body: 'Reach 7 MacGuffins first for Race Victory. If the galaxy collapses first, Survival Victory goes to highest MacGuffins, then farthest position, then fewest pending skips.',
  },
  {
    title: 'Read the Board Fast',
    body: 'Use Turn Resolution for immediate outcomes, Turn Log for history, and Player Status for standings. This gives you enough context each turn to decide between speed, claims, and disruption.',
  },
]

const aiSureTechNetwork = [
  {
    category: 'Finance & Investing',
    links: [
      {
        title: 'AI Stock Tickers',
        href: 'https://aistocktickers.com/',
        description:
          'Your go-to platform for stock analysis, trading, and AI-powered insights. Discover top-performing stocks with daily AI-driven insights. AI Stock Tickers delivers a curated list of potential buys, blending advanced algorithms and AI models to rank high-potential stocks for near-term gains and support informed decisions.',
      },
      {
        title: 'Learn AI Stock Tickers',
        href: 'https://learn.aistocktickers.com/',
        description:
          'Master stock market investing with AI. Transform your investment journey with educational resources powered by AI analysis to help you learn, grow, and succeed in the market.',
      },
      {
        title: 'Finster Chat',
        href: 'https://www.finsterchat.com/',
        description:
          'Transform your future with Finster Chat. Finster provides guidance on wealth management, investment strategies, debt management, and retirement planning with personalized recommendations available 24/7.',
      },
      {
        title: 'Cryptiment',
        href: 'https://cryptiment.com/',
        description:
          'Cryptiment provides cryptocurrency sentiment analysis powered by real-time social, news, and on-chain data. Track sentiment, discover trending coins, and monitor bullish or bearish signals across major cryptocurrencies.',
      },
      {
        title: 'AI Stock Tickers Blog',
        href: 'https://blog.aistocktickers.com/',
        description:
          'AI-powered market intelligence and insights focused on AI-driven stock trading, algorithmic strategies, and financial technology innovations.',
      },
      {
        title: 'AI Mortgage Calc',
        href: 'https://aimortgagecalc.com/',
        description:
          'Calculate mortgage payments with detailed amortization schedules, payment breakdowns, and AI-powered explanations. Includes a learning center covering mortgage basics, affordability, rates, and payment strategies.',
      },
    ],
  },
  {
    category: 'Critical Thinking & Debate',
    links: [
      {
        title: 'Balanced Debate',
        href: 'https://www.balanceddebate.com/',
        description:
          'Balanced Debate was built for open discussion of important topics. The platform uses AI to present balanced arguments across diverse perspectives for deeper understanding of complex issues.',
      },
      {
        title: 'Opposing Point',
        href: 'https://opposingpoint.com/',
        description:
          'Escape the echo chamber and challenge your ideas with AI precision. AI modes help test assumptions, expose logical fallacies, and prepare for real-world opposition.',
      },
      {
        title: 'Ideo Bridge',
        href: 'https://ideobridge.com/',
        description:
          'Bridge ideological divides through respectful dialogue with daily opinions from diverse perspectives and thoughtful counter-responses to foster understanding and critical thinking.',
      },
      {
        title: 'A Stoic Says',
        href: 'https://astoicsays.com/',
        description:
          'Today’s headlines paired with Stoic wisdom. A daily opinion piece with AI summaries and Stoic reflections inspired by Marcus Aurelius, Epictetus, and the Porch.',
      },
    ],
  },
  {
    category: 'History & Exploration',
    links: [
      {
        title: 'Alternate History AI',
        href: 'https://althistai.com/',
        description: 'Explore the paths not taken through artificial intelligence.',
      },
      {
        title: 'AltHistAI Explore',
        href: 'https://althistai.aisuretech.com/',
        description:
          'Explore how history could have unfolded differently with AI-powered interactive simulations spanning ancient civilizations through modern innovations.',
      },
      {
        title: 'AI Evolution Explorer',
        href: 'https://www.aievolutionexplorer.com/',
        description:
          'Discover the evolutionary history of animals, explore facts, and learn about the diversity of life on Earth by searching species and lineages.',
      },
      {
        title: 'Daily Earth View',
        href: 'https://dailyearthview.com',
        description:
          'Discover daily Earth views from space captured by NASA’s EPIC camera on DSCOVR, with interactive high-resolution imagery of weather patterns, cloud formations, and planetary dynamics.',
      },
    ],
  },
  {
    category: 'Fun, Lifestyle & Miscellaneous',
    links: [
      {
        title: 'Feather Guess',
        href: 'https://featherguess.com/',
        description: 'Test your bird knowledge. Guess the feather.',
      },
      {
        title: 'Create A Dish',
        href: 'https://www.createadish.com/',
        description:
          'A culinary companion for home cooks and food enthusiasts to discover and create recipes tailored to preferences and available ingredients.',
      },
      {
        title: 'Kitty Vids',
        href: 'https://www.kitty-vids.com/',
        description:
          'A destination for adorable cat videos and practical cat care guides, designed to entertain and educate cat lovers with curated content.',
      },
      {
        title: 'Puppy Vids',
        href: 'https://www.puppy-vids.com/',
        description:
          'A destination for adorable dog videos and dog care guidance, with curated content for dog enthusiasts to discover, share, and enjoy.',
      },
      {
        title: 'AI Trendified',
        href: 'https://www.aitrendified.com/',
        description:
          'Today’s trending digest pairing popular topics with relevant TED Talks and AI insights to make powerful ideas more discoverable.',
      },
      {
        title: 'AI Wisdom Council',
        href: 'https://www.aiwisdomcouncil.com/',
        description:
          'Choose an advisor and begin asking questions, with each Wisdom Council member offering a distinct perspective.',
      },
      {
        title: 'Idea To Market AI',
        href: 'https://www.ideatomarketai.com/',
        description:
          'An AI-powered tool that helps validate business ideas, understand markets, and make informed decisions with professional-grade research support.',
      },
      {
        title: 'Policy Clown',
        href: 'https://www.policyclown.com/',
        description:
          'Daily satirical political predictions powered by AI, combining headlines and policy stances to generate entertainment-focused forecasts.',
      },
      {
        title: 'Headline Lingo',
        href: 'https://headlinelingo.com/',
        description:
          'Learn languages by reading top news stories with AI-powered translations, grammar explanations, and saved vocabulary tools.',
      },
      {
        title: 'Task Breezer',
        href: 'https://taskbreezer.com/',
        description:
          'A modern Kanban board app designed for fast and intuitive task management with a clean interface and practical productivity features.',
      },
      {
        title: 'Daily Calm AI',
        href: 'https://dailycalmai.com/',
        description:
          'Tools for fast calming, self-care routines, and personalized affirmations, including breathing exercises and grounding scripts.',
      },
      {
        title: 'Goals To Systems',
        href: 'https://goalstosystems.com/',
        description:
          'An AI-powered tool that turns ambitious goals into repeatable systems to build sustainable momentum over time.',
      },
    ],
  },
]

export function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <img
              src="/assets/branding/dice-odyssey-logo.png"
              alt="Dice Odysseys logo"
              className="h-14 w-14 rounded-md border border-slate-700 object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold text-cyan-200">About Dice Odysseys</h1>
              <p className="text-sm text-slate-300">How to play, what to expect, and who we are.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/opponents"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              Opponents
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
              ← Back to Home
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
        <h2 className="text-lg font-semibold text-slate-100">How to Play</h2>
        <p className="mt-1 text-sm text-slate-300">
          Dice Odysseys is a turn-based strategy race where every turn is about balancing movement,
          reward capture, and disruption.
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Quick Start</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Assign all 6 dice to Move, Claim, and Sabotage.</li>
              <li>Click Resolve Turn to process actions in order.</li>
              <li>Review Turn Resolution and Turn Log for outcomes.</li>
              <li>Adjust your next plan based on rivals and planet state.</li>
            </ul>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">What Matters Most</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Claim timing decides how quickly you gain MacGuffins.</li>
              <li>Sabotage can stall leaders and create comeback windows.</li>
              <li>The galaxy shrinks over time, increasing pressure each round.</li>
              <li>Winning requires both tactical turns and long-game pacing.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Play Modes</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Instant Adventure</h3>
            <p className="mt-1 text-sm text-slate-300">
              Single-player mode against AI captains. Best for learning mechanics, testing strategies,
              and quick sessions.
            </p>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">Online Match and Hotseat</h3>
            <p className="mt-1 text-sm text-slate-300">
              Online Match lets you jump into live sessions with human or AI opponents. Hotseat supports
              local multiplayer on one device with alternating turns.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Visual Turn Guide</h2>
        <img
          src="/assets/infographics/turn-flow-infographic.png"
          alt="Infographic of Dice Odyssey turn flow: Allocate 6 dice, resolve turn, then actions (move, claim, sabotage"
          className="mt-2 w-full rounded border border-slate-700 object-cover"
        />
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Action Icons</h2>
        <p className="mt-1 text-sm text-slate-300">These are the same action markers used in the in-game dice allocation panel.</p>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ui/icon-action-move.png"
                alt="Move action icon"
                className="h-12 w-12 rounded border border-slate-700 object-cover"
              />
              <div>
                <h3 className="text-sm font-semibold text-blue-300">Move</h3>
                <p className="mt-1 text-sm text-slate-300">Advance by your move roll total (capped at galaxy end). If you start on the last claimed planet, move goes backward.</p>
              </div>
            </div>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ui/icon-action-claim.png"
                alt="Claim action icon"
                className="h-12 w-12 rounded border border-slate-700 object-cover"
              />
              <div>
                <h3 className="text-sm font-semibold text-emerald-300">Claim</h3>
                <p className="mt-1 text-sm text-slate-300">Roll at or above the landed planet face to gain MacGuffins. Face 3/4/5/6 awards +1/+2/+3/+4. Perfect Claim doubles reward (cap +8).</p>
              </div>
            </div>
          </article>
          <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ui/icon-action-sabotage.png"
                alt="Sabotage action icon"
                className="h-12 w-12 rounded border border-slate-700 object-cover"
              />
              <div>
                <h3 className="text-sm font-semibold text-red-300">Sabotage</h3>
                <p className="mt-1 text-sm text-slate-300">Pressure the nearest rival in range and apply skip turns after defense.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <h2 className="text-sm font-semibold text-cyan-200">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">More from AI Sure Tech</h2>
        <p className="mt-1 text-sm text-slate-300">
          Explore additional websites by AI Sure Tech across finance, debate, history, exploration,
          and lifestyle tools.
        </p>
        <div className="mt-3 space-y-4">
          {aiSureTechNetwork.map((group) => (
            <section key={group.category} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <h3 className="text-sm font-semibold text-cyan-200">{group.category}</h3>
              <div className="mt-2 space-y-2">
                {group.links.map((link) => (
                  <article key={link.title} className="rounded-md border border-slate-700 bg-slate-950/50 p-2.5">
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      {link.title} <span aria-hidden="true">↗</span>
                    </a>
                    <p className="mt-1 text-sm text-slate-300">{link.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
