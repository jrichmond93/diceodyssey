interface TurnControlsProps {
  canSubmit: boolean
  disabled?: boolean
  isAI: boolean
  onSubmit: () => void
  onReset: () => void
}

export function TurnControls({ canSubmit, disabled, isAI, onSubmit, onReset }: TurnControlsProps) {
  const turnLocked = disabled || !canSubmit || isAI

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">Turn Controls</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={turnLocked}
          aria-label="Resolve turn"
          className="rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          Resolve Turn
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled || isAI}
          aria-label="Reset allocation"
          className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-slate-200 disabled:cursor-not-allowed disabled:text-slate-500"
        >
          Reset Allocation
        </button>
      </div>
      {!isAI && !canSubmit && !disabled && (
        <p className="mt-3 text-xs text-slate-400">Resolve Turn is locked until all 6 dice are assigned.</p>
      )}
      {!isAI && !disabled && (
        <p className="mt-1 text-xs text-slate-400">Resolve Turn rolls all assigned dice, applies Move → Claim → Sabotage, then advances play. If your turn is skipped, just press Resolve Turn.</p>
      )}
      {isAI && !disabled && <p className="mt-3 text-sm text-cyan-200">AI is thinking...</p>}
    </div>
  )
}
