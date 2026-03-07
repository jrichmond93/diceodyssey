import type { Difficulty, GameMode } from '../types'

export interface HomeLaunchState {
  selectedGameSlug: string
  homeStartMode: 'INSTANT' | 'HOTSEAT' | 'ONLINE'
  mode: GameMode
  difficulty: Difficulty
  humanName: string
  aiCount: number
  hotseatCount: number
  hotseatNames: string
}

const HOME_LAUNCH_STATE_KEY = 'dice-odysseys-home-launch-state-v1'

export const HOME_LAUNCH_DEFAULTS: HomeLaunchState = {
  selectedGameSlug: 'space-race',
  homeStartMode: 'INSTANT',
  mode: 'single',
  difficulty: 'medium',
  humanName: 'Captain',
  aiCount: 1,
  hotseatCount: 2,
  hotseatNames: 'Capt1, Capt2',
}

const isValidHomeStartMode = (value: unknown): value is HomeLaunchState['homeStartMode'] =>
  value === 'INSTANT' || value === 'HOTSEAT' || value === 'ONLINE'

const isValidGameMode = (value: unknown): value is GameMode =>
  value === 'single' || value === 'hotseat' || value === 'multiplayer'

const isValidDifficulty = (value: unknown): value is Difficulty =>
  value === 'easy' || value === 'medium'

export const loadHomeLaunchState = (): HomeLaunchState => {
  if (typeof window === 'undefined') {
    return HOME_LAUNCH_DEFAULTS
  }

  const raw = window.localStorage.getItem(HOME_LAUNCH_STATE_KEY)
  if (!raw) {
    return HOME_LAUNCH_DEFAULTS
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HomeLaunchState>

    return {
      selectedGameSlug:
        typeof parsed.selectedGameSlug === 'string' && parsed.selectedGameSlug.trim()
          ? parsed.selectedGameSlug
          : HOME_LAUNCH_DEFAULTS.selectedGameSlug,
      homeStartMode: isValidHomeStartMode(parsed.homeStartMode)
        ? parsed.homeStartMode
        : HOME_LAUNCH_DEFAULTS.homeStartMode,
      mode: isValidGameMode(parsed.mode) ? parsed.mode : HOME_LAUNCH_DEFAULTS.mode,
      difficulty: isValidDifficulty(parsed.difficulty)
        ? parsed.difficulty
        : HOME_LAUNCH_DEFAULTS.difficulty,
      humanName:
        typeof parsed.humanName === 'string' && parsed.humanName.trim().length > 0
          ? parsed.humanName
          : HOME_LAUNCH_DEFAULTS.humanName,
      aiCount: Number.isInteger(parsed.aiCount) && (parsed.aiCount ?? 0) >= 1 && (parsed.aiCount ?? 0) <= 3
        ? (parsed.aiCount as number)
        : HOME_LAUNCH_DEFAULTS.aiCount,
      hotseatCount:
        Number.isInteger(parsed.hotseatCount) && (parsed.hotseatCount ?? 0) >= 2 && (parsed.hotseatCount ?? 0) <= 4
          ? (parsed.hotseatCount as number)
          : HOME_LAUNCH_DEFAULTS.hotseatCount,
      hotseatNames:
        typeof parsed.hotseatNames === 'string' && parsed.hotseatNames.trim().length > 0
          ? parsed.hotseatNames
          : HOME_LAUNCH_DEFAULTS.hotseatNames,
    }
  } catch {
    return HOME_LAUNCH_DEFAULTS
  }
}

export const saveHomeLaunchState = (state: HomeLaunchState): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(HOME_LAUNCH_STATE_KEY, JSON.stringify(state))
}
