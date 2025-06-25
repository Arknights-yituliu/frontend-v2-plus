import {ref} from "vue";
import {DOMAIN} from '/src/api/BASE_URL.js'
import {createMessage} from "/src/utils/message.js";
import axios from "axios";

let userInfo = ref({uid: 0, userName: "未登录",email:'',avatar:'', akUid: "0", status: -100, token: void 0}); //用户信息(用户名，用户id，用户状态)


async function getUserInfo(page,errorMessage=false) {

    const USER_TOKEN = encodeURIComponent(getUserTokenV2())
    let info = {uid: 0, userName: "未登录", akUid: "0",avatar:'', status: -100, token: void 0}

    await axios.get(`${DOMAIN}user/info?token=${USER_TOKEN}&page=${page}`).then(response=>{
        if (response.data.code === 200) {
            info = response.data.data
            userInfo.value = response.data.data
            localStorage.setItem("UID",info.uid);
        } else {
            if(errorMessage){
                createMessage({type:'error',text:'未登录'})
            }
        }
    }).catch((error) => {
        createMessage({type:'error',text:error})
    })



    return info
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

export {getUserInfo, userInfo,getUid,getUserTokenV2}