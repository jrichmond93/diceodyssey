import type { Color } from '../types'

const DIE_FACE_MIN = 1
const DIE_FACE_MAX = 6
const DIE_COLORS: Color[] = ['red', 'blue', 'green']

let diceAssetPreloadPromise: Promise<void> | undefined

export const getDieFaceAssetPath = (color: Color, value: number): string | undefined => {
  if (value < DIE_FACE_MIN || value > DIE_FACE_MAX) {
    return undefined
  }

  return `/assets/ui/dice/${color}${value}.png`
}

export const getDieColorFallbackAssetPath = (color: Color): string => `/assets/ui/die-${color}.png`

const listDiceAssetPaths = (): string[] => {
  const facePaths = DIE_COLORS.flatMap((color) =>
    Array.from({ length: DIE_FACE_MAX }, (_, index) => getDieFaceAssetPath(color, index + 1)).filter(
      (path): path is string => Boolean(path),
    ),
  )

  const fallbackPaths = DIE_COLORS.map((color) => getDieColorFallbackAssetPath(color))
  return [...facePaths, ...fallbackPaths]
}

const preloadImage = (path: string): Promise<void> =>
  new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = path
  })

export const preloadDiceAnimationAssets = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (!diceAssetPreloadPromise) {
    const paths = listDiceAssetPaths()
    diceAssetPreloadPromise = Promise.all(paths.map((path) => preloadImage(path))).then(() => undefined)
  }

  return diceAssetPreloadPromise
}
