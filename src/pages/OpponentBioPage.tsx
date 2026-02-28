import type { SyntheticEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  OPPONENT_BIO_FALLBACK_SRC,
  findAICharacterBySlug,
} from '../data/aiCharacters'

const withFallback = (event: SyntheticEvent<HTMLImageElement>, fallbackSrc: string) => {
  const image = event.currentTarget
  if (image.src.endsWith(fallbackSrc)) {
    return
  }

  image.src = fallbackSrc
}

interface OpponentBioPageProps {
  slug: string
}

export function OpponentBioPage({ slug }: OpponentBioPageProps) {
  const location = useLocation()
  const fromGame = Boolean((location.state as { fromGame?: boolean } | null)?.fromGame)
  const character = findAICharacterBySlug(slug)

  if (!character) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
        <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <h1 className="text-2xl font-bold text-cyan-200">Opponent Not Found</h1>
          <p className="mt-2 text-sm text-slate-300">This opponent profile does not exist.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/opponents"
              state={fromGame ? { fromGame: true } : undefined}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              Back to Opponents
            </Link>
            <Link
              to="/"
              state={fromGame ? { fromGame: true } : undefined}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              {fromGame ? 'Back to Game' : 'Back to Home'}
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">{character.fullName}</h1>
            <p className="text-sm text-slate-300">{character.phraseDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/opponents"
              state={fromGame ? { fromGame: true } : undefined}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              ← Back to Opponents
            </Link>
            <Link
              to="/"
              state={fromGame ? { fromGame: true } : undefined}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              {fromGame ? 'Back to Game' : 'Home'}
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <img
          src={character.bioImageSrc}
          alt={`${character.fullName} bio`}
          className="w-full rounded-lg border border-slate-700 object-cover"
          onError={(event) => withFallback(event, OPPONENT_BIO_FALLBACK_SRC)}
        />
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Legend</h2>
        {character.completeBioParagraphs && character.completeBioParagraphs.length > 0 ? (
          <div className="mt-2 space-y-3">
            {character.completeBioParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-slate-300">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Legend content for {character.fullName} will be added in a future content pass.
          </p>
        )}
      </section>
    </main>
  )
}
