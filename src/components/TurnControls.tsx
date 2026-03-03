interface TurnControlsProps {
  canSubmit: boolean
  disabled?: boolean
  isAI: boolean
  currentAiName?: string
  resolving?: boolean
  resolvingLabel?: string
  showAiTurnGate?: boolean
  showAiAutoPlayToggle?: boolean
  autoPlayAiTurns?: boolean
  onAutoPlayAiTurnsChange?: (enabled: boolean) => void
  onContinueAiTurn?: () => void
  onSubmit: () => void
  onReset: () => void
}

export function TurnControls({
  canSubmit,
  disabled,
  isAI,
  currentAiName,
  resolving,
  resolvingLabel,
  showAiTurnGate,
  showAiAutoPlayToggle,
  autoPlayAiTurns,
  onAutoPlayAiTurnsChange,
  onContinueAiTurn,
  onSubmit,
  onReset,
}: TurnControlsProps) {
  const turnLocked = disabled || !canSubmit || isAI || resolving
  const showResolveButton = !isAI && !disabled && !showAiTurnGate
  const showResetButton = showResolveButton && !resolving
  const showContinueAiButton = Boolean(showAiTurnGate && !disabled && !resolving)
  const showAutoPlayToggle = Boolean(showAiAutoPlayToggle && !disabled)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Turn Controls</h2>
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:justify-end lg:gap-2">
          {showResolveButton && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={turnLocked}
              aria-label="Resolve turn"
              className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 lg:px-3 lg:py-1.5 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              Resolve Turn
            </button>
          )}
          {showResetButton && (
            <button
              type="button"
              onClick={onReset}
              disabled={disabled || isAI || resolving}
              aria-label="Reset allocation"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 lg:px-3 lg:py-1.5 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              Reset Allocation
            </button>
          )}
          {showContinueAiButton && (
            <button
              type="button"
              className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 lg:px-3 lg:py-1.5"
              onClick={onContinueAiTurn}
            >
              Continue AI Turn
            </button>
          )}
          {showAutoPlayToggle && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-200 lg:whitespace-nowrap">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-500 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0"
                checked={Boolean(autoPlayAiTurns)}
                onChange={(event) => onAutoPlayAiTurnsChange?.(event.target.checked)}
              />
              Auto-play AI turns
            </label>
          )}
        </div>
      </div>
      {showContinueAiButton && (
        <p className="text-xs text-cyan-100">
          Continue when ready to let {currentAiName || 'the AI'} take their turn.
        </p>
      )}
      {resolving && (
        <p className="mt-3 text-sm font-semibold text-cyan-200">
          {resolvingLabel || 'Resolving turn activity...'}
        </p>
      )}
      {!isAI && !disabled && (
        <p className="mt-3 text-xs text-slate-400">
          {!canSubmit ? 'Resolve Turn is locked until all 6 dice are assigned. ' : ''}
          Resolve Turn rolls all assigned dice, applies Move → Claim → Sabotage.
        </p>
      )}
      {isAI && !disabled && !showAiTurnGate && <p className="mt-3 text-sm text-cyan-200">AI is thinking...</p>}
    </div>
  )
}
