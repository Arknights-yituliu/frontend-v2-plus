import {onBeforeRouteUpdate, useRouter, createRouter, createWebHistory} from "vue-router";
import {routes} from "./routes.js";
import toolApi from "../api/tool.js";

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
})


router.beforeEach((to, from) => {
    // const element = document.getElementById('loading')
    // element.style.display = 'flex'
})


// 可选地，在导航完成时重置加载状态
router.afterEach((to) => {
    // const element = document.getElementById('loading')
    // element.style.display = 'none'
    updateVisits(to.path)

    // setTimeout(() => element.style.display = 'none', 100)
})


function updateVisits(pathName) {

    //访问"/"直接更新
    if (pathName === "/") {
        console.log("访问的是首页");
        toolApi.updateVisits(pathName);
        return ;
    }

    pathName = removeTrailingSlash(pathName, 2);
    console.log("访问的页面是：", pathName);
    toolApi.updateVisits(pathName);

    return 1;
}

//剔除末尾“/”
function removeTrailingSlash(path, substrCount) {
    // substrCount 剔除次数
    let devPath = path.replace("/src/pages", "");
    for (let i = 0; i < substrCount; i++) {
        devPath = substrPath(devPath);
    }
    return devPath;
}

function substrPath(pathName) {
    let strLength = pathName.length;
    const lastStr = pathName.substr(strLength - 1, strLength);
    if (lastStr === "/") {
        pathName = pathName.substr(0, strLength - 1);
        console.log("路径以“/”结尾，被截取后路径：", pathName);
        return pathName;
    }
    return pathName
}

export default router