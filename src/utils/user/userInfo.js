import {ref} from "vue";
import {DOMAIN} from '/src/api/BASE_URL.js'

import {cMessage} from "/src/utils/message.js";
import axios from "axios";
import {getUserTokenV2} from "@/utils/getUserToken.js";

let userInfo = ref({uid: 0, userName: "未登录",avatar:'', akUid: "0", status: -100, token: void 0}); //用户信息(用户名，用户id，用户状态)


async function getUserInfo(page,errorMessage=false) {

    const USER_TOKEN = encodeURIComponent(getUserTokenV2())
    let info = {uid: 0, userName: "未登录", akUid: "0",avatar:'', status: -100, token: void 0}

    await axios.get(`${DOMAIN}user/info?token=${USER_TOKEN}&page=${page}`).then(response=>{
        if (response.data.code === 200) {
            info = response.data.data
            userInfo.value = response.data.data
        } else {
            if(errorMessage){
                cMessage('未登录','error')
            }
        }
    }).catch((error) => {
          cMessage(error.message)
    })



    return info
}


function getTmpUid(){
    let uid = localStorage.getItem("TMP_UID");
    const isNumeric = /^-?\d+$/.test(uid); // 检查是否为整数
    if(uid !== null && isNumeric && !isNaN(Number(uid))) {
        return uid;
    }else {
        const time = new Date().getTime();
        uid = `${time}001`
        localStorage.setItem("TMP_UID",uid);
        return  uid
    }
}

export {getUserInfo, userInfo,getTmpUid}