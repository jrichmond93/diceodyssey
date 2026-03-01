import type { SyntheticEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  AI_CHARACTERS,
  OPPONENT_THUMBNAIL_FALLBACK_SRC,
  type AICharacter,
} from '../data/aiCharacters'

const withFallback = (event: SyntheticEvent<HTMLImageElement>, fallbackSrc: string) => {
  const image = event.currentTarget
  if (image.src.endsWith(fallbackSrc)) {
    return
  }

  image.src = fallbackSrc
}

function OpponentCard({ character, fromGame }: { character: AICharacter; fromGame: boolean }) {
  return (
    <article>
      <Link
        to={`/opponents/${character.slug}`}
        state={fromGame ? { fromGame: true } : undefined}
        className="group block rounded-lg border border-slate-700 bg-slate-900/40 p-4 transition-colors hover:border-cyan-500/70 hover:bg-slate-900/70"
      >
        <div className="flex items-start gap-3">
          <img
            src={character.thumbnailSrc}
            alt={`${character.fullName} thumbnail`}
            className="h-16 w-16 rounded-md border border-slate-700 object-cover transition-colors group-hover:border-cyan-500/70"
            onError={(event) => withFallback(event, OPPONENT_THUMBNAIL_FALLBACK_SRC)}
          />
          <div>
            <h2 className="text-base font-semibold text-cyan-200">{character.fullName}</h2>
            <p className="text-sm font-medium text-slate-200">{character.phraseDescription}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{character.longDescription}</p>
      </Link>
    </article>
  )
}

export function OpponentsPage() {
  const location = useLocation()
  const fromGame = Boolean((location.state as { fromGame?: boolean } | null)?.fromGame)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">About Opponents</h1>
            <p className="text-sm text-slate-300">Meet every AI rival in the Dice Odysseys roster.</p>
          </div>
          <Link
            to="/"
            state={fromGame ? { fromGame: true } : undefined}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
          >
            {fromGame ? '← Back to Game' : '← Back to Home'}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {AI_CHARACTERS.map((character) => (
          <OpponentCard key={character.slug} character={character} fromGame={fromGame} />
        ))}
      </section>
    </main>
  )
}
