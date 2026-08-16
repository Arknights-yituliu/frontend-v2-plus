// 站点级 SEO 配置（纯数据，无 Vue 依赖，可被 Node 脚本直接 import）
export const SITE_URL = 'https://ark.yituliu.cn'
export const SITE_NAME = '明日方舟一图流'
export const DEFAULT_TITLE = '明日方舟一图流 - 关卡推荐、商店性价比、攒抽计算器'
export const DEFAULT_DESCRIPTION = '明日方舟一图流 - 提供明日方舟关卡推荐、商店性价比、礼包性价比、物品价值表、攒抽计算器等工具，帮助博士高效规划资源'
export const DEFAULT_KEYWORDS = '素材获取,一图流,明日方舟,商店性价比,礼包性价比,物品价值表,攒抽计算器,公招招募计算,基建排班生成器,刷图推荐,性价比,公开招募,掉率,Arknights'
export const OG_IMAGE = `${SITE_URL}/favicon.ico`

// 公开可索引的路由：用于 useSeoMeta / sitemap.xml / llms.txt / 预渲染
// path: 页面路径；title: 页面标题（不含站点名后缀）；description: 页面描述
// changefreq / priority: 仅用于 sitemap.xml
export const SEO_ROUTES = [
    {
        path: '/',
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        changefreq: 'daily',
        priority: 1.0,
    },
    {
        path: '/material/store',
        title: '商店性价比',
        description: '明日方舟商店性价比排行，直观对比各档位商品价值，帮助博士理性氪金、高效规划资源',
        changefreq: 'weekly',
        priority: 0.9,
    },
    {
        path: '/material/pack',
        title: '礼包性价比',
        description: '明日方舟礼包性价比排行，量化各礼包实际价值，助你理性消费、只买高性价比礼包',
        changefreq: 'weekly',
        priority: 0.8,
    },
    {
        path: '/material/value',
        title: '物品价值表',
        description: '明日方舟物品价值表，量化源石、合成玉、理智等各类资源价值，统一衡量刷图收益',
        changefreq: 'weekly',
        priority: 0.9,
    },
    {
        path: '/material/elite',
        title: '精英化与专精性价比',
        description: '明日方舟干员精英化与专精性价比查询，查看材料投入与收益对比',
        changefreq: 'weekly',
        priority: 0.7,
    },
    {
        path: '/tools/gachaCalc',
        title: '攒抽计算器',
        description: '明日方舟攒抽计算器，规划源石与合成玉收支，估算未来卡池可抽取次数',
        changefreq: 'weekly',
        priority: 0.9,
    },
    {
        path: '/tools/operator-zoot-matcher',
        title: '我能抄什么作业',
        description: '根据你已拥有的明日方舟干员，智能匹配可抄的作业阵容，快速找到适合自己的打法',
        changefreq: 'weekly',
        priority: 0.7,
    },
    {
        path: '/information/logistics',
        title: '基建技能一览',
        description: '明日方舟基建技能一览，查询干员基建技能与常用排班配置',
        changefreq: 'weekly',
        priority: 0.8,
    },
    {
        path: '/tools/scheduleV3',
        title: '排班表生成器',
        description: '一键生成明日方舟基建排班表，自动分配干员，提升基建收益',
        changefreq: 'monthly',
        priority: 0.8,
    },
    {
        path: '/tools/scheduleV2',
        title: '排班表（MAA）',
        description: '明日方舟排班表编辑器，适配 MAA 自动化助手',
        changefreq: 'monthly',
        priority: 0.8,
    },
    {
        path: '/tools/mower-plan',
        title: 'Mower 排班表生成器',
        description: '生成适配 Mower 的明日方舟基建排班表',
        changefreq: 'monthly',
        priority: 0.7,
    },
    {
        path: '/tools/schedule-images',
        title: '一图流排班表',
        description: '明日方舟一图流排班表参考，快速查看常用排班方案',
        changefreq: 'monthly',
        priority: 0.6,
    },
    {
        path: '/tools/sui',
        title: '岁兽残识记录器',
        description: '明日方舟岁兽残识记录器，记录与分析岁兽残识相关内容',
        changefreq: 'monthly',
        priority: 0.7,
    },
    {
        path: '/tools/jie-garden',
        title: '界园树洞模拟',
        description: '明日方舟界园树洞模拟工具，探索集成战略界园玩法',
        changefreq: 'monthly',
        priority: 0.7,
    },
    {
        path: '/tools/specializationTimeCalculate',
        title: '专精时间减半计算器',
        description: '明日方舟专精时间减半计算器，计算干员专精训练时间与收益',
        changefreq: 'monthly',
        priority: 0.6,
    },
    {
        path: '/information/sandboxFoods',
        title: '生息演算食材一览',
        description: '明日方舟生息演算食材一览，查询各食材属性与获取方式',
        changefreq: 'monthly',
        priority: 0.7,
    },
    {
        path: '/information/integratedStrategies',
        title: '集成战略结局一览',
        description: '明日方舟集成战略各主题结局达成条件一览，助你集齐全结局',
        changefreq: 'monthly',
        priority: 0.7,
    },
    {
        path: '/survey/operators',
        title: '我的干员',
        description: '记录你的明日方舟干员练度，参与干员大数据统计',
        changefreq: 'monthly',
        priority: 0.7,
    },
    {
        path: '/survey/operator-progression-statistics',
        title: '干员大数据',
        description: '查看明日方舟干员练度大数据统计，了解主流养成趋势',
        changefreq: 'monthly',
        priority: 0.7,
    },
    {
        path: '/survey/maarecruitdata',
        title: '公招 tag 调查',
        description: '明日方舟公开招募 tag 调查，共享公招数据提升招募效率',
        changefreq: 'monthly',
        priority: 0.6,
    },
    {
        path: '/about/links',
        title: '友情链接',
        description: '明日方舟一图流友情链接，优质明日方舟相关网站与工具推荐',
        changefreq: 'monthly',
        priority: 0.5,
    },
    {
        path: '/about/donate',
        title: '支持我们',
        description: '支持明日方舟一图流，赞助服务器与开发成本',
        changefreq: 'monthly',
        priority: 0.5,
    },
]

export function normalizePath(path) {
    if (!path || path === '/') {
        return '/'
    }
    return path.endsWith('/') ? path.slice(0, -1) : path
}

// 根据路径查找对应 SEO 配置，找不到返回 null
export function getSeoRoute(path) {
    const normalized = normalizePath(path)
    return SEO_ROUTES.find((route) => route.path === normalized) || null
}
