import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const myCustomLightTheme = {
    dark: false,
    colors: {
        //背景色
        'background': '#FFFFFF',
        //大概是字体颜色
        'surface': '#FFFFFF',
        'surface-bright': '#FFFFFF',
        'surface-light': '#EEEEEE',
        'surface-variant': '#424242',
        'on-surface-variant': '#EEEEEE',
        'primary': '#1867C0',
        'primary-darken-1': '#1F5592',
        'secondary': '#48A9A6',
        'secondary-darken-1': '#018786',
        'error': '#B00020',
        'info': '#2196F3',
        'success': '#4CAF50',
        'warning': '#FB8C00',
    },
    variables: {
        'border-color': '#000000',
        'border-opacity': 0.12,
        'high-emphasis-opacity': 0.87,
        'medium-emphasis-opacity': 0.60,
        'disabled-opacity': 0.38,
        'idle-opacity': 0.04,
        'hover-opacity': 0.04,
        'focus-opacity': 0.12,
        'selected-opacity': 0.08,
        'activated-opacity': 0.12,
        'secondary-opacity': 0.12,
        'pressed-opacity': 0.12,
        'dragged-opacity': 0.08,
        'theme-kbd': '#212529',
        'theme-on-kbd': '#FFFFFF',
        'theme-code': '#F5F5F5',
        'theme-on-code': '#000000',
    }
}

const vuetify = createVuetify({
    theme: {
        defaultTheme: 'myCustomLightTheme',
        themes: {
            myCustomLightTheme,
            light: {
                primary: '#3F51B5', // #E53935
                secondary: '#E8EAF6', // #FFCDD2
                accent: '#8C9EFF', // #3F51B5
            },
        },
    },
    components,
    directives,
})


export default vuetify
