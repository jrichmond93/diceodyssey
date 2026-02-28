import {
  type ActionType,
  type Allocation,
  type Color,
  type Difficulty,
  type DebugDieRoll,
  type DebugTurnRecord,
  type GameAction,
  type GameState,
  type InitGamePayload,
  type Planet,
  type Player,
  type TurnResolutionSnapshot,
  type TurnResolutionState,
} from '../types'
import { pickRandomUniqueAICharacters } from '../data/aiCharacters'
import { rollDie } from '../utils/rollDie'

const DICE_COLORS: Color[] = ['red', 'red', 'blue', 'blue', 'green', 'green']
const INITIAL_GALAXY_SIZE = 12
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

const getMacGuffinRewardForFace = (face: number): number => MACGUFFIN_REWARD_BY_FACE[face] ?? 0

const idleTurnResolution = (): TurnResolutionState => ({
  active: false,
  stage: 'idle',
  message: '',
})

export const emptyAllocation = (): Allocation => ({
  move: [],
  claim: [],
  sabotage: [],
})

const initialState: GameState = {
  started: false,
  mode: 'single',
  players: [],
  currentPlayerIndex: 0,
  turn: 1,
  galaxy: [],
  difficulty: 'medium',
  winnerId: undefined,
  winnerReason: undefined,
  log: [],
  debugEnabled: false,
  animationEnabled: false,
  debugLog: [],
  turnResolution: idleTurnResolution(),
  latestTurnResolution: undefined,
  turnResolutionHistory: [],
}

const appendDebugRecord = (state: GameState, record: DebugTurnRecord): GameState => {
  if (!state.debugEnabled) {
    return state
  }

  return {
    ...state,
    debugLog: [...state.debugLog, record],
  }
}

const makePlanet = (id: number): Planet => ({
  id,
  face: rollDie(),
  claimed: false,
  revealed: false,
})

const makeDicePool = (playerId: string) =>
  DICE_COLORS.map((color, index) => ({ id: `${playerId}-die-${index}`, color }))

const makePlayer = (id: string, name: string, isAI: boolean, aiCharacterSlug?: string): Player => ({
  id,
  name,
  isAI,
  aiCharacterSlug,
  shipPos: 0,
  macGuffins: 0,
  skippedTurns: 0,
  skipImmunity: false,
  defense: 1,
  dicePool: makeDicePool(id),
  allocation: undefined,
})

const createPlayers = (payload: InitGamePayload): Player[] => {
  if (payload.mode === 'hotseat') {
    return payload.humanNames.map((name, index) => makePlayer(`p${index + 1}`, name, false))
  }

  const humans = [makePlayer('human', payload.humanNames[0] || 'Human', false)]
  const selectedCharacters = pickRandomUniqueAICharacters(payload.aiCount)
  const ais = Array.from({ length: payload.aiCount }, (_, index) => {
    const character = selectedCharacters[index]
    if (!character) {
      return makePlayer(`ai-${index + 1}`, `AI ${index + 1}`, true)
    }

    return makePlayer(`ai-${index + 1}`, character.shortName, true, character.slug)
  })

  return [...humans, ...ais]
}

const addLog = (state: GameState, message: string): GameState => ({
  ...state,
  log: [{ id: crypto.randomUUID(), turn: state.turn, message }, ...state.log].slice(0, 20),
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

const applyGalaxyShrink = (state: GameState): GameState => {
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

  const withLog = addLog(
    { ...state, galaxy: galaxyAfterClampReveal, players },
    `Galaxy collapse! ${Math.min(SHRINK_COUNT, state.galaxy.length)} planets were lost.`,
  )

  return withLog
}

const countAllocatedDice = (allocation: Allocation): number =>
  allocation.move.length + allocation.claim.length + allocation.sabotage.length

const isAllocationValid = (player: Player, allocation: Allocation): boolean => {
  const dieById = new Map(player.dicePool.map((die) => [die.id, die]))
  const seen = new Set<string>()

  const actions: ActionType[] = ['move', 'claim', 'sabotage']
  for (const action of actions) {
    for (const dieId of allocation[action]) {
      const die = dieById.get(dieId)
      if (!die || seen.has(dieId)) {
        return false
      }
      seen.add(dieId)
    }
  }

  return seen.size === player.dicePool.length
}

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
): ActionType => {
  const entries = Object.entries(priorities) as [ActionType, number][]
  const sorted = [...entries].sort((a, b) => b[1] - a[1])

  const randomChance = difficulty === 'easy' ? 0.2 : 0.1
  if (Math.random() < randomChance) {
    return entries[Math.floor(Math.random() * entries.length)][0]
  }

  return sorted[0][0]
}

export const computeAIAllocation = (
  player: Player,
  allPlayers: Player[],
  galaxy: Planet[],
  turn: number,
  difficulty: Difficulty,
): Allocation => {
  const alloc = emptyAllocation()
  const nearestRivalDist = Math.min(
    ...allPlayers
      .filter((candidate) => candidate.id !== player.id)
      .map((candidate) => Math.abs(candidate.shipPos - player.shipPos)),
  )

  const unclaimedAhead = galaxy
    .filter((planet) => !planet.claimed && planet.id >= player.shipPos)
    .slice(0, 4).length

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
  const orderedDice = [
    ...dieIdsByColor.blue,
    ...dieIdsByColor.green,
    ...dieIdsByColor.red,
  ]

  orderedDice.forEach((dieId) => {
    const action = chooseAction(priorities, difficulty)
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

  return alloc
}

const rollWithAffinity = (
  dieIds: string[],
  action: ActionType,
  player: Player,
): DebugDieRoll[] => {
  const dieById = new Map(player.dicePool.map((die) => [die.id, die]))

  return dieIds.map((dieId) => {
    const baseRoll = rollDie()
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

const resolveCurrentPlayerTurn = (state: GameState): GameState => {
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
    )

    const withPostEffects = resolveWinner(applyGalaxyShrink(withLog))

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
        )
      : currentPlayer.allocation

  const normalizedAllocation = allocationWithAllDice(currentPlayer, allocation)

  const moveRolls = rollWithAffinity(normalizedAllocation.move, 'move', currentPlayer)
  const claimRolls = rollWithAffinity(normalizedAllocation.claim, 'claim', currentPlayer)
  const sabotageRolls = rollWithAffinity(normalizedAllocation.sabotage, 'sabotage', currentPlayer)

  const moveTotal = moveRolls.reduce((sum, roll) => sum + roll.final, 0)
  const claimTotal = claimRolls
  const sabotageTotal = sabotageRolls.reduce((sum, roll) => sum + roll.final, 0)

  const maxPosition = state.galaxy.length
  const lastPlanet = maxPosition > 0 ? state.galaxy[maxPosition - 1] : undefined
  const shouldMoveBackward =
    maxPosition > 0 && currentPlayer.shipPos === maxPosition && Boolean(lastPlanet?.claimed)
  const movedTo = shouldMoveBackward
    ? Math.max(0, currentPlayer.shipPos - moveTotal)
    : Math.min(maxPosition, currentPlayer.shipPos + moveTotal)

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

    if (!landedPlanet.claimed && claimTotal.length > 0) {
      claimSuccesses = claimTotal.filter((roll) => roll.final >= landedPlanet.face).length
      if (claimSuccesses > 0) {
        const baseMacGuffinReward = getMacGuffinRewardForFace(landedPlanet.face)
        const isPerfectClaim = claimSuccesses === claimTotal.length

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
  )

  const withSabotageLog = addLog(withResolvedTurn, sabotageMessage)

  const withPostEffects = resolveWinner(applyGalaxyShrink(withSabotageLog))
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
        ? [`Perfect Claim bonus: all claim dice succeeded; reward doubled (capped at ${MAX_MACGUFFINS_PER_CLAIM}).`]
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

export const gameReducer = (state: GameState = initialState, action: GameAction): GameState => {
  switch (action.type) {
    case 'INIT_GAME': {
      const players = createPlayers(action.payload)
      const galaxy = Array.from({ length: INITIAL_GALAXY_SIZE }, (_, i) => makePlanet(i + 1))

      return {
        ...initialState,
        started: true,
        mode: action.payload.mode,
        players,
        galaxy,
        difficulty: action.payload.difficulty,
        debugEnabled: action.payload.debugEnabled,
        animationEnabled: action.payload.animationEnabled,
        debugLog: [],
        latestTurnResolution: undefined,
        turnResolutionHistory: [],
        log: [
          {
            id: crypto.randomUUID(),
            turn: 1,
            message: `Game started: ${action.payload.mode} mode with ${players.length} player(s).`,
          },
        ],
      }
    }

    case 'ALLOCATE_DICE': {
      if (!state.started || state.winnerId) {
        return state
      }

      const currentPlayer = state.players[state.currentPlayerIndex]
      if (!currentPlayer || currentPlayer.isAI) {
        return state
      }

      if (countAllocatedDice(action.payload) !== currentPlayer.dicePool.length) {
        return addLog(state, `${currentPlayer.name} must allocate all 6 dice.`)
      }

      if (!isAllocationValid(currentPlayer, action.payload)) {
        return addLog(
          state,
          `${currentPlayer.name} has an invalid allocation. Assign each die once across Move/Claim/Sabotage.`,
        )
      }

      const players = state.players.map((player, index) =>
        index === state.currentPlayerIndex ? { ...player, allocation: action.payload } : player,
      )

      return {
        ...state,
        players,
      }
    }

    case 'START_TURN_RESOLUTION': {
      if (!state.started || state.winnerId) {
        return state
      }

      return {
        ...state,
        turnResolution: {
          active: true,
          stage: action.payload?.stage ?? 'resolving',
          message: action.payload?.message ?? 'Resolving turn activity...',
        },
      }
    }

    case 'END_TURN_RESOLUTION': {
      return {
        ...state,
        turnResolution: idleTurnResolution(),
      }
    }

    case 'RESOLVE_TURN': {
      if (!state.started || state.winnerId) {
        return state
      }

      const currentPlayer = state.players[state.currentPlayerIndex]
      if (!currentPlayer) {
        return state
      }

      if (!currentPlayer.isAI && currentPlayer.skippedTurns <= 0 && !currentPlayer.allocation) {
        return addLog(state, `${currentPlayer.name} cannot resolve turn without allocating all dice.`)
      }

      return resolveCurrentPlayerTurn(state)
    }

    case 'NEXT_PLAYER': {
      if (!state.started || state.winnerId) {
        return state
      }

      return {
        ...state,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      }
    }

    case 'NEW_GAME': {
      return initialState
    }

    default:
      return state
  }
}

export const initialGameState = initialState
