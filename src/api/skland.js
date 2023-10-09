import hmacSHA256 from 'crypto-js/hmac-sha256'
import md5 from 'crypto-js/md5'
import request from "@/api/requestBase";
import {cMessage} from "@/element/message";

const host = "https://zonai.skland.com";
// const playerInfoAPI = '/api/v1/game/player/info'
// const playerBindingAPI = '/api/v1/game/player/binding'

function getSign(path, requestParam, secret) {
    const timestamp = Math.floor(new Date().getTime() / 1000 - 1).toString();

    const headers = {
        platform: '3',
        timestamp:timestamp,
        dId:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        vName:'1.2.0'
    }
    requestParam =  requestParam?requestParam:''
    let message = path + requestParam + timestamp + JSON.stringify(headers);
    // console.log('message',message);
    const sign = md5(hmacSHA256(message, secret).toString()).toString()
    // console.log('sign',sign)
    return {timestamp,sign}
}


async function getPlayBinding(path, requestParam, secret,cred){

    cred = cred.replace(/\s+/g, '')
    cred = cred.replace(/["']/g, '')

    secret = secret.replace(/\s+/g, '')
    secret = secret.replace(/["']/g, '')

    const {timestamp,sign} = getSign(path, requestParam, secret);

    let uid = void 0
    let nickName = ""

    const url = `${host}${path}`
    // console.log(url)
    const headers = {
        "platform":'3',
        "timestamp":timestamp,
        "dId":'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        "vName":'1.2.0',
        "cred": cred,
        "sign":sign
    }
    // console.table(headers)

    let  bindingData =  {
            bindingList: [],
            uid: uid,
            nickName: nickName
    }

    await request({
        url: url,
        headers: headers,
        method: "get",
    }).then(response => {
        response = response.data
        // console.log(response)
        if (response.code !== 0) {
            cMessage("森空岛CRED错误或失效")
        } else {
            const list = response.data.list

            const bindingList = list[0].bindingList;

            for (const binding of bindingList) {
                if (binding.isOfficial) {
                    uid = binding.uid;
                    nickName = binding.nickName;
                }
            }

            if (uid == void 0) {
                uid = list[0].bindingList[0].uid;
                nickName = list[0].bindingList[0].nickName;
            }

            if (uid == void 0) {
                cMessage("未能成功获取数据")
            }

            bindingData.bindingList = bindingList;
            bindingData.nickName = nickName;
            bindingData.uid = uid;

        }
    })
    return bindingData;
}

async function getPlayerInfo(path, requestParam, secret, cred, uid, nickName){

    const {timestamp,sign} = getSign(path, requestParam, secret);
    const url = `${host}${path}?${requestParam}`
    // console.log(url)
    const headers = {
        "platform":'3',
        "timestamp":timestamp,
        "dId":'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        "vName":'1.2.0',
        "cred": cred,
        "sign":sign
    }
    // console.table(headers)

    let uploadData = {}

    await request({
        url: url,
        headers: headers,
        method: "get",
    }).then(response => {
        response = response.data
        if (response.code !== 0) {
            cMessage("读取森空岛数据失败")
        } else {
            const data = response.data
            const chars = data.chars;
            const charInfoMap = data.charInfoMap;

            uploadData = {
                nickName:nickName,
                uid: uid,
                chars: chars,
                charInfoMap: charInfoMap
            }
        }
    })

    return uploadData

}

export default {
    getPlayBinding,
    getPlayerInfo
}