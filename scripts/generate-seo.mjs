import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEO_ROUTES, SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from '../src/utils/seo.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

const lastmod = new Date().toISOString().slice(0, 10)

function generateSitemap() {
    const urls = SEO_ROUTES.map((route) => {
        const loc = `${SITE_URL}${route.path === '/' ? '/' : route.path}`
        return `    <url>
        <loc>${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${route.changefreq || 'weekly'}</changefreq>
        <priority>${route.priority ?? 0.5}</priority>
    </url>`
    }).join('\n\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${urls}
</urlset>
`

    writeFileSync(resolve(publicDir, 'sitemap.xml'), xml, 'utf8')
    console.log(`[seo] sitemap.xml 已生成，共 ${SEO_ROUTES.length} 条 URL`)
}

function generateLlms() {
    const sections = SEO_ROUTES.map((route) => {
        const title = route.title.includes(SITE_NAME) ? route.title : `${route.title} - ${SITE_NAME}`
        return `- [${title}](${SITE_URL}${route.path === '/' ? '/' : route.path}): ${route.description}`
    }).join('\n')

    const llms = `# ${SITE_NAME}

> ${DEFAULT_DESCRIPTION}

${SITE_NAME}是面向《明日方舟》(Arknights) 玩家的资源规划与数据工具站，提供材料效率计算、关卡刷图推荐、商店与礼包性价比、攒抽计算器、基建排班生成器、干员练度统计等工具。

## 主要工具

${sections}

## 链接

- 项目组织: https://github.com/Arknights-yituliu
- 前端仓库: https://github.com/Arknights-yituliu/frontend-v2-plus
- 文档: ${SITE_URL}/docs.html
`

    writeFileSync(resolve(publicDir, 'llms.txt'), llms, 'utf8')
    console.log(`[seo] llms.txt 已生成`)
}

generateSitemap()
generateLlms()
