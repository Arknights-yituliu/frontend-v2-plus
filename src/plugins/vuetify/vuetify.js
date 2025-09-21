import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Brand color palettes anchored to original primary (#1867C0)
const light = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    'surface-variant': '#F5F7FB',
    'on-surface-variant': '#334155',
    primary: '#1867C0',
    'primary-darken-1': '#1F5592',
    secondary: '#48A9A6',
    'secondary-darken-1': '#018786',
    success: '#4CAF50',
    warning: '#FB8C00',
    error: '#B00020',
    info: '#2196F3',
  },
}

const dark = {
  dark: true,
  colors: {
    background: '#141414',
    surface: '#222222',
    'surface-variant': '#323232',
    'on-surface-variant': '#cbd5e1',
    primary: '#1867C0',
    'primary-darken-1': '#1F5592',
    secondary: '#48A9A6',
    'secondary-darken-1': '#018786',
    success: '#4CAF50',
    warning: '#FB8C00',
    error: '#B00020',
    info: '#2196F3',
  },
}

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: { light, dark },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  components,
  directives,
})

export default vuetify
