import Error404 from "/src/components/layout/Error404.vue";
import STAGE_RECOMMENDATION_REGISTER from '/src/pages/material/stageV3.vue'
import GACHA_CALCULATOR from '/src/pages/tools/gacha-calc.vue'
import REGISTER from '/src/pages/account/register.vue'
import LOGIN from '/src/pages/account/login.vue'
import RETRIEVE from '/src/pages/account/retrieve.vue'
import IMPORT_BY_SKLAND from '/src/pages/survey/importdata.vue'
import SURVEY_OPERATOR from '/src/pages/survey/operator.vue'
import USER_HOME from '/src/pages/account/home.vue'
import STORE from '/src/pages/material/store.vue'
import PACK from '/src/pages/material/pack.vue'
import ITEM_VALUE from '/src/pages/material/value.vue'
import INDEX from '/src/pages/index.vue'

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
        path: '/i',
        text: '关卡推荐',
        name: 'Index',
        display: false,
        module: 'material',
        icon: "mdi-hexagon-multiple",
        component: INDEX,
        meta: {
            title: '关卡推荐'
        }
    },
    {
        path: '/',
        text: '关卡推荐',
        name: 'StageRecommendation',
        display: true,
        module: 'material',
        icon: "mdi-hexagon-multiple",
        component: STAGE_RECOMMENDATION_REGISTER,
        meta: {
            title: '关卡推荐'
        }
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
        component: STORE,
        meta: {
            title: '商店性价比'
        }
    },
    {
        path: '/material/pack',
        text: '礼包性价比',
        name: 'PackEfficiency',
        display: true,
        module: 'material',
        icon: "mdi-cart",
        component: PACK,
        meta: {
            title: '礼包性价比'
        }
    },
    {
        path: '/material/value',
        text: '物品价值表',
        name: 'MaterialValue',
        display: true,
        module: 'material',
        icon: "mdi-gold",
        component: ITEM_VALUE,
        meta: {
            title: '物品价值表'
        }
    },
    {
        path: '/material/elite',
        text: '精英化与专精性价比',
        name: 'EliteRanking',
        display: true,
        module: 'material',
        icon: "mdi-account-details",
        component: () => import('/src/pages/material/elite'),
        meta: {
            title: '精英化与专精性价比'
        }
    },
    {
        path: '/material/drop',
        text: '关卡掉落查询',
        name: 'StageDrop',
        display: false,
        module: 'material',
        icon: "mdi-account-details",
        component: () => import('/src/pages/material/drop.vue'),
        meta: {
            title: '关卡掉落查询'
        }
    },
    {
        path: '/tools/gachaCal',
        text: '攒抽计算器',
        name: 'GachaCalculator1',
        display: false,
        icon: "mdi-wallet",
        component: GACHA_CALCULATOR,
        meta: {
            title: '攒抽计算器'
        }
    },
    {
        path: '/tools/gachaCalc',
        text: '攒抽计算器',
        name: 'GachaCalculator',
        display: true,
        module: 'tools',
        icon: "mdi-wallet",
        component: GACHA_CALCULATOR,
        meta: {
            title: '攒抽计算器'
        }
    },
    {
        path: '/tools/gachaCalcTest',
        text: '攒抽计算器（测试）',
        name: 'GachaCalculatorTest',
        display: false,
        module: 'tools',
        icon: "mdi-wallet",
        component: () => import('/src/pages/tools/gacha-calc-test.vue'),
        meta: {
            title: '攒抽计算器（测试）'
        }
    },
    {
        path: '/tools/scheduleV2',
        text: '排班表生成器',
        name: 'ScheduleV2',
        display: true,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/schedule.v2.vue'),
        meta: {
            title: '排班表生成器'
        }
    },
    {
        path: '/tools/mower-plan',
        text: '排班表（Mower）',
        name: 'MowerPlan',
        display: true,
        module: 'tools',
        icon: "mdi-mower",
        component: () => import('/src/pages/tools/mower-plan.vue'),
        meta: {
            title: 'Mower排班表生成器'
        }
    },
    {
        path: '/tools/sui',
        text: '岁兽残识记录器',
        name: 'sui1',
        module: 'tools',
        icon: "mdi-application-edit",
        display: true,
        component: () => import('/src/pages/tools/sui.vue'),
        meta: {
            title: '岁兽残识记录器'
        }
    },
    {
        path: '/sui',
        text: '岁兽残识记录器',
        name: 'sui2',
        display: false,
        component: () => import('/src/pages/tools/sui.vue'),
        meta: {
            title: '岁兽残识记录器'
        }
    },
    {
        path: '/tools/schedule',
        text: '排班表生成器',
        name: 'Schedule',
        display: false,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/schedule.v2.vue'),
        meta: {
            title: '排班表生成器'
        }
    },
    {
        path: '/tools/scheduleV1',
        text: '排班表生成器',
        name: 'ScheduleV1',
        display: false,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/schedule.v1.vue'),
        meta: {
            title: '排班表生成器'
        }
    },
    {
        path: '/tools/dps/calculator',
        text: 'DPS计算器',
        name: 'DPSCalculator',
        display: false,
        module: 'tools',
        icon: "mdi-calendar-clock",
        component: () => import('/src/pages/tools/dps/calculator.vue'),
        meta: {
            title: 'DPS计算器'
        }
    },
    {
        path: '/tools/specializationTimeCalculate',
        text: '专精时间减半计算器',
        name: 'HalfOperatorCalculate',
        display: true,
        module: 'tools',
        icon: "mdi-dumbbell",
        component: () => import('/src/pages/tools/specializationTimeCalculate.vue'),
        meta: {
            title: '专精时间减半计算器'
        }
    },
    {
        path: '/tools/excels',
        text: '常用计算表',
        name: 'Excels',
        display: false,
        module: 'tools',
        icon: "calculator",
        component: () => import('/src/pages/tools/excels.page.vue'),
        meta: {
            title: '常用计算表'
        }
    },
    {
        path: '/information/logistics',
        text: '基建技能一览',
        name: 'Logistics',
        display: true,
        module: 'information',
        icon: "mdi-floor-plan",
        component: () => import('/src/pages/information/logistics.vue'),
        meta: {
            title: '基建技能一览'
        }
    },
    {
        path: '/information/sandboxFoods',
        text: '生息演算食材一览',
        name: 'SandboxFoods',
        display: true,
        module: 'information',
        icon: "mdi-food-drumstick",
        component: () => import('/src/pages/information/sandboxFoods.vue'),
        meta: {
            title: '生息演算食材一览'
        }
    },
    {
        path: '/information/integratedStrategies',
        text: '集成战略结局一览',
        name: 'IntegratedStrategies',
        display: true,
        module: 'information',
        icon: "mdi-routes",
        component: () => import('/src/pages/information/integrated-strategies/integratedStrategies.vue'),
        meta: {
            title: '集成战略结局一览'
        }
    },
    {
        path: '/account/register',
        text: '注册账号',
        name: 'REGISTER',
        display: true,
        component: REGISTER,
        meta: {
            title: '注册账号'
        }
    },
    {
        path: '/account/login',
        text: '登录账号',
        name: 'LOGIN',
        display: false,
        component: LOGIN,
        meta: {
            title: '登录账号'
        }
    },
    {
        path: '/account/retrieve',
        text: '找回账号',
        name: 'RETRIEVE',
        display: false,
        component: RETRIEVE,
        meta: {
            title: '找回账号'
        }
    },
    {
        path: '/account/home',
        text: '用户中心',
        name: 'AccountHome',
        display: false,
        component: USER_HOME,
        meta: {
            title: '用户中心'
        }
    },
    {
        path: '/survey/account/importbyskland',
        text: '导入流程',
        name: 'IMPORT_BY_SKLAND',
        component: IMPORT_BY_SKLAND,
        meta: {
            title: '导入流程'
        }
    },
    {
        path: '/survey/operators',
        text: '干员练度调查',
        name: 'OperatorSurvey',
        display: true,
        module: 'survey',
        icon: "mdi-chart-box",
        component: SURVEY_OPERATOR,
        meta: {
            title: '干员练度调查'
        }
    },
    {
        path: '/survey/operator-progression-statistics',
        text: '干员练度调查结果',
        name: 'OperatorRank',
        display: true,
        module: 'survey',
        icon: "mdi-chart-bar-stacked",
        component: () => import('/src/pages/survey/operator-progression-statistics.vue'),
        meta: {
            title: '干员练度调查结果'
        }
    },
    {
        path: '/survey/questionnaire',
        text: '干员携带优先级问卷',
        name: 'Questionnaire',
        display: true,
        module: 'survey',
        icon: "mdi-chart-bar",
        component: () => import('/src/pages/survey/operator-carry.vue'),
        meta: {
            title: '干员携带优先级问卷'
        }
    },
    {
        path: '/survey/maarecruitdata',
        text: '公招tag调查',
        name: 'RecruitDataSurvey',
        display: true,
        module: 'survey',
        icon: "mdi-chart-bar",
        component: () => import('/src/pages/survey/maa-recruit-data.vue'),
        meta: {
            title: '公招tag调查'
        }
        // component: Notice
    },
    {
        path: '/account/home',
        text: '个人中心',
        name: 'User Center',
        display: true,
        module: 'about',
        icon: "mdi-pencil",
        component: () => import('/src/pages/account/home.vue'),
        meta: {
            title: '个人中心'
        }
    },
    {
        path: '/about/donate',
        text: '支持我们',
        name: 'Donate',
        display: true,
        module: 'about',
        icon: "mdi-thumb-up",
        component: () => import('/src/pages/about/donate.vue'),
        meta: {
            title: '支持我们'
        }
    },
    {
        path: '/about/links',
        text: '友情链接',
        name: 'FriendlyLink',
        display: true,
        module: 'about',
        icon: "mdi-link-variant",
        component: () => import('/src/pages/about/links.vue'),
        meta: {
            title: '友情链接'
        }
    },
    {
        path: '/docs',
        text: '文档',
        name: 'Docs',
        display: true,
        module: 'dev',
        icon: "mdi-code-braces",
        component: () => import('/src/pages/about/donate.vue'),
        meta: {
            title: '文档'
        }
    },
    {
        path: '/statistics-material',
        text: '材料统计',
        name: '材料统计',
        display: false,
        component: () => import('/src/pages/material/material-statistics.vue')
    },
    {
        path: '/material/detail',
        text: '关卡详情',
        display: false,
        component: () => import('/src/pages/material/detail.vue')
    },
    {
        path: '/dev',
        text: '测试页面',
        display: false,
        component: () => import('/src/pages/dev/dev.vue')
    },
    {
        path: '/pie-chart',
        text: '测试页面',
        display: false,
        component: () => import('/src/pages/dev/pie-chart.vue')
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
        path: '/material/skland',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/video-material/stageV3.vue')
    },
    {
        path: '/video/ytl/main1',
        text: '视频-一图流-主页1',
        display: false,
        component: () => import('/src/pages/video/ytl1.vue')
    },
    {
        path: '/video/sysl/main1',
        text: '视频-收益速览-掉率',
        display: false,
        component: () => import('/src/pages/video/sysl1.vue')
    },
    {
        path: '/video/sysl/main2',
        text: '视频-收益速览-商店性价比',
        display: false,
        component: () => import('/src/pages/video/sysl2.vue')
    },
    {
        path: '/video/sysl/main3',
        text: '视频-收益速览-礼包性价比',
        display: false,
        component: () => import('/src/pages/video/sysl3.vue')
    },
    {
        path: '/video/logicalbyte',
        text: 'LogicalByte',
        name: 'LogicalByte',
        display: false,
        component: () => import('/src/pages/video/LogicalByte.vue'),
        meta: {
            title: 'LogicalByte'
        }
    },
    {
        path: '/video/elite',
        text: '动态-专精精二性价比',
        display: false,
        component: () => import('/src/pages/video-material/elite/elite.vue')
    },
    {
        path: '/video/skland',
        text: '森空岛作图',
        display: false,
        component: () => import('/src/pages/video-material/skland.vue')
    },
    {
        path: '/action-table',
        text: '材料统计',
        display: false,
        component: () => import('/src/pages/dev/action-table.vue')
    },
    {
        path: '/operator-add-time',
        text: '材料统计',
        display: false,
        component: () => import('/src/pages/dev/operator-add-time.vue')
    },
    {
        path: '/zwg',
        text: '子午谷收银台',
        display: false,
        component: () => import('/src/pages/tools/ziwugoods.vue')
    },
    {
        path: '/live',
        text: '直播数据转换',
        display: false,
        component: () => import('/src/pages/sandbox/livedata.vue')
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

    if (!route.module || !route.display) {
        continue
    }

    LinkedTable[route.module].child.push(route)

}

export {
    routes, LinkedTable, routeMap
}
