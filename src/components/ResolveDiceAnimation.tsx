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
  variant?: 'rolling' | 'skip'
  prefersReducedMotion?: boolean
}

const buildFrame = (): AnimatedDie[] =>
  Array.from({ length: 6 }, (_, index) => ({
    id: `anim-die-${index}`,
    color: randomColor(),
    value: randomFace(),
  }))

export function ResolveDiceAnimation({ active, playerName, variant = 'rolling', prefersReducedMotion }: ResolveDiceAnimationProps) {
  const [frame, setFrame] = useState<AnimatedDie[]>(() => buildFrame())

  const frameIntervalMs = prefersReducedMotion ? 220 : 110

  useEffect(() => {
    if (!active || variant !== 'rolling') {
      return
    }

    const immediate = window.setTimeout(() => {
      setFrame(buildFrame())
    }, 0)
    const timer = window.setInterval(() => {
      setFrame(buildFrame())
    }, frameIntervalMs)

    return () => {
      window.clearTimeout(immediate)
      window.clearInterval(timer)
    }
  }, [active, frameIntervalMs, variant])

  const containerClass = useMemo(() => {
    if (!active) {
      return 'pointer-events-none opacity-0'
    }

    return 'opacity-100'
  }, [active])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 transition-opacity ${containerClass}`}>
      <div className="rounded-xl border border-cyan-400/50 bg-slate-900/95 p-4 shadow-xl">
        {variant === 'skip' ? (
          <div className="flex flex-col items-center gap-2 px-3 py-2 text-center">
            <p className="text-sm font-semibold text-amber-100">{playerName ?? 'Current Player'} · No Dice, skipping turn...</p>
            <p className="text-xs text-slate-300">Applying skip effects and advancing to the next captain.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-sm font-semibold text-cyan-100">{playerName ?? 'Current Player'} Rolling Dice...</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
