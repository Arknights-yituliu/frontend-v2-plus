const defaultBase =
  typeof window !== 'undefined' && window.location
    ? window.location.origin
    : ''

export const MOWER_HTTP_URL =
  import.meta.env.VITE_MOWER_HTTP_URL ?? import.meta.env.VITE_HTTP_URL ?? defaultBase
