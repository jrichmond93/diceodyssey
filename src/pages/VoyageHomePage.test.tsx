// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { initialVoyageHomeState, voyageHomeReducer } from '../voyageHome/reducer'
import { VoyageHomePage } from './VoyageHomePage'

const baseState = voyageHomeReducer(initialVoyageHomeState, {
  type: 'INIT_VOYAGE_HOME',
  payload: {
    mode: 'single',
    humanNames: ['Captain'],
    aiProfiles: ['odys'],
  },
})

const winnerState = {
  ...baseState,
  winnerId: 'human',
}

describe('VoyageHomePage winner celebration', () => {
  it('renders confetti celebration overlay when enabled', () => {
    const { container } = render(
      <MemoryRouter>
        <VoyageHomePage
          state={winnerState}
          showWinCelebration
          prefersReducedMotion={false}
          winConfetti={[{ left: 20, delay: 0, duration: 1000, colorClass: 'text-cyan-300' }]}
          isAiThinking={false}
          isRollAnimating={false}
          showAiTurnGate={false}
          autoPlayAiTurns={false}
          onSetAutoPlayAiTurns={() => {}}
          onContinueAiTurn={() => {}}
          onRoll={() => {}}
          onHold={() => {}}
          onCurse={() => {}}
          onNewGame={() => {}}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Voyage Victory!')).toBeTruthy()
    expect(container.querySelectorAll('.human-win-confetti').length).toBeGreaterThan(0)
  })
})
