import {createRouter, createWebHistory} from "vue-router";
import {routes} from "./routes.js";
import toolApi from "../api/tool.js";
import {getUserInfo} from "/src/utils/user/userInfo.js";
import {checkAndRefreshUcToken, ensureUcToken} from "/src/utils/user/ucToken.js";

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
})


router.beforeEach(async (to, from,next) => {

    if (to.path.indexOf("docs") > -1) {
        // 获取当前页面的 hash，并去除开头的 '#'（后面拼接时再添加）
        let currentHash = window.location.hash.replace(/^#/, '');
        currentHash = decodeURIComponent(currentHash);
        // 构建新的 URL，带 path 和 hash

        const targetUrl = `/docs.html?path=${to.path}${currentHash ? `#${currentHash}` : ''}`;

        // 使用 window.location 跳转，而不是 open，避免浏览器拦截
        // window.location.href = targetUrl;

        // 或者使用 assign：
        window.open(targetUrl);

        return; // 终止后续流程
    }

    next(); // 如果不满足上面条件，继续导航
})


// 每次进入页面（含首次加载）触发一次 UC 令牌处理：本地无令牌则兑换，临近过期则提前刷新
router.afterEach(() => {
    // 未登录时没有自签 token，兑换必然失败，直接跳过避免无意义告警
    if (!localStorage.getItem("USER_TOKEN")) {
        return;
    }
    ensureUcToken().then(() => checkAndRefreshUcToken());
})


// // 可选地，在导航完成时重置加载状态
// router.afterEach((to) => {
//     updateVisits(to.path)
// })


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