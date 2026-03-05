export interface PlayerAvatarOption {
  key: string
  label: string
  src: string
}

export const PLAYER_AVATAR_FALLBACK_SRC = '/assets/opponents/placeholder-thumb.svg'

export const PLAYER_AVATAR_OPTIONS: PlayerAvatarOption[] = [
  { key: 'amaz', label: 'Amaz', src: '/assets/avatar/amaz.png' },
  { key: 'light', label: 'Light', src: '/assets/avatar/light.png' },
  { key: 'tina', label: 'Tina', src: '/assets/avatar/tina.png' },
  { key: 'ica', label: 'Ica', src: '/assets/avatar/ica.png' },
  { key: 'jas', label: 'Jas', src: '/assets/avatar/jas.png' },
  { key: 'ata', label: 'Ata', src: '/assets/avatar/ata.png' },
  { key: 'hect', label: 'Hect', src: '/assets/avatar/hect.png' },
  { key: 'king', label: 'King', src: '/assets/avatar/king.png' },
  { key: 'pen', label: 'Pen', src: '/assets/avatar/pen.png' },
  { key: 'rock', label: 'Rock', src: '/assets/avatar/rock.png' },
  { key: 'vic', label: 'Vic', src: '/assets/avatar/vic.png' },
  { key: 'wing', label: 'Wing', src: '/assets/avatar/wing.png' },
]

export const DEFAULT_PLAYER_AVATAR_KEY = PLAYER_AVATAR_OPTIONS[0]?.key ?? 'amaz'

const PLAYER_AVATAR_OPTION_MAP = new Map(
  PLAYER_AVATAR_OPTIONS.map((option) => [option.key, option]),
)

export const isValidPlayerAvatarKey = (value: string): boolean => PLAYER_AVATAR_OPTION_MAP.has(value)

export const resolvePlayerAvatarKey = (value: string | null | undefined): string => {
  if (!value) {
    return DEFAULT_PLAYER_AVATAR_KEY
  }

  return isValidPlayerAvatarKey(value) ? value : DEFAULT_PLAYER_AVATAR_KEY
}

export const getPlayerAvatarOption = (value: string | null | undefined): PlayerAvatarOption => {
  const key = resolvePlayerAvatarKey(value)
  return PLAYER_AVATAR_OPTION_MAP.get(key) ?? {
    key: DEFAULT_PLAYER_AVATAR_KEY,
    label: 'Amaz',
    src: PLAYER_AVATAR_FALLBACK_SRC,
  }
}

export const getPlayerAvatarSrc = (value: string | null | undefined): string => {
  const option = getPlayerAvatarOption(value)
  return option.src
}
