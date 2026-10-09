// 历史路由变更台账：旧路径 → 新路径
//
// 约定：任何路由的 path 发生变更，都在这里追加一条，不要删除历史条目。
// 这些旧路径由 src/router/routes.js 转成 vue-router 的 redirect 路由，
// 保证旧书签、外部友链和已有搜索收录能落到新地址。
//
// 新增路由 / 改路由时记得同步三处：
//   1. src/router/routes.js      —— 路由与导航分组
//   2. src/utils/seo.js          —— SEO_ROUTES（sitemap / llms.txt / 预渲染 / 运行时 meta）
//   3. 本文件                     —— 若 path 变了，追加旧路径
export const LEGACY_ROUTE_REDIRECTS = [
    // 2026-10 拆分「集成战略工具」「生息演算工具」两个模块，下线「游戏数据」模块
    { from: '/tools/sui', to: '/integrated-strategies/sui' },
    { from: '/tools/jie-garden', to: '/integrated-strategies/jie-garden' },
    { from: '/information/integratedStrategies', to: '/integrated-strategies/endings' },
    { from: '/information/sandboxFoods', to: '/reclamation/sandbox-foods' },
    { from: '/information/logistics', to: '/riic/logistics' },
    // 岁兽残识记录器原先还有一个未展示的快捷路由
    { from: '/sui', to: '/integrated-strategies/sui' },
]
