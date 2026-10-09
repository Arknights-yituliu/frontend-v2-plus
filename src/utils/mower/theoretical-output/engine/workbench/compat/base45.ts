// Derived from arknights-mower (https://github.com/ArkMowers/arknights-mower)
// Copyright (c) 2021 Nano
// MIT License

/**
 * RFC 9285 Base45 charset:
 * 0-9 (indices 0-9), A-Z (indices 10-35),
 * space (36), $ (37), % (38), * (39), + (40), - (41), . (42), / (43), : (44).
 */
export const BASE45_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

const REVERSE_LOOKUP = new Int16Array(256).fill(-1)
for (let i = 0; i < BASE45_CHARSET.length; i++) {
  const code = BASE45_CHARSET.charCodeAt(i)
  REVERSE_LOOKUP[code] = i
}

/**
 * Encodes a Uint8Array of binary data into an RFC 9285 Base45 string.
 */
export function encodeBase45(bytes: Uint8Array): string {
  let result = ''
  const len = bytes.length
  let i = 0

  while (i < len) {
    if (i + 1 < len) {
      const b0 = bytes[i]!
      const b1 = bytes[i + 1]!
      const val = (b0 << 8) | b1
      const c = val % 45
      const d = Math.floor(val / 45) % 45
      const e = Math.floor(val / 2025) % 45
      result += BASE45_CHARSET[c]! + BASE45_CHARSET[d]! + BASE45_CHARSET[e]!
      i += 2
    } else {
      const b0 = bytes[i]!
      const c = b0 % 45
      const d = Math.floor(b0 / 45) % 45
      result += BASE45_CHARSET[c]! + BASE45_CHARSET[d]!
      i += 1
    }
  }

  return result
}

/**
 * Decodes an RFC 9285 Base45 string into a Uint8Array of binary data.
 */
export function decodeBase45(str: string): Uint8Array {
  const strLen = str.length
  if (strLen === 0) {
    return new Uint8Array(0)
  }

  // Pre-calculate output size
  const fullTriplets = Math.floor(strLen / 3)
  const remainder = strLen % 3
  if (remainder === 1) {
    throw new Error(
      `Invalid Base45 string length: remaining length cannot be 1 (total length: ${strLen})`
    )
  }
  const outSize = fullTriplets * 2 + (remainder === 2 ? 1 : 0)
  const output = new Uint8Array(outSize)
  let outIdx = 0
  let i = 0

  while (i < strLen) {
    const rem = strLen - i
    if (rem >= 3) {
      const c0 = str.charCodeAt(i)
      const c1 = str.charCodeAt(i + 1)
      const c2 = str.charCodeAt(i + 2)
      if (c0 > 255 || c1 > 255 || c2 > 255) {
        throw new Error(`Invalid Base45 character in input string`)
      }
      const v0 = REVERSE_LOOKUP[c0]!
      const v1 = REVERSE_LOOKUP[c1]!
      const v2 = REVERSE_LOOKUP[c2]!
      if (v0 < 0 || v1 < 0 || v2 < 0) {
        throw new Error(
          `Invalid Base45 character: '${str.charAt(v0 < 0 ? i : v1 < 0 ? i + 1 : i + 2)}'`
        )
      }
      const val = v0 + v1 * 45 + v2 * 2025
      if (val > 65535) {
        throw new Error(
          `Base45 overflow: 16-bit value ${val} exceeds 65535 for triple "${str.slice(i, i + 3)}"`
        )
      }
      output[outIdx++] = (val >> 8) & 0xff
      output[outIdx++] = val & 0xff
      i += 3
    } else {
      // rem === 2
      const c0 = str.charCodeAt(i)
      const c1 = str.charCodeAt(i + 1)
      if (c0 > 255 || c1 > 255) {
        throw new Error(`Invalid Base45 character in input string`)
      }
      const v0 = REVERSE_LOOKUP[c0]!
      const v1 = REVERSE_LOOKUP[c1]!
      if (v0 < 0 || v1 < 0) {
        throw new Error(
          `Invalid Base45 character: '${str.charAt(v0 < 0 ? i : i + 1)}'`
        )
      }
      const val = v0 + v1 * 45
      if (val > 255) {
        throw new Error(
          `Base45 overflow: 8-bit value ${val} exceeds 255 for pair "${str.slice(i, i + 2)}"`
        )
      }
      output[outIdx++] = val & 0xff
      i += 2
    }
  }

  return output
}
