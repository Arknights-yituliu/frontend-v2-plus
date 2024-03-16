import {onBeforeRouteUpdate, useRouter, createRouter, createWebHistory} from "vue-router";
import {routes} from "./routes.js";

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
})


router.beforeEach( (to, from) => {
    const element = document.getElementById('loading')
    element.style.display = 'flex'
})


// 可选地，在导航完成时重置加载状态
router.afterEach(() => {
    const element = document.getElementById('loading')
    setTimeout(() => element.style.display = 'none', 500)
})



export default router