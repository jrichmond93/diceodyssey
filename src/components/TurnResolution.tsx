import type { DebugDieRoll, TurnResolutionPlaybackStage, TurnResolutionSnapshot } from '../types'
import { getPlanetState, planetStateLabel } from '../utils/planetState'

interface TurnResolutionProps {
  summary?: TurnResolutionSnapshot
  resolving: boolean
  playbackStage: TurnResolutionPlaybackStage
}

const STAGES: Array<{ key: Exclude<TurnResolutionPlaybackStage, 'idle'>; label: string }> = [
  { key: 'move', label: 'Move' },
  { key: 'claim', label: 'Claim' },
  { key: 'sabotage', label: 'Sabotage' },
  { key: 'post', label: 'Post' },
]

const stageIndex: Record<Exclude<TurnResolutionPlaybackStage, 'idle'>, number> = {
  move: 0,
  claim: 1,
  sabotage: 2,
  post: 3,
}

const colorChipClass: Record<DebugDieRoll['color'], string> = {
  blue: 'border-blue-400/60 bg-blue-900/30 text-blue-100',
  green: 'border-emerald-400/60 bg-emerald-900/30 text-emerald-100',
  red: 'border-red-400/60 bg-red-900/30 text-red-100',
}

const macguffinTokenIcon = '/assets/ui/icon-macguffin-token.png'
const statusSuccessIcon = '/assets/ui/icon-status-success.svg'
const statusFailIcon = '/assets/ui/icon-status-fail.svg'
const statusNeutralIcon = '/assets/ui/icon-status-neutral.svg'

const getNarrativeToneClass = (tone: 'good' | 'neutral' | 'bad'): string => {
  if (tone === 'good') {
    return 'border-emerald-400/60 bg-emerald-900/20 text-emerald-100'
  }

  if (tone === 'bad') {
    return 'border-amber-400/60 bg-amber-900/20 text-amber-100'
  }

  return 'border-slate-600 bg-slate-900/40 text-slate-200'
}

const getOutcomeToneClass = (tone: 'good' | 'neutral' | 'bad'): string => {
  if (tone === 'good') {
    return 'border-emerald-400/60 bg-emerald-900/20 text-emerald-100'
  }

  if (tone === 'bad') {
    return 'border-amber-400/60 bg-amber-900/20 text-amber-100'
  }

  return 'border-slate-600 bg-slate-900/40 text-slate-200'
}

const getOutcomeIconPath = (tone: 'good' | 'neutral' | 'bad'): string => {
  if (tone === 'good') {
    return statusSuccessIcon
  }

  if (tone === 'bad') {
    return statusFailIcon
  }

  return statusNeutralIcon
}

const buildNarrative = (summary: TurnResolutionSnapshot) => {
  const appliedSkips = summary.skips.appliedToTarget?.amount ?? 0
  const sabotageBlocked = Boolean(summary.skips.appliedToTarget?.blockedByImmunity)
  const collapseCount = Math.max(0, summary.galaxy.before - summary.galaxy.after)
  const movedBy = Math.max(0, summary.position.after - summary.position.before)

  let tone: 'good' | 'neutral' | 'bad' = 'neutral'
  let headline = 'Steady turn.'

  if (summary.skipped) {
    tone = 'bad'
    headline = 'Turn skipped.'
  } else if (summary.totals.gainedMacGuffins > 0 || appliedSkips > 0) {
    tone = 'good'
    headline = summary.totals.gainedMacGuffins > 0 ? 'Strong turn.' : 'Tactical turn.'
  } else if (summary.totals.sabotage > 0 && (sabotageBlocked || appliedSkips === 0)) {
    tone = 'bad'
    headline = 'Rough turn.'
  }

  const sentences: string[] = []

  if (summary.skipped) {
    sentences.push(`${summary.playerName} lost this turn to skip effects and could not roll or act.`)
  } else {
    sentences.push(`${summary.playerName} moved ${movedBy} space${movedBy === 1 ? '' : 's'} (${summary.position.before} to ${summary.position.after}) with move total ${summary.totals.move}.`)

    if (summary.claim.landedPlanetId) {
      if (summary.totals.gainedMacGuffins > 0) {
        sentences.push(`Claim succeeded on P${summary.claim.landedPlanetId} and earned +${summary.totals.gainedMacGuffins} MacGuffin${summary.totals.gainedMacGuffins === 1 ? '' : 's'}.`)
      } else if (summary.claim.successes > 0) {
        sentences.push(`Claim check succeeded on P${summary.claim.landedPlanetId}, but this planet had no MacGuffin reward.`)
      } else {
        sentences.push(`Claim failed on P${summary.claim.landedPlanetId}; no MacGuffins gained.`)
      }
    } else {
      sentences.push('No claim target was available this turn.')
    }

    if (appliedSkips > 0) {
      const targetName = summary.skips.appliedToTarget?.targetName ?? 'a rival'
      sentences.push(`Sabotage landed on ${targetName} for ${appliedSkips} skip turn${appliedSkips === 1 ? '' : 's'}.`)
    } else if (summary.totals.sabotage > 0 && sabotageBlocked) {
      const targetName = summary.skips.appliedToTarget?.targetName ?? 'the target'
      sentences.push(`Sabotage pressure was fully blocked by ${targetName}'s temporary immunity.`)
    } else if (summary.totals.sabotage > 0) {
      sentences.push('Sabotage rolled but produced no skip impact this turn.')
    } else {
      sentences.push('No sabotage attempts were made this turn.')
    }
  }

  if (collapseCount > 0) {
    sentences.push(`Galaxy collapse removed ${collapseCount} planet${collapseCount === 1 ? '' : 's'} after resolution.`)
  }

  if (summary.winnerAfterTurn?.winnerId) {
    sentences.push(`This turn ended the game by ${summary.winnerAfterTurn.winnerReason === 'race' ? 'race victory' : 'survival victory'} condition.`)
  }

  return {
    tone,
    headline,
    summary: sentences.join(' '),
  }
}

const renderRolls = (rolls: DebugDieRoll[]) => {
  if (rolls.length === 0) {
    return <p className="text-xs text-slate-400">No dice assigned.</p>
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {rolls.map((roll) => (
        <span
          key={`${roll.dieId}-${roll.raw}-${roll.final}`}
          className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${colorChipClass[roll.color]}`}
        >
          {roll.color[0].toUpperCase()} {roll.raw}{roll.modifier === 0 ? '' : roll.modifier > 0 ? `+${roll.modifier}` : `${roll.modifier}`}={roll.final}
        </span>
      ))}
    </div>
  )
}

export function TurnResolution({ summary, resolving, playbackStage }: TurnResolutionProps) {
  const activeStageIndex = playbackStage === 'idle' ? -1 : stageIndex[playbackStage]
  const narrative = summary ? buildNarrative(summary) : null
  const claimPlanetState =
    summary?.claim.landedPlanetFace !== undefined
      ? getPlanetState({ revealed: true, face: summary.claim.landedPlanetFace })
      : undefined

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Turn Resolution</h2>
        {summary && (
          <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">
            R{summary.round} · T{summary.turn} · {summary.playerName}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-2 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:space-y-0">
        <p className="text-xs text-slate-400">Latest resolved turn breakdown.</p>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:flex lg:gap-2">
          {STAGES.map((stage, index) => {
            const isActive = resolving && activeStageIndex === index
            const isComplete = activeStageIndex > index || (!resolving && summary)

            return (
              <div
                key={stage.key}
                className={`rounded border px-2 py-1 text-xs font-semibold ${
                  isActive
                    ? 'border-cyan-300 bg-cyan-900/30 text-cyan-100'
                    : isComplete
                      ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-100'
                      : 'border-slate-700 bg-slate-900/50 text-slate-300'
                }`}
              >
                {stage.label}
              </div>
            )
          })}
        </div>
      </div>

      {!summary && (
        <p className="mt-3 text-sm text-slate-300">Resolve a turn to see phase-by-phase results.</p>
      )}

      {summary && (
        <div className="mt-3 space-y-2 text-sm text-slate-200">
          <div className="rounded border border-slate-700 bg-slate-900/50 p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">What happened</p>
            <p className="mt-1 text-xs text-slate-300">After pressing Resolve Turn, read these outcomes in order.</p>
            <div className="mt-2 space-y-1.5">
              {(() => {
                const movedBy = Math.max(0, summary.position.after - summary.position.before)
                const moveTone: 'good' | 'neutral' | 'bad' = movedBy > 0 ? 'good' : 'neutral'

                const claimTone: 'good' | 'neutral' | 'bad' =
                  summary.totals.gainedMacGuffins > 0
                    ? 'good'
                    : summary.claim.landedPlanetId && summary.rolls.claim.length > 0
                      ? 'bad'
                      : 'neutral'

                const sabotageApplied = summary.skips.appliedToTarget?.amount ?? 0
                const sabotageBlocked = Boolean(summary.skips.appliedToTarget?.blockedByImmunity)
                const sabotageTone: 'good' | 'neutral' | 'bad' =
                  sabotageApplied > 0 ? 'good' : summary.totals.sabotage > 0 && sabotageBlocked ? 'bad' : 'neutral'

                const claimMessage = summary.claim.landedPlanetId
                  ? summary.totals.gainedMacGuffins > 0
                    ? `+${summary.totals.gainedMacGuffins} MacGuffin on P${summary.claim.landedPlanetId}`
                    : summary.rolls.claim.length > 0
                      ? `No gain on P${summary.claim.landedPlanetId}`
                      : `No claim roll on P${summary.claim.landedPlanetId}`
                  : 'No landed planet'

                const sabotageMessage = sabotageApplied > 0
                  ? `${summary.skips.appliedToTarget?.targetName ?? 'Rival'} +${sabotageApplied} skip`
                  : summary.totals.sabotage > 0 && sabotageBlocked
                    ? `${summary.skips.appliedToTarget?.targetName ?? 'Target'} blocked sabotage`
                    : summary.totals.sabotage > 0
                      ? 'No sabotage impact'
                      : 'No sabotage roll'

                const outcomes = [
                  {
                    label: 'Move',
                    tone: moveTone,
                    message: `+${movedBy} spaces (${summary.position.before} → ${summary.position.after})`,
                  },
                  {
                    label: 'Claim',
                    tone: claimTone,
                    message: claimMessage,
                  },
                  {
                    label: 'Sabotage',
                    tone: sabotageTone,
                    message: sabotageMessage,
                  },
                ]

                return outcomes.map((outcome) => (
                  <div
                    key={outcome.label}
                    className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs ${getOutcomeToneClass(outcome.tone)}`}
                  >
                    <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wide">
                      <img
                        src={getOutcomeIconPath(outcome.tone)}
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                      <span>{outcome.label}</span>
                    </p>
                    <p className="text-right">{outcome.message}</p>
                  </div>
                ))
              })()}
            </div>
          </div>

          {narrative && (
            <div className={`rounded border p-2 ${getNarrativeToneClass(narrative.tone)}`}>
              <p className="text-sm font-semibold">{narrative.headline}</p>
              <p className="mt-1 text-xs leading-relaxed">{narrative.summary}</p>
            </div>
          )}

          {summary.skipped && (
            <p className="rounded border border-amber-400/60 bg-amber-900/20 px-2 py-1 text-amber-100">
              Turn skipped due to sabotage effect.
            </p>
          )}

          <div className="rounded border border-slate-700 bg-slate-900/50 p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Move</p>
            {renderRolls(summary.rolls.move)}
            <p className="mt-1 text-xs text-slate-300">
              Total {summary.totals.move} · Position {summary.position.before} → {summary.position.after}
            </p>
          </div>

          <div className="rounded border border-slate-700 bg-slate-900/50 p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Claim</p>
            {renderRolls(summary.rolls.claim)}
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-300">
              <span>
                {summary.claim.landedPlanetId
                  ? `Landed P${summary.claim.landedPlanetId} (${claimPlanetState ? planetStateLabel[claimPlanetState] : 'Unknown'})`
                  : 'No landed planet'}
              </span>
              <span>·</span>
              <span>Successes {summary.claim.successes}</span>
              <span>·</span>
              <img
                src={macguffinTokenIcon}
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 rounded object-cover"
              />
              <span>+{summary.totals.gainedMacGuffins}</span>
            </div>
          </div>

          <div className="rounded border border-slate-700 bg-slate-900/50 p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-200">Sabotage</p>
            {renderRolls(summary.rolls.sabotage)}
            <p className="mt-1 text-xs text-slate-300">Total {summary.totals.sabotage} · {summary.sabotageMessage}</p>
          </div>

          <div className="rounded border border-slate-700 bg-slate-900/50 p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Post Effects</p>
            <p className="mt-1 text-xs text-slate-300">
              Galaxy {summary.galaxy.before} → {summary.galaxy.after}
              {summary.winnerAfterTurn?.winnerId ? ` · Winner: ${summary.winnerAfterTurn.winnerReason === 'race' ? 'Race' : 'Survival'}` : ''}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
