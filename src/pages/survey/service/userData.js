import axios from "axios";
import {ref} from "vue";
import {DOMAIN} from '/src/api/BASE_URL.js'
import request from '/src/api/requestBase.js'

let userData = ref(); //用户信息(用户名，用户id，用户状态)


async function getUserInfo() {
    let USER_TOKEN = localStorage.getItem("USER_TOKEN")

   let userInfo = {uid:0,userName: "未登录",akUid:"0", status: -100, token: void 0}
    USER_TOKEN = encodeURIComponent(USER_TOKEN);
    await  request({
        url:`${DOMAIN}survey/user/info?token=${USER_TOKEN}`,
        method:'get'
    })  .then(response => {
        if(response.data.code===200){
            userInfo =  response.data.data
            userData.value = response.data.data
        }else {
            // cMessage('未登录','error')
        }
    })
        .catch((error) => {

        })

   return userInfo
}

export {getUserInfo,userData}