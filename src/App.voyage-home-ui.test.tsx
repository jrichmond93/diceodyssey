// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    getAccessTokenSilently: vi.fn(),
  }),
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
  })
})

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('Voyage Home UI routes', () => {
  it('renders Voyage Home how-to page at route', () => {
    render(
      <MemoryRouter initialEntries={['/games/voyage-home/how-to-play']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'How to Play Voyage Home' })).toBeTruthy()
    expect(screen.getByText('Local-only MVP guide: single and hotseat modes.')).toBeTruthy()
  })

  it('starts Voyage Home from home launcher and navigates to game page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const voyageHomeCard = screen.getByText('Voyage Home').closest('button')
    expect(voyageHomeCard).toBeTruthy()
    fireEvent.click(voyageHomeCard as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'Start Voyage Home' }))

    expect(screen.getByRole('heading', { name: 'Voyage Home' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Roll' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hold' })).toBeTruthy()
    expect(screen.getAllByAltText(/Captain portrait/i).length).toBeGreaterThan(0)
    expect(screen.getAllByAltText(/Odys portrait/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: /Captain ship token at 0 leagues/i })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Odys ship token at 0 leagues/i })).toBeTruthy()
    expect(screen.getByText('H1')).toBeTruthy()
    expect(screen.getByText('A1')).toBeTruthy()
    expect(screen.getByText(/Leagues Afloat: 0/i)).toBeTruthy()
    expect(screen.getByAltText(/Voyage Home sea art/i)).toBeTruthy()
  })

  it('keeps Online Match enabled when Voyage Home is selected', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const voyageHomeCard = screen.getByText('Voyage Home').closest('button')
    expect(voyageHomeCard).toBeTruthy()
    fireEvent.click(voyageHomeCard as HTMLButtonElement)

    const onlineMatchButton = screen.getByRole('button', { name: /Online Match/i }) as HTMLButtonElement
    expect(onlineMatchButton.disabled).toBe(false)
  })

  it('shows rolling animation and supports gated or auto AI turns', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6)

    try {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      )

      const voyageHomeCard = screen.getByText('Voyage Home').closest('button')
      expect(voyageHomeCard).toBeTruthy()
      fireEvent.click(voyageHomeCard as HTMLButtonElement)
      fireEvent.click(screen.getByRole('button', { name: 'Start Voyage Home' }))

      fireEvent.click(screen.getByRole('button', { name: 'Roll' }))
      expect(screen.getByText(/Rolling Die.../i)).toBeTruthy()
      expect(screen.getAllByRole('img', { name: /die showing/i }).length).toBe(1)

      await waitFor(() => {
        const holdButton = screen.getByRole('button', { name: 'Hold' }) as HTMLButtonElement
        expect(holdButton.disabled).toBe(false)
      }, { timeout: 4000 })

      fireEvent.click(screen.getByRole('button', { name: 'Hold' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continue AI Turn' })).toBeTruthy()
      })

      const autoplayToggle = screen.getByRole('checkbox', { name: /Auto-play AI turns/i }) as HTMLInputElement
      expect(autoplayToggle.checked).toBe(false)
      fireEvent.click(autoplayToggle)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Continue AI Turn' })).toBeNull()
      }, { timeout: 2000 })
    } finally {
      randomSpy.mockRestore()
    }
  }, 15000)

  it('shows and auto-dismisses shipwreck overlay when a bust occurs', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    try {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      )

      const voyageHomeCard = screen.getByText('Voyage Home').closest('button')
      expect(voyageHomeCard).toBeTruthy()
      fireEvent.click(voyageHomeCard as HTMLButtonElement)
      fireEvent.click(screen.getByRole('button', { name: 'Start Voyage Home' }))

      fireEvent.click(screen.getByRole('button', { name: 'Roll' }))

      let shipwreckOverlay: HTMLElement | null = null
      await waitFor(() => {
        const icon = screen.getByAltText(/shipwreck warning icon/i)
        shipwreckOverlay = icon.closest('div.fixed')
        expect(shipwreckOverlay).toBeTruthy()
        expect(shipwreckOverlay?.className).toContain('opacity-100')
      }, { timeout: 8000 })

      await waitFor(() => {
        expect(shipwreckOverlay?.className).toContain('opacity-0')
      }, { timeout: 5000 })
    } finally {
      randomSpy.mockRestore()
    }
  }, 15000)
})
