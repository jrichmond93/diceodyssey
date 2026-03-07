import type {
  ActionType,
  Allocation,
  Color,
  DebugDieRoll,
  DebugTurnRecord,
  Difficulty,
  GameState,
  Planet,
  Player,
  TurnResolutionSnapshot,
} from '../types.js'

const SHRINK_INTERVAL = 5
const SHRINK_COUNT = 2
const WINNING_MACGUFFINS = 7
const SABOTAGE_RANGE = 2
const MAX_SKIPPED_TURNS = 3
const MAX_MACGUFFINS_PER_CLAIM = 8
const MACGUFFIN_REWARD_BY_FACE: Record<number, number> = {
  3: 1,
  4: 2,
  5: 3,
  6: 4,
}

const ACTION_AFFINITY_COLOR: Record<ActionType, Color> = {
  move: 'blue',
  claim: 'green',
  sabotage: 'red',
}

export interface EngineRngProvider {
  rollDie: () => number
  nextFloat: () => number
}

export interface EngineDependencies {
  rng: EngineRngProvider
  createLogEntryId: () => string
}

const getMacGuffinRewardForFace = (face: number): number => MACGUFFIN_REWARD_BY_FACE[face] ?? 0

export const emptyAllocation = (): Allocation => ({
  move: [],
  claim: [],
  sabotage: [],
})

const appendDebugRecord = (state: GameState, record: DebugTurnRecord): GameState => {
  if (!state.debugEnabled) {
    return state
  }

  return {
    ...state,
    debugLog: [...state.debugLog, record],
  }
}

const addLog = (state: GameState, message: string, createLogEntryId: () => string): GameState => ({
  ...state,
  log: [{ id: createLogEntryId(), turn: state.turn, message }, ...state.log].slice(0, 20),
})

const findNearestTargetIndex = (players: Player[], sourceIndex: number): number | null => {
  const source = players[sourceIndex]
  let bestIndex: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  players.forEach((candidate, index) => {
    if (index === sourceIndex) {
      return
    }

    const distance = Math.abs(candidate.shipPos - source.shipPos)
    if (distance <= SABOTAGE_RANGE && distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })

  return bestIndex
}

const resolveWinner = (state: GameState): GameState => {
  const raceWinner = state.players.find((player) => player.macGuffins >= WINNING_MACGUFFINS)
  if (raceWinner) {
    return {
      ...state,
      winnerId: raceWinner.id,
      winnerReason: 'race',
    }
  }

  if (state.galaxy.length === 0) {
    const sorted = [...state.players].sort((a, b) => {
      if (b.macGuffins !== a.macGuffins) {
        return b.macGuffins - a.macGuffins
      }

      if (b.shipPos !== a.shipPos) {
        return b.shipPos - a.shipPos
      }

      if (a.skippedTurns !== b.skippedTurns) {
        return a.skippedTurns - b.skippedTurns
      }

      return a.name.localeCompare(b.name)
    })

    return {
      ...state,
      winnerId: sorted[0]?.id,
      winnerReason: 'survival',
    }
  }

  return state
}

const applyGalaxyShrink = (state: GameState, createLogEntryId: () => string): GameState => {
  if (state.turn % SHRINK_INTERVAL !== 0 || state.galaxy.length === 0) {
    return state
  }

  const shrunk = state.galaxy.slice(0, Math.max(0, state.galaxy.length - SHRINK_COUNT))
  const maxPosition = shrunk.length
  const clampedPlayersCount = state.players.filter((player) => player.shipPos > maxPosition).length

  const galaxyAfterClampReveal =
    clampedPlayersCount > 0 && maxPosition > 0
      ? shrunk.map((planet, index) =>
          index === maxPosition - 1
            ? {
                ...planet,
                revealed: true,
              }
            : planet,
        )
      : shrunk

  const players = state.players.map((player) => ({
    ...player,
    shipPos: Math.min(player.shipPos, maxPosition),
  }))

  return addLog(
    { ...state, galaxy: galaxyAfterClampReveal, players },
    `Galaxy collapse! ${Math.min(SHRINK_COUNT, state.galaxy.length)} planets were lost.`,
    createLogEntryId,
  )
}

const countAllocatedDice = (allocation: Allocation): number =>
  allocation.move.length + allocation.claim.length + allocation.sabotage.length

const parseDieIdsByColor = (player: Player): Record<Color, string[]> => ({
  red: player.dicePool.filter((die) => die.color === 'red').map((die) => die.id),
  blue: player.dicePool.filter((die) => die.color === 'blue').map((die) => die.id),
  green: player.dicePool.filter((die) => die.color === 'green').map((die) => die.id),
})

const allocationWithAllDice = (player: Player, allocation: Allocation): Allocation => {
  const allAssigned = countAllocatedDice(allocation) === player.dicePool.length
  if (allAssigned) {
    return allocation
  }

  const assigned = new Set([...allocation.move, ...allocation.claim, ...allocation.sabotage])
  const remaining = player.dicePool.map((die) => die.id).filter((dieId) => !assigned.has(dieId))

  return {
    move: [...allocation.move, ...remaining],
    claim: [...allocation.claim],
    sabotage: [...allocation.sabotage],
  }
}

const chooseAction = (
  priorities: Record<ActionType, number>,
  difficulty: Difficulty,
  rng: EngineRngProvider,
): ActionType => {
  const entries = Object.entries(priorities) as [ActionType, number][]
  const sorted = [...entries].sort((a, b) => b[1] - a[1])

  const randomChance = difficulty === 'easy' ? 0.2 : 0.1
  if (rng.nextFloat() < randomChance) {
    return entries[Math.floor(rng.nextFloat() * entries.length)][0]
  }

  return sorted[0][0]
}

const enforceMinimumMoveDice = (
  player: Player,
  allocation: Allocation,
  minimumMoveDice: number,
): Allocation => {
  if (allocation.move.length >= minimumMoveDice) {
    return allocation
  }

  const dieColorById = new Map(player.dicePool.map((die) => [die.id, die.color]))
  const rebalanced: Allocation = {
    move: [...allocation.move],
    claim: [...allocation.claim],
    sabotage: [...allocation.sabotage],
  }

  const takeBestDieForMove = (pool: string[]): string | undefined => {
    const preferredColors: Color[] = ['blue', 'green', 'red']

    for (const color of preferredColors) {
      const index = pool.findIndex((dieId) => dieColorById.get(dieId) === color)
      if (index >= 0) {
        const [dieId] = pool.splice(index, 1)
        return dieId
      }
    }

    return undefined
  }

  while (rebalanced.move.length < minimumMoveDice) {
    const dieFromClaim = takeBestDieForMove(rebalanced.claim)
    if (dieFromClaim) {
      rebalanced.move.push(dieFromClaim)
      continue
    }

    const dieFromSabotage = takeBestDieForMove(rebalanced.sabotage)
    if (dieFromSabotage) {
      rebalanced.move.push(dieFromSabotage)
      continue
    }

    break
  }

  return rebalanced
}

export const computeAIAllocation = (
  player: Player,
  allPlayers: Player[],
  galaxy: Planet[],
  turn: number,
  difficulty: Difficulty,
  rng: EngineRngProvider,
): Allocation => {
  const alloc = emptyAllocation()
  const nearestRivalDist = Math.min(
    ...allPlayers
      .filter((candidate) => candidate.id !== player.id)
      .map((candidate) => Math.abs(candidate.shipPos - player.shipPos)),
  )

  const unclaimedAhead = galaxy.filter((planet) => !planet.claimed && planet.id >= player.shipPos).slice(0, 4)
    .length

  const priorities: Record<ActionType, number> = {
    move: 2.8,
    claim: 3.2,
    sabotage: 1,
  }

  if (player.macGuffins < 3) {
    priorities.move += 0.3
  }

  if (nearestRivalDist <= 2) {
    priorities.sabotage += 1.5
  }

  if (turn >= 6 || galaxy.length <= 9 || unclaimedAhead > 0) {
    priorities.claim += 2
  }

  if (player.macGuffins >= 2) {
    priorities.claim += 0.8
  }

  const dieIdsByColor = parseDieIdsByColor(player)
  const orderedDice = [...dieIdsByColor.blue, ...dieIdsByColor.green, ...dieIdsByColor.red]

  orderedDice.forEach((dieId) => {
    const action = chooseAction(priorities, difficulty, rng)
    alloc[action].push(dieId)

    if (action === 'move') {
      priorities.move -= 0.4
    }

    if (action === 'claim') {
      priorities.claim -= 0.3
    }

    if (action === 'sabotage') {
      priorities.sabotage -= 0.5
    }
  })

  if (player.shipPos === 0) {
    return enforceMinimumMoveDice(player, alloc, 2)
  }

  return alloc
}

const rollWithAffinity = (
  dieIds: string[],
  action: ActionType,
  player: Player,
  rng: EngineRngProvider,
): DebugDieRoll[] => {
  const dieById = new Map<string, Player['dicePool'][number]>(
    player.dicePool.map((die) => [die.id, die] as const),
  )

  return dieIds.map((dieId) => {
    const baseRoll = rng.rollDie()
    const die = dieById.get(dieId)

    if (!die) {
      return {
        dieId,
        color: ACTION_AFFINITY_COLOR[action],
        raw: baseRoll,
        modifier: 0,
        final: baseRoll,
      }
    }

    const modifier = die.color === ACTION_AFFINITY_COLOR[action] ? 1 : -1
    return {
      dieId,
      color: die.color,
      raw: baseRoll,
      modifier,
      final: Math.max(1, baseRoll + modifier),
    }
  })
}

export const resolveCurrentPlayerTurn = (state: GameState, deps: EngineDependencies): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex]

  if (!currentPlayer || state.winnerId) {
    return state
  }

  if (currentPlayer.skippedTurns > 0) {
    const resolvedTurn = state.turn + 1
    const players = state.players.map((player, index) =>
      index === state.currentPlayerIndex
        ? {
            ...player,
            skippedTurns: player.skippedTurns - 1,
            skipImmunity: true,
            allocation: undefined,
          }
        : player,
    )

    const withLog = addLog(
      {
        ...state,
        players,
        turn: resolvedTurn,
      },
      `${currentPlayer.name} is skipped this turn and gains temporary skip immunity until their next playable turn.`,
      deps.createLogEntryId,
    )

    const withPostEffects = resolveWinner(applyGalaxyShrink(withLog, deps.createLogEntryId))

    const debugRecord: DebugTurnRecord = {
      turn: resolvedTurn,
      round: Math.floor((resolvedTurn - 1) / Math.max(1, state.players.length)) + 1,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      skipped: true,
      allocation: emptyAllocation(),
      rolls: { move: [], claim: [], sabotage: [] },
      totals: {
        move: 0,
        sabotage: 0,
        gainedMacGuffins: 0,
      },
      position: {
        before: currentPlayer.shipPos,
        after: currentPlayer.shipPos,
      },
      skips: {
        before: currentPlayer.skippedTurns,
        after: Math.max(0, currentPlayer.skippedTurns - 1),
      },
      galaxy: {
        before: state.galaxy.length,
        after: withPostEffects.galaxy.length,
      },
      winnerAfterTurn: {
        winnerId: withPostEffects.winnerId,
        winnerReason: withPostEffects.winnerReason,
      },
      notes: ['Turn skipped due to sabotage effect.'],
    }

    const snapshot: TurnResolutionSnapshot = {
      ...debugRecord,
      sabotageMessage: 'No sabotage attempts.',
      claim: {
        landedPlanetId: undefined,
        landedPlanetFace: undefined,
        successes: 0,
      },
    }

    const withDebug = appendDebugRecord(withPostEffects, debugRecord)
    return {
      ...withDebug,
      latestTurnResolution: snapshot,
      turnResolutionHistory: [snapshot, ...withDebug.turnResolutionHistory].slice(0, 20),
    }
  }

  const allocation =
    currentPlayer.isAI || !currentPlayer.allocation
      ? computeAIAllocation(
          currentPlayer,
          state.players,
          state.galaxy,
          state.turn,
          state.difficulty,
          deps.rng,
        )
      : currentPlayer.allocation

  const normalizedAllocation = allocationWithAllDice(currentPlayer, allocation)

  const moveRolls = rollWithAffinity(normalizedAllocation.move, 'move', currentPlayer, deps.rng)
  const claimRolls = rollWithAffinity(normalizedAllocation.claim, 'claim', currentPlayer, deps.rng)
  const sabotageRolls = rollWithAffinity(normalizedAllocation.sabotage, 'sabotage', currentPlayer, deps.rng)

  const moveTotal = moveRolls.reduce((sum, roll) => sum + roll.final, 0)
  const sabotageTotal = sabotageRolls.reduce((sum, roll) => sum + roll.final, 0)

  const maxPosition = state.galaxy.length
  const persistedDirection = currentPlayer.moveDirection ?? 'forward'
  const effectiveDirection: 'forward' | 'backward' =
    currentPlayer.shipPos >= maxPosition
      ? 'backward'
      : currentPlayer.shipPos <= 0
        ? 'forward'
        : persistedDirection

  const movedTo =
    effectiveDirection === 'backward'
      ? Math.max(0, currentPlayer.shipPos - moveTotal)
      : Math.min(maxPosition, currentPlayer.shipPos + moveTotal)

  const nextMoveDirection: 'forward' | 'backward' =
    movedTo >= maxPosition ? 'backward' : movedTo <= 0 ? 'forward' : effectiveDirection

  const landedPlanetIndex = movedTo - 1
  const nextGalaxy = [...state.galaxy]
  let gainedMacGuffins = 0
  let claimSuccesses = 0
  let perfectClaimBonusApplied = false
  let landedPlanetId: number | undefined
  let landedPlanetFace: number | undefined

  if (landedPlanetIndex >= 0 && landedPlanetIndex < nextGalaxy.length) {
    const landedPlanet = nextGalaxy[landedPlanetIndex]
    landedPlanetId = landedPlanet.id
    landedPlanetFace = landedPlanet.face
    nextGalaxy[landedPlanetIndex] = {
      ...landedPlanet,
      revealed: true,
    }

    if (!landedPlanet.claimed && claimRolls.length > 0) {
      claimSuccesses = claimRolls.filter((roll) => roll.final >= landedPlanet.face).length
      if (claimSuccesses > 0) {
        const baseMacGuffinReward = getMacGuffinRewardForFace(landedPlanet.face)
        const isPerfectClaim = claimSuccesses === claimRolls.length

        if (baseMacGuffinReward > 0) {
          perfectClaimBonusApplied = isPerfectClaim
          gainedMacGuffins = isPerfectClaim
            ? Math.min(baseMacGuffinReward * 2, MAX_MACGUFFINS_PER_CLAIM)
            : baseMacGuffinReward
        }

        if (gainedMacGuffins > 0) {
          nextGalaxy[landedPlanetIndex] = {
            ...nextGalaxy[landedPlanetIndex],
            claimed: true,
          }
        }
      }
    }
  }

  const playersAfterMove = state.players.map((player, index) =>
    index === state.currentPlayerIndex
      ? {
          ...player,
          shipPos: movedTo,
          moveDirection: nextMoveDirection,
          macGuffins: player.macGuffins + gainedMacGuffins,
          skipImmunity: false,
          allocation: normalizedAllocation,
        }
      : { ...player },
  )

  let sabotageMessage = 'No sabotage attempts.'
  let sabotageApplied:
    | {
        targetId: string
        targetName: string
        amount: number
        before: number
        after: number
        blockedByImmunity?: boolean
      }
    | undefined

  if (sabotageTotal > 0) {
    const targetIndex = findNearestTargetIndex(playersAfterMove, state.currentPlayerIndex)
    if (targetIndex === null) {
      sabotageMessage = `${currentPlayer.name} rolled ${sabotageTotal} sabotage but had no target in range.`
    } else {
      const target = playersAfterMove[targetIndex]
      if (target.skipImmunity) {
        sabotageMessage = `Immunity: ${target.name} resisted sabotage from ${currentPlayer.name} this turn.`
        sabotageApplied = {
          targetId: target.id,
          targetName: target.name,
          amount: 0,
          before: target.skippedTurns,
          after: target.skippedTurns,
          blockedByImmunity: true,
        }
      } else {
        const skips = Math.max(0, sabotageTotal - target.defense)
        const targetSkipsBefore = target.skippedTurns
        const targetSkipsAfter = Math.min(MAX_SKIPPED_TURNS, target.skippedTurns + skips)
        playersAfterMove[targetIndex] = {
          ...target,
          skippedTurns: targetSkipsAfter,
        }
        const appliedSkips = targetSkipsAfter - targetSkipsBefore
        sabotageMessage = `${currentPlayer.name} sabotaged ${target.name} for ${appliedSkips} skip turn(s) (max ${MAX_SKIPPED_TURNS}).`
        sabotageApplied = {
          targetId: target.id,
          targetName: target.name,
          amount: appliedSkips,
          before: targetSkipsBefore,
          after: targetSkipsAfter,
        }
      }
    }
  }

  const resolvedPlayers = playersAfterMove.map((player, index) =>
    index === state.currentPlayerIndex ? { ...player, allocation: undefined } : player,
  )

  const perfectClaimSummary =
    perfectClaimBonusApplied && gainedMacGuffins > 0
      ? ` Perfect Claim bonus applied (reward doubled, cap ${MAX_MACGUFFINS_PER_CLAIM}).`
      : ''

  const summary = `${currentPlayer.name}: move [${moveRolls.map((roll) => roll.final).join(', ') || '-'}] (${moveTotal}), claim [${claimRolls.map((roll) => roll.final).join(', ') || '-'}], sabotage [${sabotageRolls.map((roll) => roll.final).join(', ') || '-'}] (${sabotageTotal}), +${gainedMacGuffins} MacGuffins.${perfectClaimSummary}`

  const withResolvedTurn = addLog(
    {
      ...state,
      players: resolvedPlayers,
      galaxy: nextGalaxy,
      turn: state.turn + 1,
    },
    summary,
    deps.createLogEntryId,
  )

  const withSabotageLog = addLog(withResolvedTurn, sabotageMessage, deps.createLogEntryId)
  const withPostEffects = resolveWinner(applyGalaxyShrink(withSabotageLog, deps.createLogEntryId))
  const resolvedTurn = withPostEffects.turn

  const debugRecord: DebugTurnRecord = {
    turn: resolvedTurn,
    round: Math.floor((resolvedTurn - 1) / Math.max(1, state.players.length)) + 1,
    playerId: currentPlayer.id,
    playerName: currentPlayer.name,
    skipped: false,
    allocation: normalizedAllocation,
    rolls: {
      move: moveRolls,
      claim: claimRolls,
      sabotage: sabotageRolls,
    },
    totals: {
      move: moveTotal,
      sabotage: sabotageTotal,
      gainedMacGuffins,
    },
    position: {
      before: currentPlayer.shipPos,
      after: movedTo,
    },
    skips: {
      before: currentPlayer.skippedTurns,
      after: currentPlayer.skippedTurns,
      appliedToTarget: sabotageApplied,
    },
    galaxy: {
      before: state.galaxy.length,
      after: withPostEffects.galaxy.length,
    },
    winnerAfterTurn: {
      winnerId: withPostEffects.winnerId,
      winnerReason: withPostEffects.winnerReason,
    },
    notes: [
      'Affinity applied to every die: +1 on matching color/action, -1 otherwise (minimum 1).',
      'Players are immune to new skip-turn sabotage until their next playable turn after being skipped.',
      ...(perfectClaimBonusApplied
        ? [
            `Perfect Claim bonus: all claim dice succeeded; reward doubled (capped at ${MAX_MACGUFFINS_PER_CLAIM}).`,
          ]
        : []),
    ],
  }

  const snapshot: TurnResolutionSnapshot = {
    ...debugRecord,
    sabotageMessage,
    claim: {
      landedPlanetId,
      landedPlanetFace,
      successes: claimSuccesses,
    },
  }

  const withDebug = appendDebugRecord(withPostEffects, debugRecord)
  return {
    ...withDebug,
    latestTurnResolution: snapshot,
    turnResolutionHistory: [snapshot, ...withDebug.turnResolutionHistory].slice(0, 20),
  }
}
