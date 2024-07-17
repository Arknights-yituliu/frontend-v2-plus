import {ref} from "vue";
import {DOMAIN} from '/src/api/BASE_URL.js'
import request from '/src/api/requestBase.js'
import {cMessage} from "../../../utils/message.js";

let userInfo = ref({}); //用户信息(用户名，用户id，用户状态)


async function getUserInfo(errorMessage=false) {

    const USER_TOKEN = localStorage.getItem("USER_TOKEN")
    let info = {}

    await request({
        url: `${DOMAIN}user/info?token=${USER_TOKEN}`,
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