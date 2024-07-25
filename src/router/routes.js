import Error404 from "/src/pages/layout/error404.vue";
import STAGE_RECOMMENDATION_REGISTER from '/src/pages/material/stageV3.vue'
import GACHA_CALCULATOR from '/src/pages/tools/gachaCalc.vue'
import Notice from '/src/pages/layout/notice.vue'
import REGISTER from '/src/pages/survey/account/register.vue'
import LOGIN from '/src/pages/survey/account/login.vue'
import RETRIEVE from '/src/pages/survey/account/retrieve.vue'
import IMPORT_BY_SKLAND from '/src/pages/survey/account/importdata.vue'
import SURVEY_OPERATOR from '/src/pages/survey/operators.vue'
import USER_HOME from '/src/pages/survey/account/home.vue'

// {
//     path: '/',  访问路径
//     text: '关卡推荐',  导航展示的文本
//     name: 'StageRecommendation',  路由名称
//     display: true,   是否展示在导航栏
//     module: 'material',  在导航栏中所属的模块
//     icon: "item", 导航栏上的图标
//     component: StageRecommendation  //引入对应的页面①
//     component: () => import('/src/pages/material/store.page.vue') //引入对应的页面② 这种引入在不访问对应路径时，不会加载js
// },

const routes = [
    {
        path: '/',
        text: '关卡推荐',
        name: 'StageRecommendation',
        display: true,
        module: 'material',
        icon: "item",
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
        component: () => import('/src/pages/material/pack.vue')
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
        component: () => import('/src/pages/material/elite.vue')
    },
    {
        path: '/tools/gachaCal',
        text: '攒抽计算器',
        name: 'GachaCalculator1',
        display: false,
        component: GACHA_CALCULATOR
    },
    {
        path: '/tools/gachaCalc',
        text: '攒抽计算器',
        name: 'GachaCalculator',
        display: true,
        module: 'tools',
        icon: "calculator",
        component: GACHA_CALCULATOR
    },
    {
        path: '/tools/schedule',
        text: '排班表生成器',
        name: 'Schedule',
        display: true,
        module: 'tools',
        icon: "schedule",
        component: () => import('/src/pages/tools/schedule.vue')
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
        path: '/tools/specializationTimeCalculate',
        text: '专精时间减半计算器',
        name: 'HalfOperatorCalculate',
        display: true,
        module: 'tools',
        icon: "calculator",
        component: () => import('/src/pages/tools/specializationTimeCalculate.vue')
    },
    {
        path: '/survey/account/home',
        text: '用户中心',
        name: 'AccountHome',
        display: true,
        module: 'survey',
        icon: "user",
        component: USER_HOME
        // component: Notice
    },
    {
        path: '/survey/account/register',
        text: '注册账号',
        name: 'REGISTER',
        display: true,
        component: REGISTER
    },
    {
        path: '/survey/account/login',
        text: '登录账号',
        name: 'LOGIN',
        display: false,
        component: LOGIN
    },
    {
        path: '/survey/account/retrieve',
        text: '找回账号',
        name: 'RETRIEVE',
        display: false,
        component: RETRIEVE
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
        icon: "survey2",
        component: SURVEY_OPERATOR
    },
    {
        path: '/survey/questionnaire',
        text: '干员携带率问卷',
        name: 'Questionnaire',
        display: false,
        module: 'survey',
        icon: "survey2",
        component: () => import('/src/pages/survey/questionnaire.vue')
    },
    {
        path: '/survey/rank',
        text: '干员练度调查结果',
        name: 'OperatorRank',
        display: true,
        module: 'survey',
        icon: "rank",
        component: () => import('/src/pages/survey/rank2.vue')
        // component: Notice
    },
    {
        path: '/survey/rank2',
        text: '干员练度调查结果',
        name: 'OperatorRank2',
        display: false,
        module: 'survey',
        icon: "rank",
        component: () => import('/src/pages/survey/rank2.vue')
        // component: Notice
    },
    {
        path: '/survey/maarecruitdata',
        text: '公招tag调查',
        name: 'RecruitDataSurvey',
        display: true,
        module: 'survey',
        icon: "survey2",
        component: () => import('/src/pages/survey/maarecruitdata.page.vue')
        // component: Notice
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
        path: '/material/detail',
        text: '关卡详情',
        display: false,
        component: () => import('/src/pages/video-material/detail.page.vue')
    },
    {
        path:'/components',
        component: ()=>import('/src/pages/dev/components.vue')
    },
    {
        path: '/dev',
        text: '测试页面',
        display: false,
        component: () => import('/src/pages/dev.vue')
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
        path: '/test/sandbox',
        text: '收益速览做图用',
        display: false,
        component: () => import('/src/pages/sandbox/sb.page.vue')
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
        display:true,
        child: []
    },
    tools: {
        path: '/',
        text: "一图流工具箱",
        display:true,
        child: []
    },
    survey: {
        path: '/',
        text: "调查与统计",
        display:true,
        child: []
    },
    about: {
        path: '/',
        text: "其他信息",
        display:true,
        child: []
    },
    backend: {
        path: '/',
        text: "后台导航",
        display:false,
        child: []
    }
}

const devRoute = ['/survey/questionnaire']

for (const route of routes) {

    if (!route.module) {
        LinkedTable.backend.child.push(route)
        continue
    }

    if (!route.display) {
        LinkedTable.backend.child.push(route)
        continue
    }



    LinkedTable[route.module].child.push(route)


}

export {
    routes, LinkedTable
}