import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        host: '0.0.0.0'
    },
    build: {
        target: "es2015",
        cssTarget: "chrome61",
        rollupOptions: {},
    },
})

