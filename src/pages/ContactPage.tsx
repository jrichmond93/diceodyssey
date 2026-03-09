import { Link } from 'react-router-dom'

export function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
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
              <h1 className="text-2xl font-bold text-cyan-200">Contact</h1>
              <p className="text-sm text-slate-300">We would love to hear from you.</p>
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
          src="/assets/branding/contact.png"
          alt="Contact hero banner"
          className="max-h-56 w-full object-cover"
        />
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-slate-100">Welcome and Comments</h2>
        <p className="mt-2 leading-relaxed">
          Thank you for visiting Dice Odysseys. We welcome your comments, ideas, and suggestions to help us improve gameplay, accessibility, and overall experience.
        </p>
        <p className="mt-2 leading-relaxed">
          For general inquiries, feedback, partnership discussions, and support-related questions, please contact us by email:
        </p>
        <p className="mt-2">
          <a href="mailto:info@aisuretech.com" className="font-semibold text-cyan-300 hover:text-cyan-200">
            info@aisuretech.com
          </a>
        </p>
        <p className="mt-4 leading-relaxed text-slate-400">
          We review incoming messages regularly and do our best to respond as quickly as possible. By contacting us, you acknowledge that your message may be retained for support and operational purposes.
        </p>
      </section>
    </main>
  )
}
