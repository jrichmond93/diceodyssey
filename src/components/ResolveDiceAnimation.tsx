import { useEffect, useMemo, useState } from 'react'
import type { Color } from '../types'
import { getDieColorFallbackAssetPath, getDieFaceAssetPath } from '../utils/dieAssets'

const DIE_COLORS: Color[] = ['red', 'blue', 'green']

const randomFace = (): number => Math.floor(Math.random() * 6) + 1
const randomColor = (): Color => DIE_COLORS[Math.floor(Math.random() * DIE_COLORS.length)]

interface AnimatedDie {
  id: string
  color: Color
  value: number
}

interface ResolveDiceAnimationProps {
  active: boolean
  playerName?: string
  variant?: 'rolling' | 'skip' | 'shipwreck'
  prefersReducedMotion?: boolean
  diceCount?: number
  resolvedValues?: number[]
  fixedColor?: Color
}

const clampDiceCount = (count: number): number => Math.min(6, Math.max(1, Math.floor(count)))

const buildFrame = (diceCount: number, fixedColor?: Color): AnimatedDie[] =>
  Array.from({ length: clampDiceCount(diceCount) }, (_, index) => ({
    id: `anim-die-${index}`,
    color: fixedColor ?? randomColor(),
    value: randomFace(),
  }))

export function ResolveDiceAnimation({
  active,
  playerName,
  variant = 'rolling',
  prefersReducedMotion,
  diceCount = 6,
  resolvedValues,
  fixedColor,
}: ResolveDiceAnimationProps) {
  const resolvedDiceCount = clampDiceCount(diceCount)
  const [frame, setFrame] = useState<AnimatedDie[]>(() => buildFrame(resolvedDiceCount, fixedColor))
  const hasResolvedValues = Boolean(resolvedValues && resolvedValues.length > 0)
  const resolvedValuesKey = (resolvedValues ?? []).join(',')

  const frameIntervalMs = prefersReducedMotion ? 220 : 110

  useEffect(() => {
    if (!active || variant !== 'rolling') {
      return
    }

    if (hasResolvedValues) {
      const frozen = Array.from({ length: resolvedDiceCount }, (_, index) => ({
        id: `anim-die-${index}`,
        color: fixedColor ?? ('blue' as const),
        value: resolvedValues?.[index] ?? resolvedValues?.[resolvedValues.length - 1] ?? 1,
      }))

      setFrame(frozen)
      return
    }

    const immediate = window.setTimeout(() => {
      setFrame(buildFrame(resolvedDiceCount, fixedColor))
    }, 0)
    const timer = window.setInterval(() => {
      setFrame(buildFrame(resolvedDiceCount, fixedColor))
    }, frameIntervalMs)

    return () => {
      window.clearTimeout(immediate)
      window.clearInterval(timer)
    }
  }, [active, fixedColor, frameIntervalMs, hasResolvedValues, resolvedDiceCount, resolvedValues, resolvedValuesKey, variant])

  const containerClass = useMemo(() => {
    if (!active) {
      return 'pointer-events-none opacity-0'
    }

    return 'opacity-100'
  }, [active])

  const shipwreckFacePath = getDieFaceAssetPath('red', 1)
  const shipwreckFallbackPath = getDieColorFallbackAssetPath('red')

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 transition-opacity ${containerClass}`}>
      <div className="rounded-xl border border-cyan-400/50 bg-slate-900/95 p-4 shadow-xl">
        {variant === 'skip' ? (
          <div className="flex flex-col items-center gap-2 px-3 py-2 text-center">
            <p className="text-sm font-semibold text-amber-100">{playerName ?? 'Current Player'} · No Dice, skipping turn...</p>
            <p className="text-xs text-slate-300">Applying skip effects and advancing to the next captain.</p>
          </div>
        ) : variant === 'shipwreck' ? (
          <div className="flex flex-col items-center gap-3 px-4 py-3 text-center">
            <img
              src={shipwreckFacePath ?? shipwreckFallbackPath}
              alt="Shipwreck warning icon"
              className="h-14 w-14 rounded border border-rose-300/70 object-cover shadow-[0_0_18px_rgba(244,63,94,0.35)]"
              loading="lazy"
              onError={(event) => {
                const target = event.currentTarget
                if (target.src.endsWith(shipwreckFallbackPath)) {
                  return
                }

                target.src = shipwreckFallbackPath
              }}
            />
            <p className="text-base font-bold text-rose-100">{playerName ?? 'Captain'} shipwrecked!</p>
            <p className="text-xs text-rose-200">Turn lost. Passing the helm to the next captain.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-sm font-semibold text-cyan-100">
              {playerName ?? 'Current Player'} {hasResolvedValues ? 'Rolled' : resolvedDiceCount === 1 ? 'Rolling Die...' : 'Rolling Dice...'}
            </p>
            {hasResolvedValues && (
              <p className="mb-2 text-center text-xs text-cyan-200">
                Result: {(resolvedValues ?? []).join(', ')}
              </p>
            )}
            <div
              className={`grid gap-2 ${
                resolvedDiceCount === 1
                  ? 'grid-cols-1 justify-items-center'
                  : resolvedDiceCount <= 2
                    ? 'grid-cols-2 justify-items-center'
                  : resolvedDiceCount <= 4
                    ? 'grid-cols-2 sm:grid-cols-4 justify-items-center'
                    : 'grid-cols-3 sm:grid-cols-6 justify-items-center'
              }`}
            >
              {frame.map((die) => {
                const facePath = getDieFaceAssetPath(die.color, die.value)
                const fallbackPath = getDieColorFallbackAssetPath(die.color)

                return (
                  <img
                    key={die.id}
                    src={facePath ?? fallbackPath}
                    alt={`${die.color} die showing ${die.value}`}
                    className="h-12 w-12 rounded border border-slate-600 object-cover"
                    loading="lazy"
                    onError={(event) => {
                      const target = event.currentTarget
                      if (target.src.endsWith(fallbackPath)) {
                        return
                      }

                      target.src = fallbackPath
                    }}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
