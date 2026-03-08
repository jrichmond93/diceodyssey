// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { initialMythicRevealState, mythicRevealReducer } from '../mythicReveal/reducer'
import type { MythicRevealState } from '../mythicReveal/types'
import { MythicRevealPage } from './MythicRevealPage'

const initState = (): MythicRevealState =>
  mythicRevealReducer(initialMythicRevealState, {
    type: 'INIT_MYTHIC_REVEAL',
    payload: {
      mode: 'single',
      humanName: 'Captain',
      aiProfile: 'circe',
      forcedImageIds: ['trojan-horse-vision', 'sirens-reef-vision'],
    },
  })

describe('MythicRevealPage', () => {
  it('invokes roll action from turn controls', () => {
    const onRoll = vi.fn()

    render(
      <MemoryRouter>
        <MythicRevealPage
          state={initState()}
          showWinCelebration={false}
          prefersReducedMotion={false}
          winConfetti={[]}
          isAiThinking={false}
          onRoll={onRoll}
          onReveal={() => {}}
          onSabotage={() => {}}
          onEndTurn={() => {}}
          onNewGame={() => {}}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Roll 6 Dice' }))
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Action required:/)).toBeTruthy()
  })

  it('shows reveal/sabotage choices and emits handlers', () => {
    const base = initState()
    const state: MythicRevealState = {
      ...base,
      pendingRoll: {
        dice: [1, 2, 2, 4, 5, 6],
        canSabotage: true,
      },
      players: [
        base.players[0],
        {
          ...base.players[1],
          board: {
            ...base.players[1].board,
            sectionsRevealed: [3, 5],
          },
        },
      ],
    }

    const onReveal = vi.fn()
    const onSabotage = vi.fn()

    render(
      <MemoryRouter>
        <MythicRevealPage
          state={state}
          showWinCelebration={false}
          prefersReducedMotion={false}
          winConfetti={[]}
          isAiThinking={false}
          onRoll={() => {}}
          onReveal={onReveal}
          onSabotage={onSabotage}
          onEndTurn={() => {}}
          onNewGame={() => {}}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal 4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sabotage 5' }))

    expect(onReveal).toHaveBeenCalledWith(4)
    expect(onSabotage).toHaveBeenCalledWith(5)
    expect(screen.queryByText(/Section \d/)).toBeNull()
  })
})
