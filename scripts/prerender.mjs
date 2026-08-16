import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import express from 'express'
import history from 'connect-history-api-fallback'
import puppeteer from 'puppeteer-core'
import { SEO_ROUTES } from '../src/utils/seo.js'

const CANDIDATE_BROWSERS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
]

function findBrowserExecutable() {
    for (const candidate of CANDIDATE_BROWSERS) {
        if (existsSync(candidate)) {
            return candidate
        }
    }
    return null
}

async function captureRoute(page, baseUrl, routePath) {
    const url = `${baseUrl}${routePath === '/' ? '/' : routePath}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

    // 等待 Vue 挂载并让 useSeoMeta 注入页面 meta 信息
    await page.waitForSelector('#app', { timeout: 30000 }).catch(() => {})
    await page.waitForFunction(
        () => document.querySelector('#app')?.children.length > 0,
        { timeout: 30000 },
    ).catch(() => {})
    await new Promise((resolveWait) => setTimeout(resolveWait, 5000))

    const html = await page.evaluate(() => {
        return '<!DOCTYPE html>\n' + document.documentElement.outerHTML
    })
    return html
}

// 预渲染所有公开索引路由为静态 HTML
export async function prerender({ outDir, log = console }) {
    const executablePath = findBrowserExecutable()
    if (!executablePath) {
        log.warn('[prerender] 未找到 Chrome/Edge，跳过预渲染')
        return false
    }

    const app = express()
    app.use(history())
    app.use(express.static(outDir))
    const server = app.listen(0)
    const port = server.address().port
    const baseUrl = `http://127.0.0.1:${port}`

    let browser
    try {
        browser = await puppeteer.launch({
            executablePath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        })

        for (const route of SEO_ROUTES) {
            const page = await browser.newPage()
            try {
                const html = await captureRoute(page, baseUrl, route.path)

                const relativeDir = route.path === '/' ? '' : route.path.replace(/^\//, '')
                const targetDir = relativeDir ? join(outDir, relativeDir) : outDir
                mkdirSync(targetDir, { recursive: true })
                writeFileSync(join(targetDir, 'index.html'), html, 'utf8')

                log.info(`[prerender] ${route.path} -> ${join(targetDir, 'index.html')}`)
            } catch (error) {
                log.warn(`[prerender] 渲染 ${route.path} 失败: ${error?.message || error}`)
            } finally {
                await page.close()
            }
        }

        return true
    } finally {
        if (browser) {
            await browser.close()
        }
        server.close()
    }
}
