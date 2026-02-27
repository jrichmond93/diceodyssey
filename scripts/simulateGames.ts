import { computeAIAllocation, gameReducer, initialGameState } from '../src/reducers/gameReducer'
import type { Allocation, GameState } from '../src/types'

const TOTAL_GAMES = 50
const MAX_TURNS_PER_GAME = 300

type GameSummary = {
  winnerReason: 'race' | 'survival' | 'timeout'
  totalAwarded: number
  turns: number
  winnerMacGuffins: number
}

const runSingleGame = (): GameSummary => {
  let state: GameState = gameReducer(initialGameState, {
    type: 'INIT_GAME',
    payload: {
      mode: 'single',
      humanNames: ['Sim Human'],
      aiCount: 2,
      difficulty: 'medium',
      debugEnabled: true,
      animationEnabled: false,
    },
  })

  let safety = 0

  while (!state.winnerId && safety < MAX_TURNS_PER_GAME) {
    const current = state.players[state.currentPlayerIndex]

    if (current && !current.isAI && current.skippedTurns <= 0) {
      const allocation: Allocation = computeAIAllocation(
        current,
        state.players,
        state.galaxy,
        state.turn,
        state.difficulty,
      )
      state = gameReducer(state, { type: 'ALLOCATE_DICE', payload: allocation })
    }

    state = gameReducer(state, { type: 'RESOLVE_TURN' })

    if (state.turnResolution.active) {
      state = gameReducer(state, { type: 'END_TURN_RESOLUTION' })
    }

    if (!state.winnerId) {
      state = gameReducer(state, { type: 'NEXT_PLAYER' })
    }

    safety += 1
  }

  const totalAwarded = state.players.reduce((sum, player) => sum + player.macGuffins, 0)
  const winner = state.players.find((player) => player.id === state.winnerId)

  return {
    winnerReason: state.winnerReason ?? 'timeout',
    totalAwarded,
    turns: state.turn,
    winnerMacGuffins: winner?.macGuffins ?? 0,
  }
}

const summaries: GameSummary[] = []

for (let index = 0; index < TOTAL_GAMES; index += 1) {
  summaries.push(runSingleGame())
}

const raceWins = summaries.filter((summary) => summary.winnerReason === 'race').length
const survivalWins = summaries.filter((summary) => summary.winnerReason === 'survival').length
const timeouts = summaries.filter((summary) => summary.winnerReason === 'timeout').length

const avgAwarded = summaries.reduce((sum, summary) => sum + summary.totalAwarded, 0) / TOTAL_GAMES
const avgTurns = summaries.reduce((sum, summary) => sum + summary.turns, 0) / TOTAL_GAMES
const avgWinnerMg = summaries.reduce((sum, summary) => sum + summary.winnerMacGuffins, 0) / TOTAL_GAMES

console.log(JSON.stringify({
  games: TOTAL_GAMES,
  raceWins,
  survivalWins,
  timeouts,
  raceWinRate: Number((raceWins / TOTAL_GAMES).toFixed(3)),
  avgTotalMacGuffinsAwarded: Number(avgAwarded.toFixed(2)),
  avgGameTurns: Number(avgTurns.toFixed(2)),
  avgWinnerMacGuffins: Number(avgWinnerMg.toFixed(2)),
}, null, 2))
