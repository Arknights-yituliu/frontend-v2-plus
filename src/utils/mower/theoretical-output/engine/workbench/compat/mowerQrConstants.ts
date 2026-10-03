// Derived from arknights-mower (https://github.com/ArkMowers/arknights-mower)
// Copyright (c) 2021 Nano
// MIT License

/**
 * Mower QR Code layout constants strictly derived from arknights_mower/utils/qrcode.py.
 */
export const QRCODE_SIZE = 215
export const GAP_SIZE = 16
export const TOP = 40
export const BOTTOM = 995
export const LEFT = 40
export const RIGHT_PAIR_X = 2520

export const QR_COUNT = 16
export const TOP_COUNT = 7
export const BOTTOM_LEFT_COUNT = 7
export const BOTTOM_RIGHT_COUNT = 2

export const MIN_CANVAS_WIDTH = 2735
export const MIN_CANVAS_HEIGHT = 1210

export const REFERENCE_IMAGE_WIDTH = 3012
export const REFERENCE_IMAGE_HEIGHT = 1236

export const MIN_DECODE_WIDTH = 100
export const MIN_DECODE_HEIGHT = 100

export const MAX_WINDOW_ATTEMPTS = 5
export const MAX_GLOBAL_ATTEMPTS = 32

export interface QrSlotPosition {
  readonly index: number
  readonly x: number
  readonly y: number
}

/**
 * Pre-computed coordinates for all 16 QR code slots.
 * Index 0-6: Top strip (7 codes)
 * Index 7-13: Bottom-left strip (7 codes)
 * Index 14-15: Bottom-right strip (2 codes)
 */
export const QR_SLOT_POSITIONS: readonly QrSlotPosition[] = Object.freeze(
  (() => {
    const slots: QrSlotPosition[] = []
    const step = GAP_SIZE + QRCODE_SIZE // 231

    // 0..6: 7 codes at top
    for (let i = 0; i < TOP_COUNT; i++) {
      slots.push({
        index: i,
        x: LEFT + i * step,
        y: TOP,
      })
    }

    // 7..13: 7 codes at bottom-left
    for (let i = 0; i < BOTTOM_LEFT_COUNT; i++) {
      slots.push({
        index: TOP_COUNT + i,
        x: LEFT + i * step,
        y: BOTTOM,
      })
    }

    // 14..15: 2 codes at bottom-right
    for (let i = 0; i < BOTTOM_RIGHT_COUNT; i++) {
      slots.push({
        index: TOP_COUNT + BOTTOM_LEFT_COUNT + i,
        x: RIGHT_PAIR_X + i * step,
        y: BOTTOM,
      })
    }

    return slots
  })()
)

export type QrTheme = 'light' | 'dark'

export interface ThemeColors {
  readonly moduleColor: readonly [number, number, number] // [r, g, b]
  readonly backgroundColor: readonly [number, number, number]
}

export const THEME_COLOR_MAP: Record<QrTheme, ThemeColors> = {
  // Light theme: black foreground modules on white background
  light: {
    moduleColor: [0, 0, 0],
    backgroundColor: [255, 255, 255],
  },
  // Dark theme: white foreground modules on black background
  dark: {
    moduleColor: [255, 255, 255],
    backgroundColor: [0, 0, 0],
  },
}
