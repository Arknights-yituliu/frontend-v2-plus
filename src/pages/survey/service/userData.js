import axios from "axios";
import {ref} from "vue";
import {http} from '/src/api/baseURL.js'
import {cMessage} from "../../../custom/message.js";

let userData = ref(); //用户信息(用户名，用户id，用户状态)


async function getUserInfo() {
    const USER_TOKEN = localStorage.getItem("USER_TOKEN")

   let userInfo = {uid:0,userName: "未登录",akUid:"0", status: -100, token: void 0}
   await axios.get(`${http}user/info?token=${USER_TOKEN}`)
        .then(response => {
            if(response.data.code===200){
                userInfo =  response.data.data
                userData.value = response.data.data
            }else {
                cMessage('未登录','error')
            }
        })
        .catch((error) => {
            console.log(error)
        })

   return userInfo
}

export {getUserInfo,userData}