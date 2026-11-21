import {spawnSync} from 'node:child_process'

/**
 * 生产构建入口（npm run build 的实际执行者）
 *
 * <p>部署容器（如 EdgeOne）的文件描述符软限制可能很低，而构建产物包含大量干员数据等
 * 独立 chunk，Rollup 并发写盘时可能触发 EMFILE（too many open files）。
 * 因此在 Linux/macOS 上先尝试抬高 ulimit -n 再依次执行构建步骤；
 * ulimit 抬升失败（超过硬限制）时静默降级，由 maxParallelFileOps 兜底。
 * Windows 本地保持逐步 spawn，行为与原先的 && 链一致。</p>
 */

const BUILD_STEPS = [
    ['node', ['scripts/generate-seo.mjs']],
    ['node', ['--max-old-space-size=4096', 'node_modules/vite/bin/vite.js', 'build']],
    ['node', ['scripts/prerender.mjs']],
]

function runOnWindows() {
    for (const [command, args] of BUILD_STEPS) {
        const result = spawnSync(command, args, {stdio: 'inherit', shell: true})
        if (result.status !== 0) {
            process.exit(result.status ?? 1)
        }
    }
}

function runOnUnix() {
    const chain = BUILD_STEPS
        .map(([command, args]) => `${command} ${args.join(' ')}`)
        .join(' && ')
    // 软限制抬到 65536；超过硬限制时该命令报错但不影响后续，静默忽略
    const result = spawnSync('sh', ['-c', `ulimit -n 65536 2>/dev/null || true; ${chain}`], {stdio: 'inherit'})
    process.exit(result.status ?? 1)
}

if (process.platform === 'win32') {
    runOnWindows()
} else {
    runOnUnix()
}
