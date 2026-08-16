# SEO / GEO 优化指南

> 本文档基于 2026-08 的 SEO/GEO 优化改动编写，描述的是**当前仓库中实际存在的实现**。

## 概述

本次优化旨在提升「明日方舟一图流」在搜索引擎与 AI 生成式引擎（GEO，Generative Engine Optimization）中的可发现性。核心思路：

1. **单一数据源** — 所有页面的 SEO 配置集中在一个纯数据文件 `src/utils/seo.js` 中。
2. **每页动态 meta** — 使用 `@unhead/vue` 在路由切换时为每个页面注入独立的 `title`、`description`、OG/Twitter 标签与 `canonical`。
3. **预渲染（Prerender）** — 构建后使用 Puppeteer 将每个公开路由渲染成静态 HTML，解决原 SPA 对不执行 JS 的爬虫（如 GPTBot、ClaudeBot）"空白页面"的问题。
4. **结构化数据** — 首页加入 `Organization` JSON-LD 标记。
5. **站点地图与 llms.txt** — 构建时自动从同一份配置生成 `sitemap.xml` 与 `llms.txt`。

---

## 架构总览

```
src/utils/seo.js  (单一数据源：SITE_URL / SITE_NAME / DEFAULT_* / OG_IMAGE / SEO_ROUTES)
        │
        ├──▶ src/App.vue      useSeoMeta() + useHead()  → 运行时动态 meta（每页独立）
        │
        ├──▶ scripts/generate-seo.mjs   → 生成 public/sitemap.xml + public/llms.txt（构建前）
        │
        └──▶ scripts/prerender.mjs      → 预渲染每个路由为静态 HTML（构建后，经 vite.config.js 插件调用）
```

构建命令 `npm run build` 的执行顺序为：

```
1. node scripts/generate-seo.mjs      # 生成 sitemap.xml + llms.txt 到 public/
2. vite build                         # 打包，public/ 内容复制进 dist/
3. (closeBundle 钩子) prerender.mjs   # 用 headless 浏览器逐路由渲染，写回 dist/
```

---

## 文件说明

| 文件 | 职责 |
|---|---|
| `src/utils/seo.js` | 站点级 SEO 配置的**唯一数据源**（纯 JS，无 Vue 依赖，可被 Node 脚本直接 import） |
| `src/main.js` | 注册 `@unhead/vue` 的 `createHead()` 插件 |
| `src/App.vue` | 使用 `useSeoMeta()` / `useHead()` 按路由注入标题、描述、OG/Twitter、canonical |
| `scripts/generate-seo.mjs` | 从 `SEO_ROUTES` 生成 `public/sitemap.xml` 与 `public/llms.txt` |
| `scripts/prerender.mjs` | 用 puppeteer-core 将 `SEO_ROUTES` 中的每个路由渲染为 `dist/<route>/index.html` |
| `vite.config.js` | `prerenderPlugin()` 在 `closeBundle` 阶段调用 `prerender.mjs` |
| `index.html` | 基础 meta + `Organization` JSON-LD（作为无 JS 时的兜底与结构化数据载体） |
| `public/robots.txt` | 允许所有爬虫 + 声明 `Sitemap:` |
| `public/sitemap.xml` | 构建时自动生成（**勿手改**） |
| `public/llms.txt` | 构建时自动生成（**勿手改**） |

---

## 核心实现

### 1. `src/utils/seo.js` — 单一数据源

导出以下常量与函数：

- `SITE_URL` / `SITE_NAME` / `DEFAULT_TITLE` / `DEFAULT_DESCRIPTION` / `DEFAULT_KEYWORDS` / `OG_IMAGE`
- `SEO_ROUTES` — 公开可索引路由数组，每项含 `path` / `title` / `description` / `changefreq` / `priority`
- `normalizePath(path)` — 归一化路径（去末尾 `/`）
- `getSeoRoute(path)` — 按路径查找 SEO 配置，找不到返回 `null`

> 该文件**不依赖 Vue**，因此 `scripts/*.mjs` 可被 Node 直接 `import`，无需构建。

### 2. `src/main.js` — 注册 head 插件

```js
import { createHead } from '@unhead/vue/client'
const head = createHead()
app.use(head)
```

### 3. `src/App.vue` — 每页动态 meta

```js
const seoRoute = computed(() => getSeoRoute(route.path));
const pageDescription = computed(() => seoRoute.value?.description || DEFAULT_DESCRIPTION);

useSeoMeta({
    title: () => seoTitle.value,
    description: () => pageDescription.value,
    ogTitle: () => seoTitle.value,
    ogDescription: () => pageDescription.value,
    ogUrl: () => canonicalUrl.value,
    // ...
});

useHead({
    htmlAttrs: { lang: 'zh-CN' },
    link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
});
```

`seoTitle` 的拼接规则：若标题已含站点名则原样返回，否则追加 ` - 明日方舟一图流`。

> 原先 `src/router/index.js` 中的 `document.title = ...` 已移除，标题统一交给 `@unhead` 管理。

### 4. `index.html` — 结构化数据

`<head>` 中加入 `Organization` JSON-LD（含 `sameAs` 指向 GitHub 组织与 Bilibili 主页）。静态的 `canonical` 已移除，避免与 `@unhead` 注入的逐页 canonical 冲突。

---

## 为新页面添加 SEO 配置

在 `src/utils/seo.js` 的 `SEO_ROUTES` 数组中新增一项即可：

```js
{
    path: '/tools/your-new-tool',
    title: '你的新工具',
    description: '一句话描述该工具的功能与价值',
    changefreq: 'weekly',   // daily / weekly / monthly
    priority: 0.7,          // 0.0 ~ 1.0
},
```

完成后该路由会**自动**：

1. 出现在 `sitemap.xml` 中；
2. 出现在 `llms.txt` 中；
3. 被 `prerender.mjs` 预渲染为 `dist/tools/your-new-tool/index.html`；
4. 在运行时获得独立的 `title` / `description` / OG / canonical。

无需改动其他文件。

---

## 常用命令

```bash
npm run build      # 生成 SEO 文件 → vite build → 预渲染
npm run gen:seo    # 仅重新生成 sitemap.xml 与 llms.txt
```

---

## 部署说明

- 站点以**静态文件**部署到腾讯云 COS（见 `.github/workflows/build-and-deploy-to-tencent-cos.yml`），`npm run build` 产出 `dist/` 后上传。
- 预渲染会为每个路由生成独立文件（如 `dist/material/store/index.html`）。**CDN/COS 需将 `/material/store` 这类深层路径映射到对应 `index.html`**，而不是一律回退到首页 `index.html`，否则预渲染文件不会命中。
- 预渲染依赖本机 Chrome/Edge（`scripts/prerender.mjs` 中的 `CANDIDATE_BROWSERS`）。GitHub `ubuntu-latest` 自带 Chrome，CI 可直接使用；本机若未安装则预渲染会被跳过（仅打印 warning）。

---

## 已知限制 / 待优化

1. **`og:image` 仍为 `favicon.ico`**（`src/utils/seo.js` 的 `OG_IMAGE`），建议替换为 1200×630 的分享图。
2. **预渲染为"外壳级"**：`prerender.mjs` 目前使用固定 5 秒等待，仅保证标题、导航、meta 进入静态 HTML；异步加载的数据表格（来自 `backend.yituliu.cn` / IndexedDB）可能未渲染进静态 HTML。如需把真实数据写入静态页面，可改用 `networkidle` 或显式等待。
3. **CI 静默跳过**：未找到浏览器时 `prerender.mjs` 仅 `console.warn` 并返回 `false`，构建仍会成功。若需严格保证，可在 CI 中让浏览器缺失时报错。
4. **生成文件会随构建变脏**：`public/sitemap.xml` 与 `public/llms.txt` 每次构建都会重写，会在 git 中显示为改动；如不希望如此，可将其加入 `.gitignore`（不影响 `dist/` 产物）。
5. 页面 meta 的 `description` 目前为各页面手动维护的中文文案，新增页面时记得补充，否则回退到 `DEFAULT_DESCRIPTION`。
