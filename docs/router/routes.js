import ProjectOverview from "/docs/pages/project-overview.vue";
import Algorithm from "/docs/pages/algorithm.vue";
import ItemValueAlgorithm from "/docs/pages/item-value-algorithm.vue";
import StoreEfficiencyAlgorithm from "/docs/pages/store-efficiency-algorithm.vue";
import PackEfficiencyAlgorithm from "/docs/pages/pack-efficiency-algorithm.vue";
import EliteSpecializationRankingAlgorithm from "/docs/pages/elite-specialization-ranking-algorithm.vue";
import JoinDevelopmentQuickly from "/docs/pages/join-development-quickly.vue";
import JoinDevelopment from "/docs/pages/join-development.vue";
import WritingDocumentation from "/docs/pages/writing-documentation.vue";
import WritingPage from "/docs/pages/writing-page.vue";
// {
//     path: '/',  访问路径
//     text: '关卡推荐',  导航展示的文本
//     name: 'StageRecommendation',  路由名称
//     display: true,   是否展示在导航栏
//     module: 'TechnicalDocumentation',  在导航栏中所属的模块
//     icon: "item", 导航栏上的图标
//     component: StageRecommendation  //引入对应的页面①
//     component: () => import('/src/pages/material/store.vue') //引入对应的页面② 这种引入在不访问对应路径时，不会加载js
// },

const routes = [
    {
        path: '/docs',
        text: '项目简介',
        name: 'ProjectOverview',
        display: true,
        module: 'TechnicalDocumentation',
        icon: 'mdi-application-outline',
        component: ProjectOverview
    },
    {
        path: '/docs/join-development-quickly',
        text: '纯网页参与开发',
        name: 'JoinDevelopmentQuickly',
        display: true,
        module: 'TechnicalDocumentation',
        icon: 'mdi-code-braces',
        component: JoinDevelopmentQuickly
    },
    {
        path: '/docs/join-development',
        text: '参与开发',
        name: 'JoinDevelopment',
        display: true,
        module: 'TechnicalDocumentation',
        icon: 'mdi-code-braces',
        component: JoinDevelopment
    },
    {
        path: '/docs/algorithm',
        text: '算法总览',
        name: 'Algorithm',
        display: true,
        module: 'AlgorithmDocumentation',
        icon: 'mdi-book-open-page-variant',
        component: Algorithm
    },
    {
        path: '/docs/item-value-algorithm',
        text: '物品价值算法',
        name: 'ItemValueAlgorithm',
        display: true,
        module: 'AlgorithmDocumentation',
        icon: 'mdi-function',
        component: ItemValueAlgorithm
    },
    {
        path: '/docs/store-efficiency-algorithm',
        text: '商店性价比算法',
        name: 'StoreEfficiencyAlgorithm',
        display: true,
        module: 'AlgorithmDocumentation',
        icon: 'mdi-store',
        component: StoreEfficiencyAlgorithm
    },
    {
        path: '/docs/pack-efficiency-algorithm',
        text: '礼包性价比算法',
        name: 'PackEfficiencyAlgorithm',
        display: true,
        module: 'AlgorithmDocumentation',
        icon: 'mdi-gift-outline',
        component: PackEfficiencyAlgorithm
    },
    {
        path: '/docs/elite-specialization-ranking-algorithm',
        text: '精英化/专精排名算法',
        name: 'EliteSpecializationRankingAlgorithm',
        display: true,
        module: 'AlgorithmDocumentation',
        icon: 'mdi-podium',
        component: EliteSpecializationRankingAlgorithm
    },
    {
        path: '/docs/writing-documentation',
        text: '编写文档站页面',
        name: 'WritingDocumentation',
        display: true,
        module: 'TechnicalDocumentation',
        icon: 'mdi-file-document',
        component: WritingDocumentation
    },
    {
        path: '/docs/writing-page',
        text: '编写主站点页面',
        name: 'WritingPage',
        display: true,
        module: 'TechnicalDocumentation',
        icon: 'mdi-file-sign',
        component: WritingPage
    }




    // {
    //     path: '/:catchAll(.*)',
    //     display: false,
    //     component: Error404
    // }
]


const LinkedTable = {
    TechnicalDocumentation: {
        path: '/docs',
        text: "技术文档",
        display: true,
        icon: 'mdi-application-cog',
        child: []
    },
    AlgorithmDocumentation: {
        path: '/docs/algorithm',
        text: "算法文档",
        display: true,
        icon: 'mdi-chart-line',
        child: []
    },
}


let routeMap = new Map()


for (const route of routes) {

    routeMap.set(route.name, route.text)

    if (!route.module || !route.display || !LinkedTable[route.module]) {
        continue
    }

    LinkedTable[route.module].child.push(route)

}

export {
    routes, LinkedTable, routeMap
}
