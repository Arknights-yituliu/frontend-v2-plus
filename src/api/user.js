import request from "./requestBase.js";
import {DOMAIN} from "./BASE_URL.js";
import {cMessage} from "/src/utils/Message.js";


export default {
    async getUserInfo(errorPopup=false) {
        let USER_TOKEN = localStorage.getItem("USER_TOKEN")

        let userInfo = {}

        await request({
            url: `${DOMAIN}user/info?token=${USER_TOKEN}`,
            method: 'get'
        }).then(response => {
            if (response.data.code === 200) {
                userInfo = response.data.data
            } else {
                if(errorPopup){
                    cMessage('未登录','error')
                }
            }
        }).catch((error) => {

        })

        return userInfo

    }
}