import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import type { ActionType, Allocation, Die } from '../types'

const ACTIONS: ActionType[] = ['move', 'claim', 'sabotage']
const DND_TYPE = 'die'

interface DicePoolProps {
  dicePool: Die[]
  allocation: Allocation
  disabled?: boolean
  onAllocationChange: (next: Allocation) => void
  onAllocatePreferred: () => void
}

interface DragItem {
  dieId: string
}

const actionLabel: Record<ActionType, string> = {
  move: 'Move',
  claim: 'Claim',
  sabotage: 'Sabotage',
}

const actionPreferredLabel: Record<ActionType, string> = {
  move: 'prefers blue',
  claim: 'prefers green',
  sabotage: 'prefers red',
}

const actionLabelColorClass: Record<ActionType, string> = {
  move: 'text-blue-300',
  claim: 'text-emerald-300',
  sabotage: 'text-red-300',
}

const actionIcon: Partial<Record<ActionType, string>> = {
  move: '/assets/ui/icon-action-move.png',
  claim: '/assets/ui/icon-action-claim.png',
}

const dieImageByColor: Record<Die['color'], string> = {
  red: '/assets/ui/die-red.png',
  blue: '/assets/ui/die-blue.png',
  green: '/assets/ui/die-green.png',
}

const neutralDieImage = '/assets/ui/die-neutral.png'

const unassignedColorOrder: Record<Die['color'], number> = {
  blue: 0,
  green: 1,
  red: 2,
}

const removeDieFromAllocation = (allocation: Allocation, dieId: string): Allocation => ({
  move: allocation.move.filter((id) => id !== dieId),
  claim: allocation.claim.filter((id) => id !== dieId),
  sabotage: allocation.sabotage.filter((id) => id !== dieId),
})

const DiceToken = ({ die, disabled }: { die: Die; disabled?: boolean }) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DND_TYPE,
    item: { dieId: die.id },
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [die.id, disabled])

  const elementRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!elementRef.current) {
      return
    }

    dragRef(elementRef)
  }, [dragRef])

  return (
    <button
      ref={elementRef}
      aria-label={`Die ${die.color}`}
      className={`h-10 w-10 overflow-hidden rounded-md border border-slate-300/70 bg-slate-900 shadow ${
        isDragging ? 'opacity-40' : 'opacity-100'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-grab'}`}
      type="button"
    >
      <img
        src={dieImageByColor[die.color] ?? neutralDieImage}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
    </button>
  )
}

const DropZone = ({
  title,
  action,
  onDropDie,
  children,
  disabled,
}: {
  title: string
  action?: ActionType
  onDropDie: (dieId: string) => void
  children: ReactNode
  disabled?: boolean
}) => {
  const [{ canDrop, isOver }, dropRef] = useDrop(() => ({
    accept: DND_TYPE,
    canDrop: () => !disabled,
    drop: (item: DragItem) => onDropDie(item.dieId),
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver(),
    }),
  }), [disabled, onDropDie])

  const zoneRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!zoneRef.current) {
      return
    }

    dropRef(zoneRef)
  }, [dropRef])

  return (
    <div
      ref={zoneRef}
      className={`rounded-lg border p-3 ${
        canDrop && isOver ? 'border-cyan-300 bg-cyan-900/20' : 'border-slate-700 bg-slate-900/40'
      }`}
      aria-label={title}
    >
      <p className={`mb-2 text-sm font-semibold ${action ? actionLabelColorClass[action] : 'text-slate-200'}`}>
        {title}
      </p>
      <div className="flex min-h-12 flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function DicePool({
  dicePool,
  allocation,
  disabled,
  onAllocationChange,
  onAllocatePreferred,
}: DicePoolProps) {
  const byId = useMemo(() => new Map(dicePool.map((die) => [die.id, die])), [dicePool])
  const allocationRef = useRef(allocation)

  useEffect(() => {
    allocationRef.current = allocation
  }, [allocation])

  const assignedIds = new Set([...allocation.move, ...allocation.claim, ...allocation.sabotage])
  const unassigned = dicePool
    .filter((die) => !assignedIds.has(die.id))
    .sort((a, b) => unassignedColorOrder[a.color] - unassignedColorOrder[b.color])

  const moveDie = (dieId: string, action: ActionType | null) => {
    const stripped = removeDieFromAllocation(allocationRef.current, dieId)

    if (!action) {
      onAllocationChange(stripped)
      return
    }

    onAllocationChange({
      ...stripped,
      [action]: [...stripped[action], dieId],
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Dice Allocation</h2>
          <button
            type="button"
            className="rounded border border-cyan-300 px-2 py-1 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onAllocatePreferred}
            disabled={disabled}
          >
            Allocate Preferred
          </button>
        </div>
        <p className="mt-0.5 text-xs leading-tight text-slate-400">First turn checklist: assign all 6 dice, press Resolve Turn, then read results in Turn Log.</p>
      </div>

      <DropZone title="Unassigned" onDropDie={(dieId) => moveDie(dieId, null)} disabled={disabled}>
        {unassigned.map((die) => (
          <DiceToken key={die.id} die={die} disabled={disabled} />
        ))}
      </DropZone>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ACTIONS.map((action) => (
          <DropZone
            key={action}
            title={`${actionLabel[action]} (${allocation[action].length}) · ${actionPreferredLabel[action]}`}
            action={action}
            onDropDie={(dieId) => moveDie(dieId, action)}
            disabled={disabled}
          >
            {actionIcon[action] && (
              <img
                src={actionIcon[action]}
                alt={`${actionLabel[action]} icon`}
                className="h-12 w-12 rounded border border-slate-700 object-cover"
              />
            )}
            {allocation[action].map((dieId) => {
              const die = byId.get(dieId)
              if (!die) return null
              return <DiceToken key={die.id} die={die} disabled={disabled} />
            })}
          </DropZone>
        ))}
      </div>

      <div className="text-xs text-slate-400">
        <p>Any die can go in any slot. Color affinity applies on roll results. Matching color to slot gets +1; off-color gets -1 (minimum 1). Move advances your ship (capped at galaxy end). Claim checks your landed planet. Sabotage targets nearest rival within 2 spaces; defense reduces skips, max stack is 3.</p>
      </div>
    </div>
  )
}
