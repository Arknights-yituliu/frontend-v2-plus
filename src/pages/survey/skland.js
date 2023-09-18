import request from "@/api/requestBase";
import {cMessage} from "@/element/message";

async function importSklandData(cred) {
    cred = cred.replace(/\s+/g, '')
    cred = cred.replace(/["']/g, '')


    let playerInfoAPI = 'https://zonai.skland.com/api/v1/game/player/info?uid='
    let playerBind = await getPlayerBind(cred);
    console.log(playerBind)
    const uid = playerBind.uid
    const nickName = playerBind.nickName

    playerInfoAPI = playerInfoAPI + uid;

    let uploadData = {}

    await request({
        url: playerInfoAPI,
        headers: {
            "cred": cred,
        },
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

function uploadOperatorData(data) {
    request({
        url: 'survey/operator/import/skland/v2',
        method: "post",
        data: data
    }).then(response => {
        response = response.data
        console.log(response)
    })
}


async function getPlayerBind(cred) {
    cred = cred.replace(/\s+/g, '')
    cred = cred.replace(/["']/g, '')

    const playerBindingAPI = 'https://zonai.skland.com/api/v1/game/player/binding?'
    let uid = ''
    let nickName = ''
    await request({
        url: playerBindingAPI,
        headers: {
            "cred": cred,
        },
        method: "get",
    }).then(response => {
        response = response.data
        if (response.code !== 0) {
            cMessage("森空岛CRED错误或失效")
        } else {
            const list = response.data.list

            const bindingList = list[0].bindingList;
            for (const binding of bindingList) {
                if (binding.isDefault) {
                    uid = binding.uid;
                    nickName = binding.nickName;
                }
            }

            if (uid == "") {
                uid = list[0].bindingList[0].uid;
                nickName = list[0].bindingList[0].nickName;
            }

            if (uid == "") {
                cMessage("未能成功获取数据")
            }
        }


    })

    return {
        nickName:nickName,
        uid: uid
    }
}

export {importSklandData, getPlayerBind}