import {ref} from "vue";
import {clearUcToken, ensureUcToken} from "/src/utils/user/ucToken.js";
import {getOauthUserInfo} from "/src/api/user-center/userInfo.js";

// 未登录 / 获取失败时的默认用户信息（昵称、用户 id、用户状态）
const DEFAULT_USER_INFO = {uid: 0, nickname: "未登录", avatar: '', status: -100, token: void 0};

let userInfo = ref({...DEFAULT_USER_INFO});

/**
 * 从 UC（auth 域名）拉取当前登录用户信息并写入全局状态
 * 本地无自签 token 时直接视为未登录；昵称优先取 nickname，缺省时回落到 userName
 * @returns {Promise<Object>} 用户信息，未登录或获取失败时为默认值
 */
async function getUserInfo() {

    const USER_TOKEN = localStorage.getItem("USER_TOKEN");
    if (!USER_TOKEN) {
        userInfo.value = {...DEFAULT_USER_INFO};
        return userInfo.value;
    }

    try {
        // 先确保存在可用的 UC access_token：本地没有时由 BackEndV3 兑换，避免直接请求触发无谓的刷新失败
        const ucAccessToken = await ensureUcToken();
        if (!ucAccessToken) {
            userInfo.value = {...DEFAULT_USER_INFO};
            return userInfo.value;
        }
        const data = await getOauthUserInfo();
        const info = {
            uid: data?.uid ?? 0,
            nickname: data?.nickname || data?.userName || '',
            avatar: data?.avatar || '',
            status: 1,
            token: USER_TOKEN,
        };
        userInfo.value = info;
        localStorage.setItem("UID", info.uid);
        return info;
    } catch (error) {
        // 令牌失效等错误提示已由 ucClient 拦截器统一弹出，这里仅回到未登录状态
        userInfo.value = {...DEFAULT_USER_INFO};
        return userInfo.value;
    }
}

/**
 * 清理本地登录态：自签 token（会话凭据）与 UC access_token 一并清除
 */
function clearUserSession() {
    localStorage.removeItem("USER_TOKEN");
    localStorage.removeItem("UID");
    clearUcToken();
}


function getUid(){
    let uid = localStorage.getItem("UID");

    const isNumeric = /^-?\d+$/.test(uid); // 检查是否为整数
    if(uid !== null && isNumeric && !isNaN(Number(uid))) {
        // console.log("uid：",uid)
        return uid;
    }else {
        const time = new Date().getTime();
        uid = `${time}001`
        localStorage.setItem("UID",uid);
        return  uid
    }
}


function getUserTokenV2() {
    const item = localStorage.getItem('USER_TOKEN');
    return `Authorization${item}`
}

export {getUserInfo, userInfo,getUid,getUserTokenV2,clearUserSession}
