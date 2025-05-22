import ProjectOverview from "/docs/pages/ark/project-overview.vue";
import ItemValueAlgorithm from "/docs/pages/ark/item-value-algorithm.vue";
import JoinDevelopmentQuickly from "/docs/pages/ark/join-development-quickly.vue";
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
        path: '/docs',
        text: '项目简介',
        name: 'ProjectOverview',
        display: true,
        module: 'ark',
        icon: 'mdi-application-outline',
        component: ProjectOverview
    },
    {
        path: '/docs/join-development-quickly',
        text: '快速参与开发',
        name: 'JoinDevelopmentQuickly',
        display: true,
        module: 'ark',
        icon: 'mdi-code-braces',
        component: JoinDevelopmentQuickly
    },
    {
        path: '/docs/item-value-algorithm',
        text: '材料价值算法',
        name: 'ItemValueAlgorithm',
        display: true,
        module: 'ark',
        icon: 'mdi-function',
        component: ItemValueAlgorithm
    },




    // {
    //     path: '/:catchAll(.*)',
    //     display: false,
    //     component: Error404
    // }
]


const LinkedTable = {
    ark: {
        path: '/',
        text: "开发文档",
        display: true,
        icon: 'mdi-application-cog',
        child: []
    },
}

const devRoute = ['/survey/questionnaire']

let routeMap = new Map()


for (const route of routes) {

    routeMap.set(route.name, route.text)

    if (!route.module||!route.display) {
        continue
    }

    LinkedTable[route.module].child.push(route)

}

export {
    routes, LinkedTable, routeMap
}
