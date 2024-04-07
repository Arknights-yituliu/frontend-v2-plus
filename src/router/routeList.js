import Error404 from "/src/pages/layout/error404.vue";
import StageRecommendation from '/src/pages/material/stageV3.page.vue'
import GachaCalculator from '/src/pages/tools/gachaCalc.page.vue'

const routes = [
    {
        path: '/',
        text: '关卡推荐',
        name: 'StageRecommendation',
        display: true,
        module: 'material',
        icon: "item",
        component: StageRecommendation
    },
    {
        path: '/material/store',
        text: '商店性价比',
        name: 'MaterialStore',
        display: true,
        module: 'material',
        icon: "shop",
        component: () => import('/src/pages/material/store.page.vue')
    },
    {
        path: '/material/pack',
        text: '礼包性价比',
        name: 'PackEfficiency',
        display: true,
        module: 'material',
        icon: "pack",
        component: () => import('/src/pages/material/pack.page.vue')
    },
    {
        path: '/material/value',
        text: '物品价值表',
        name: 'MaterialValue',
        display: true,
        module: 'material',
        icon: "materials",
        component: () => import('/src/pages/material/value.page.vue')
    },
    {
        path: '/material/elite',
        text: '精二性价比',
        name: 'EliteRanking',
        display: true,
        module: 'material',
        icon: "elite",
        component: () => import('/src/pages/material/elite.page.vue')
    },
    {
        path: '/tools/gachaCal',
        text: '攒抽计算器',
        name: 'GachaCalculator1',
        display: false,
        component: GachaCalculator
    },
    {
        path: '/tools/gachaCalc',
        text: '攒抽计算器',
        name: 'GachaCalculator',
        display: true,
        module: 'tools',
        icon: "calculator",
        component: GachaCalculator
    },
    {
        path: '/tools/schedule',
        text: '排班表生成器',
        name: 'Schedule',
        display: true,
        module: 'tools',
        icon: "schedule",
        component: () => import('/src/pages/tools/schedule.page.vue')
    },
    {
        path: '/tools/logistics',
        text: '基建技能一览',
        name: 'Logistics',
        display: true,
        module: 'tools',
        icon: "logistics",
        component: () => import('/src/pages/tools/logistics.vue')
    },
    {
        path: '/tools/Irene',
        text: '艾丽妮专精计算器',
        name: 'Irene',
        display: true,
        module: 'tools',
        icon: "calculator",
        component: () => import('/src/pages/tools/Irene.page.vue')
    },
    {
        path: '/survey/account/home',
        text: '用户中心',
        name: 'User',
        display: true,
        module: 'survey',
        icon: "user",
        component: () => import('/src/pages/survey/account/home.page.vue')
    },
    {
        path: '/survey/operators',
        text: '干员调查',
        name: 'OperatorSurvey',
        display: true,
        module: 'survey',
        icon: "survey2",
        component: () => import('/src/pages/survey/operators.page.vue')
    },
    {
        path: '/survey/rank',
        text: '干员练度调查结果',
        name: 'OperatorRank',
        display: true,
        module: 'survey',
        icon: "rank",
        component: () => import('/src/pages/survey/rank.page.vue')
    },
    {
        path: '/survey/maarecruitdata',
        text: '公招tag调查',
        name: 'RecruitDataSurvey',
        display: true,
        module: 'survey',
        icon: "survey2",
        component: () => import('/src/pages/survey/maarecruitdata.page.vue')
    },
    {
        path: '/about/dev',
        text: '开发相关',
        name: 'Develop',
        display: true,
        module: 'about',
        icon: "develop",
        component: () => import('/src/pages/about/dev.page.vue')
    },
    {
        path: '/about/log',
        text: '开发日志',
        name: 'Log',
        display: true,
        module: 'about',
        icon: "log",
        component: () => import('/src/pages/about/log.page.vue')
    },
    {
        path: '/about/donate',
        text: '支持我们',
        name: 'Donate',
        display: true,
        module: 'about',
        icon: "encourage",
        component: () => import('/src/pages/about/donate.page.vue')
    },
    {
        path: '/about/links',
        text: '友情链接',
        name: 'FriendlyLink',
        display: true,
        module: 'about',
        icon: "link",
        component: () => import('/src/pages/about/links.page.vue')
    },
    {
        path: '/font',
        text: '字体测试',
        display: false,
        component: () => import('/src/pages/font.vue')
    },
    {
        path: '/material/detail',
        text: '关卡详情',
        display: false,
        component: () => import('/src/pages/material/detail.page.vue')
    },
    {
        path: '/:catchAll(.*)',
        display: false,
        component: Error404
    }
]

const LinkedTable = {
    material: {
        path: '/',
        text: "材料收益",
        child: []
    },
    tools: {
        path: '/',
        text: "一图流工具箱",
        child: []
    },
    survey: {
        path: '/',
        text: "调查与统计",
        child: []
    },
    about: {
        path: '/',
        text: "其他信息",
        child: []
    }
}

for (const route of routes) {
    if(route.module){
        LinkedTable[route.module].child.push(route)
    }

}

export {
    routes, LinkedTable
}