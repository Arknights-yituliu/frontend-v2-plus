import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { visualizer } from "rollup-plugin-visualizer";
import vuetify from 'vite-plugin-vuetify'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver, NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// 自定义插件，用于生成构建时间
function buildTimePlugin() {
    return {
        name: 'build-time-plugin',
        config: () => {
            const now = new Date();
            const formattedTime = now.toLocaleString()
            return {
                define: {
                    // 注入环境变量
                    'import.meta.env.BUILD_TIME': JSON.stringify(formattedTime),
                },
            };
        },
    };
}

// 自定义插件，构建完成后预渲染公开路由为静态 HTML（用于 SEO）
// 已改为构建后独立进程（scripts/prerender.mjs），避免浏览器堆与 Vite/Rollup 堆叠加。
// 保留此插件仅供需要单进程行为的场景显式启用。
function prerenderPlugin() {
    return {
        name: 'prerender-plugin',
        apply: 'build',
        async closeBundle() {
            const { prerender } = await import('./scripts/prerender.mjs')
            const outDir = resolve(__dirname, 'dist')
            await prerender({ outDir })
        },
    };
}

// https://vitejs.dev/config/
// 使用 `vite build --mode no-prerender` 时跳过统计分析插件，供本地快速构建验证
export default defineConfig(({ mode }) => ({
    worker: {
        format: 'es',
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
        extensions: ['', '.js', '.ts', '.json', '.vue', '.scss', '.css']
    },
    plugins: [
        vue(),
        // Vuetify 官方自动 tree-shaking：组件/指令按模板用法自动引入，
        // 对应 main.js 与 plugins/vuetify 中的通配符 import 已移除
        vuetify({ autoImport: true }),
        // Element Plus 服务型 API（ElMessage 等）也能被模板外的代码使用时自动解析，dts 关闭避免生成类型文件
        AutoImport({
            resolvers: [ElementPlusResolver()],
            dts: false,
        }),
        // Element Plus + Naive UI 模板组件按需自动引入
        Components({
            resolvers: [ElementPlusResolver(), NaiveUiResolver()],
            dts: false,
        }),
        // 快速构建模式跳过统计分析插件，减少 gzip 统计与 stats.html 生成开销
        ...(mode === 'no-prerender'
            ? []
            : [visualizer({ open: false, gzipSize: true })]),
        buildTimePlugin()
    ],
    server: {
        host: '0.0.0.0',
        port: 4000,
        proxy: {
            '/official-news-proxy': {
                target: 'https://ak.hypergryph.com',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/official-news-proxy/, '')
            }
        },
        allowedHosts: [
            'zrw.ddns.net',
            'zrw.asia',
            'zrw.yituliu.cn'
        ]
    },
    build: {
        target: "es2015",
        cssTarget: "chrome61",
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                docs: resolve(__dirname, 'docs.html')
            },
            external:['xlsx'],
            output:{
                globals:{
                    xlsx:'XLSX'
                },
                // 产物包含大量干员数据 chunk，部署容器 fd 上限低时并发写盘会触发
                // EMFILE（too many open files），这里压低并发，部署端 ulimit 由
                // scripts/build.mjs 负责抬升
                maxParallelFileOps: 4
            }
        },
    },
}))

