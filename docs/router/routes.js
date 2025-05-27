import ProjectOverview from "/docs/pages/project-overview.vue";
import ItemValueAlgorithm from "/docs/pages/item-value-algorithm.vue";
import JoinDevelopmentQuickly from "/docs/pages/join-development-quickly.vue";
import JoinDevelopment from "/docs/pages/join-development.vue";
import WritingDocumentation from "/docs/pages/writing-docs.vue";

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
        module: 'DevelopmentDocumentation',
        icon: 'mdi-application-outline',
        component: ProjectOverview
    },
    {
        path: '/docs/join-development-quickly',
        text: '纯网页参与开发',
        name: 'JoinDevelopmentQuickly',
        display: true,
        module: 'DevelopmentDocumentation',
        icon: 'mdi-code-braces',
        component: JoinDevelopmentQuickly
    },
    {
        path: '/docs/join-development',
        text: '参与开发',
        name: 'JoinDevelopment',
        display: true,
        module: 'DevelopmentDocumentation',
        icon: 'mdi-code-braces',
        component: JoinDevelopment
    },
    {
        path: '/docs/item-value-algorithm',
        text: '材料价值算法',
        name: 'ItemValueAlgorithm',
        display: true,
        module: 'DevelopmentDocumentation',
        icon: 'mdi-function',
        component: ItemValueAlgorithm
    },
    {
        path: '/docs/writing-docs',
        text: '编写文档',
        name: 'WritingDocumentation',
        display: true,
        module: 'DevelopmentDocumentation',
        icon: 'mdi-code-braces',
        component: WritingDocumentation
    }




    // {
    //     path: '/:catchAll(.*)',
    //     display: false,
    //     component: Error404
    // }
]


const LinkedTable = {
    DevelopmentDocumentation: {
        path: '/',
        text: "开发文档",
        display: true,
        icon: 'mdi-application-cog',
        child: []
    },
}



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
