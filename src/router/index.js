import {onBeforeRouteUpdate, useRouter, createRouter, createWebHistory} from "vue-router";
import {routes} from "./routes.js";

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
})


// 在路由即将改变时触发
onBeforeRouteUpdate((to, from, next) => {
    console.log('开始转跳')
    next(() => {
        console.log('转跳后')
    })
})


// 可选地，在导航完成时重置加载状态
router.afterEach(() => {
    const element = document.getElementById('loading')
    console.log(element)
    setTimeout(() => element.style.display = 'none', 1000)
})

router.beforeEach(async (to, from) => {
    const element = document.getElementById('loading')
    element.display = 'flex'

})

export default router