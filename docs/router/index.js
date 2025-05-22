import {createRouter, createWebHistory} from "vue-router";
import {routes} from "./routes.js";
import toolApi from "/src/api/tool.js";

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
})


router.beforeEach(async (to, from) => {
    updateVisits(to.path)
})


// 可选地，在导航完成时重置加载状态
router.afterEach((to,from) => {

})


function updateVisits(pathName) {

    //访问"/"直接更新
    if (pathName === "/") {
        console.log("当前路径 {}",pathName);
        toolApi.updateVisits(pathName).then(r => {
        });
        return;
    }

    pathName = removeTrailingSlash(pathName, 2);
    console.log("当前路径 {}", pathName);
    toolApi.updateVisits(pathName).then(r => {
    });

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