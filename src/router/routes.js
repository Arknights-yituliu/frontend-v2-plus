import Error404 from "/src/components/Error404.vue";
import STAGE_RECOMMENDATION_REGISTER from '/src/pages/material/stageV3.vue'
import GACHA_CALCULATOR from '/src/pages/tools/gacha-calc.vue'
import REGISTER from '/src/pages/account/register.vue'
import LOGIN from '/src/pages/account/login.vue'
import RETRIEVE from '/src/pages/account/retrieve.vue'
import IMPORT_BY_SKLAND from '/src/pages/survey/importdata.vue'
import SURVEY_OPERATOR from '/src/pages/survey/operators.vue'
import USER_HOME from '/src/pages/account/home.vue'
import STORE from '/src/pages/material/store.vue'
import PACK from '/src/pages/material/pack.vue'
import ITEM_VALUE from '/src/pages/material/value.vue'

// {
//     path: '/',  访问路径
//     text: '关卡推荐',  导航展示的文本
//     name: 'StageRecommendation',  路由名称
//     display: true,   是否展示在导航栏
//     module: 'material',  在导航栏中所属的模块
//     icon: "item", 导航栏上的图标
//     component: StageRecommendation  //引入对应的页面①
//     component: () => import('/src/pages/material/store.vue') //引入对应的页面② 这种引入在不访问对应路径时，不会加载js
// },

const routes = [
    {
        path: '/',
        text: '关卡推荐',
        name: 'StageRecommendation',
        display: true,
        module: 'material',
        icon: "mdi-hexagon-multiple",
        component: STAGE_RECOMMENDATION_REGISTER
    },
    // {
    //     path: '/material/ep14',
    //     text: 'EP14专题',
    //     name: 'EP14',
    //     display: true,
    //     module: 'material',
    //     icon: "item",
    //     component: () => import('/src/pages/material/EP14.vue')
    // },
    {
        path: '/material/store',
        text: '商店性价比',
        name: 'MaterialStore',
        display: true,
        module: 'material',
        icon: "mdi-circle-multiple",
        component: STORE
    },
    {
        path: '/material/pack',
        text: '礼包性价比',
        name: 'PackEfficiency',
        display: true,
        module: 'material',
        icon: "mdi-cart",
        component: PACK
    },
    {
        path: '/material/value',
        text: '物品价值表',
        name: 'MaterialValue',
        display: true,
        module: 'material',
        icon: "mdi-gold",
        component: ITEM_VALUE
    },
    {
        path: '/material/elite',
        text: '精英化与专精性价比',
        name: 'EliteRanking',
        display: true,
        module: 'material',
        icon: "mdi-account-details",
        component: () => import('/src/pages/material/elite')
    },
    {
        path: '/material/drop',
        text: '关卡掉落查询',
        name: 'StageDrop',
        display: false,
        module: 'material',
        icon: "mdi-account-details",
        component: () => import('/src/pages/material/drop.vue')
    },
    {
        path: '/tools/gachaCal',
        text: '攒抽计算器',
        name: 'GachaCalculator1',
        display: false,
        icon: "mdi-wallet",
        component: GACHA_CALCULATOR
    },
    {
        path: '/tools/gachaCalc',
        text: '攒抽计算器',
        name: 'GachaCalculator',
        display: true,
        module: 'tools',
        icon: "mdi-wallet",
        component: GACHA_CALCULATOR
    },
    {
        path: '/tools/scheduleV2',
        text: '排班表生成器',
        name: 'ScheduleV2',
        display: true,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/schedule.v2.vue')
    },
    {
        path: '/tools/schedule',
        text: '排班表生成器',
        name: 'Schedule',
        display: false,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/schedule.v2.vue')
    },
    {
        path: '/tools/scheduleV1',
        text: '排班表生成器',
        name: 'ScheduleV1',
        display: false,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/schedule.v1.vue')
    },
    {
        path: '/tools/dps/calculator',
        text: 'DPS计算器',
        name: 'DPSCalculator',
        display: false,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/dps/calculator.vue')
    },
    {
        path: '/tools/specializationTimeCalculate',
        text: '专精时间减半计算器',
        name: 'HalfOperatorCalculate',
        display: true,
        module: 'tools',
        icon: "mdi-dumbbell",
        component: () => import('/src/pages/tools/specializationTimeCalculate.vue')
    },
    {
        path: '/tools/excels',
        text: '常用计算表',
        name: 'Excels',
        display: false,
        module: 'tools',
        icon: "calculator",
        component: () => import('/src/pages/tools/excels.page.vue')
    },
    {
        path: '/information/logistics',
        text: '基建技能一览',
        name: 'Logistics',
        display: true,
        module: 'information',
        icon: "mdi-floor-plan",
        component: () => import('/src/pages/information/logistics.vue')
    },
    {
        path: '/information/sandboxFoods',
        text: '生息演算食材一览',
        name: 'SandboxFoods',
        display: true,
        module: 'information',
        icon: "mdi-food-drumstick",
        component: () => import('/src/pages/information/sandboxFoods.vue')
    },
    {
        path: '/information/integratedStrategies',
        text: '集成战略结局一览',
        name: 'IntegratedStrategies',
        display: true,
        module: 'information',
        icon: "mdi-routes",
        component: () => import('/src/pages/information/integratedStrategies.vue')
    },
    {
        path: '/account/register',
        text: '注册账号',
        name: 'REGISTER',
        display: true,
        component: REGISTER
    },
    {
        path: '/account/login',
        text: '登录账号',
        name: 'LOGIN',
        display: false,
        component: LOGIN
    },
    {
        path: '/account/retrieve',
        text: '找回账号',
        name: 'RETRIEVE',
        display: false,
        component: RETRIEVE
    },
    {
        path: '/account/home',
        text: '用户中心',
        name: 'AccountHome',
        display: false,
        component: USER_HOME
    },
    {
        path: '/survey/account/importbyskland',
        text: '导入流程',
        name: 'IMPORT_BY_SKLAND',
        component: IMPORT_BY_SKLAND
    },
    {
        path: '/survey/operators',
        text: '干员练度调查',
        name: 'OperatorSurvey',
        display: true,
        module: 'survey',
        icon: "mdi-chart-box",
        component: SURVEY_OPERATOR
    },
    {
        path: '/survey/questionnaire',
        text: '干员携带率问卷',
        name: 'Questionnaire',
        display: true,
        module: 'survey',
        icon: "mdi-chart-bar",
        component: () => import('/src/pages/survey/operator-carry.vue')
    },
    {
        path: '/survey/operator-progression-statistics',
        text: '干员练度调查结果',
        name: 'OperatorRank',
        display: true,
        module: 'survey',
        icon: "mdi-chart-bar-stacked",
        component: () => import('/src/pages/survey/operator-progression-statistics.vue')
        // component: Notice
    },
    {
        path: '/survey/maarecruitdata',
        text: '公招tag调查',
        name: 'RecruitDataSurvey',
        display: true,
        module: 'survey',
        icon: "mdi-chart-bar",
        component: () => import('/src/pages/survey/maarecruitdata.vue')
        // component: Notice
    },
    {
        path: '/about/dev',
        text: '开发相关',
        name: 'Develop',
        display: true,
        module: 'about',
        icon: "mdi-source-branch",
        component: () => import('/src/pages/about/dev.page.vue')
    },
    {
        path: '/about/log',
        text: '开发日志',
        name: 'Log',
        display: false,
        module: 'about',
        icon: "log",
        component: () => import('/src/pages/about/log.page.vue')
    },
    {
        path: '/dev/join-development',
        text: '参与开发',
        name: 'JoinDevelopment',
        display: true,
        module: 'dev',
        icon: "mdi-pencil",
        component: () => import('/src/pages/doc/join-development.vue')
    },
    {
        path: '/about/donate',
        text: '支持我们',
        name: 'Donate',
        display: true,
        module: 'about',
        icon: "mdi-thumb-up",
        component: () => import('/src/pages/about/donate.page.vue')
    },
    {
        path: '/about/links',
        text: '友情链接',
        name: 'FriendlyLink',
        display: true,
        module: 'about',
        icon: "mdi-link-variant",
        component: () => import('/src/pages/about/links.page.vue')
    },
    {
        path: '/material/detail',
        text: '关卡详情',
        display: false,
        component: () => import('/src/pages/video-material/detail.vue')
    },
    {
        path: '/dev',
        text: '测试页面',
        display: false,
        component: () => import('/src/pages/dev/dev.vue')
    },
    {
        path: '/dev/stageEfficiency',
        text: '测试页面',
        display: false,
        component: () => import('/src/pages/dev/stageEfficiency.vue')

    },
    {
        path: '/material/sssl',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/video-material/sssl.vue')
    },
    {
        path: '/skill-rank',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/material/skill-rank.vue')
    },
    {
        path: '/material/sssl2',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/video-material/sssl2.vue')
    },
    {
        path: '/material/sssl3',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/video-material/pack.page.vue')
    },
    {
        path: '/media/weekly',
        text: '周报做图用',
        display: false,
        component: () => import('/src/pages/video-material/weekly.page.vue')
    },
    {
        path: '/test/sandbox',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/sandbox/sb.page.vue')
    },
    {
        path: '/material/exp0',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/material/stageV3E0.vue')
    },
    {
        path: '/material/skland',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/video-material/stageV3.vue')
    },

    {
        path: '/statistics-material',
        text: '材料统计',
        display: false,
        component: () => import('/src/pages/tools/statistics-material.vue')
    },
    {
        path: '/operator-add-time',
        text: '材料统计',
        display: false,
        component: () => import('/src/pages/dev/operator-add-time.vue')
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
        display: true,
        icon: 'mdi-view-grid-plus',
        child: []
    },
    tools: {
        path: '/',
        text: "一图流工具箱",
        display: true,
        icon: 'mdi-toolbox',
        child: []
    },
    survey: {
        path: '/',
        text: "调查与统计",
        display: true,
        icon: 'mdi-account-box-edit-outline',
        child: []
    },
    information: {
        path: '/',
        text: "游戏数据",
        display: true,
        icon: 'mdi-format-list-bulleted',
        child: []
    },
    dev: {
        path: '/',
        text: "参与开发",
        display: true,
        icon: 'mdi-application-cog',
        child: []
    },
    about: {
        path: '/',
        text: "其他信息",
        display: true,
        icon: 'mdi-application-cog',
        child: []
    }
}

const devRoute = ['/survey/questionnaire']

let routeMap = new Map()


for (const route of routes) {

    routeMap.set(route.path, route.text)

    if (!route.module||!route.display) {
        continue
    }

    LinkedTable[route.module].child.push(route)

}

export {
    routes, LinkedTable, routeMap
}
