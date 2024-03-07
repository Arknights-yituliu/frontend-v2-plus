import {createRouter, createWebHistory} from "vue-router";
import {routes} from "./routes.js";

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
})





router.beforeEach(async (to, from) => {


})

export default router