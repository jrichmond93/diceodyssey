import { Link } from 'react-router-dom'

const EFFECTIVE_DATE = 'March 5, 2026'

export function LegalPage() {
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
              <h1 className="text-2xl font-bold text-cyan-200">Legal</h1>
              <p className="text-sm text-slate-300">Effective Date: {EFFECTIVE_DATE}</p>
            </div>
          </div>
          <Link
            to="/"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
          >
            ← Back to Home
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
        <img
          src="/assets/branding/legal.png"
          alt="Legal hero banner"
          className="max-h-56 w-full object-cover"
        />
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Privacy Policy</h2>
        <p className="mt-2 text-sm text-slate-300">
          We collect only the information needed to provide and improve Dice Odysseys, such as account
          identifiers, profile details you choose to provide, gameplay session data, and technical
          telemetry required for reliability and security.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          We use this information to authenticate users, operate matchmaking and multiplayer sessions,
          prevent abuse, support customer requests, and maintain service quality. We do not sell personal
          information. We may share data with service providers that process information on our behalf
          under appropriate contractual and security controls.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          We retain information only as long as reasonably necessary for legal, operational, and security
          purposes. You may request access, correction, or deletion of your personal information,
          subject to applicable law and legitimate business requirements.
        </p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Terms of Service</h2>
        <p className="mt-2 text-sm text-slate-300">
          By using Dice Odysseys, you agree to use the service lawfully and in accordance with these
          terms. You are responsible for your account activity and for maintaining the confidentiality of
          your login credentials.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          You may not exploit, disrupt, reverse engineer, or misuse the service, including attempts to
          interfere with gameplay integrity, infrastructure, or other users. We may suspend or terminate
          access for violations, fraud, abuse, or security risks.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          The service is provided on an "as is" and "as available" basis to the extent permitted by law.
          To the maximum extent allowed by applicable law, we disclaim implied warranties and limit
          liability for indirect, incidental, consequential, or special damages.
        </p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Cookie Policy</h2>
        <p className="mt-2 text-sm text-slate-300">
          Dice Odysseys uses cookies and similar technologies for essential service functions, session
          continuity, security, preferences, and performance analytics. Essential cookies are required for
          core functionality such as authentication and multiplayer session continuity.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Where applicable, you can manage non-essential cookie preferences through your browser settings.
          Disabling certain cookies may affect feature availability and site performance.
        </p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">DMCA</h2>
        <p className="mt-2 text-sm text-slate-300">
          We respect intellectual property rights and respond to valid Digital Millennium Copyright Act
          (DMCA) notices. If you believe content on Dice Odysseys infringes your copyright, submit a
          written notice that includes: your contact information, identification of the copyrighted work,
          identification of the allegedly infringing material and its location, a good-faith statement,
          and a statement under penalty of perjury that the information is accurate and you are authorized
          to act on behalf of the rights holder.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          If you believe material was removed in error, you may submit a lawful counter-notification.
          We may forward notices and counter-notices to involved parties as required by law.
        </p>
      </section>
    </main>
  )
}