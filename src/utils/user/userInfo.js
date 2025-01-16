import {ref} from "vue";
import {DOMAIN} from '/src/api/BASE_URL.js'
import request from '/src/api/requestBase.js'
import {cMessage} from "/src/utils/message.js";

let userInfo = ref({uid: 0, userName: "未登录",avatar:'', akUid: "0", status: -100, token: void 0}); //用户信息(用户名，用户id，用户状态)


async function getUserInfo(page,errorMessage=false) {

    const USER_TOKEN = encodeURIComponent(localStorage.getItem("USER_TOKEN"))
    let info = {uid: 0, userName: "未登录", akUid: "0",avatar:'', status: -100, token: void 0}

    await request({
        url: `${DOMAIN}user/info?token=${USER_TOKEN}&page=${page}`,
        method: 'get'
    }).then(response => {
        if (response.data.code === 200) {
            info = response.data.data
            userInfo.value = response.data.data
        } else {
            if(errorMessage){
                cMessage('未登录','error')
            }
        }
    }).catch((error) => {

    })

    return info
}

export {getUserInfo, userInfo}