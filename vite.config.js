import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
        extensions: ['', '.js', '.json', '.vue', '.scss', '.css']
    },
    plugins: [
        vue(),
        visualizer({
            open:true,
            gzipSize:true,
        })
    ],
    server: {
        host: '0.0.0.0'
    },
    build: {
        target: "es2015",
        cssTarget: "chrome61",
        rollupOptions: {},
    },
})

