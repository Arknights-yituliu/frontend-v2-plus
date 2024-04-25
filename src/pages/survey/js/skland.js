import hmacSHA256 from 'crypto-js/hmac-sha256'
import md5 from 'crypto-js/md5'
import request from "/src/api/requestBase";
import {cMessage} from "/src/custom/message";
import surveyOperatorApi from "/src/api/surveyOperator"
import {ref} from "vue";

const domain = "https://zonai.skland.com";
const playerInfoAPI = '/api/v1/game/player/info'
const playerBindingAPI = '/api/v1/game/player/binding'

function getSign(path, requestParam, secret) {
    const timestamp = Math.floor((new Date().getTime() - 500) / 1000).toString();

    const headers = {
        platform: '3',
        timestamp: timestamp,
        dId: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        vName: '1.2.0'
    }
    requestParam = requestParam ? requestParam : ''
    let message = path + requestParam + timestamp + JSON.stringify(headers);
    // console.log('message',message);
    const sign = md5(hmacSHA256(message, secret).toString()).toString()
    // console.log('sign',sign)
    return {timestamp, sign}
}




async function getPlayBinding(defaultAkUid, requestParam, secret, cred) {

    cred = cred.replace(/\s+/g, '')
    cred = cred.replace(/["']/g, '')

    secret = secret.replace(/\s+/g, '')
    secret = secret.replace(/["']/g, '')

    const {timestamp, sign} = getSign(playerBindingAPI, requestParam, secret);

    let uid = '0'
    let nickName = ""

    let channelName = '默认'
    let channelMasterId = -1

    const url = `${domain}${playerBindingAPI}`
    // console.log(url)
    const headers = {
        "platform": '3',
        "timestamp": timestamp,
        "dId": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        "vName": '1.2.0',
        "cred": cred,
        "sign": sign
    }
    // console.table(headers)

    let bindingData = {
        bindingList: [],
        uid: uid,
        nickName: nickName,
        channelName: '官服',
        channelMasterId: 1
    }


    await request({
        url: url,
        headers: headers,
        method: "get",
    }).then(response => {
        console.log(response)
        response = response.data
        // console.log(response)
        if (response.code !== 0) {
            cMessage("森空岛CRED错误或失效")
        } else {
            const list = response.data.list

            let akBindingList = []

            for (const item of list) {
                if (item.appCode === 'arknights') {
                    akBindingList = item.bindingList
                    break
                }
            }

            for (const binding of akBindingList) {
                if(defaultAkUid!=='0'){
                    if(binding.uid===defaultAkUid){
                        uid = binding.uid;
                        nickName = binding.nickName;
                        channelName = binding.channelName
                        channelMasterId = binding.channelMasterId
                        break;
                    }
                }

                if (binding.isOfficial) {
                    uid = binding.uid;
                    nickName = binding.nickName;
                    channelName = binding.channelName
                    channelMasterId = binding.channelMasterId
                    break;
                }
            }

            if (typeof uid === "undefined") {
                const binding = list[0].bindingList[0]
                uid = binding.uid;
                nickName =binding.nickName;
                channelName = binding.channelName
                channelMasterId = binding.channelMasterId
            }

            bindingData.bindingList = akBindingList;
            bindingData.nickName = nickName;
            bindingData.uid = uid;
            bindingData.channelName = channelName
            bindingData.channelMasterId = channelMasterId
        }
    }).catch(error => {
        cMessage('森空岛：' + error.response.data.message, 'error')
        return void 0
    })

    return bindingData;
}


async function getPlayerInfo(params, characterTable) {

    const {requestUrl, requestParam, secret, cred,akUid,akNickName,channelName,channelMasterId} = params

    const {timestamp, sign} = getSign(requestUrl, requestParam, secret);
    const url = `${domain}${requestUrl}?${requestParam}`
    // console.log(url)
    const headers = {
        "platform": '3',
        "timestamp": timestamp,
        "dId": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        "vName": '1.2.0',
        "cred": cred,
        "sign": sign
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
                akNickName: akNickName,
                akUid: akUid,
                channelMasterId:channelMasterId,
                channelName:channelName,
                chars: chars,
                charInfoMap: charInfoMap
            }
        }
    }).catch(error => {
        console.log(error)
        cMessage('森空岛：' + error.response.data.message, 'error')
        return void 0
    })

    return uploadData

}


function FormattingOperatorData(characters, charInfoMap, characterTable) {

    let operatorList = []

    for (const character of characters) {
        const charId = characters.charId
        const level = characters.level
        const elite = characters.evolvePhase
        const potential = Math.ceil(characters.potentialRank + 1)
        const mainSkill = characters.mainSkillLvl
        const rarity = Math.ceil(characters.rarity + 1)


        let operator = {
            own: true,
            charId: charId,
            level: level,
            elite: elite,
            potential: potential,
            mainSkill: mainSkill,
            rarity: rarity,
            skill1: 0,
            skill2: 0,
            skill3: 0,
            modX: 0,
            modY: 0,
            modD: 0
        }


        // const skills = characters.skills
        // for (let s = 0; s < skills.length; s++) {
        //     const specializeLevel = parseInt(skills[s].specializeLevel.toString())
        //     if(s==0)
        // }

        operatorList.push(operator)
    }


}

export default {
    getPlayBinding,
    getPlayerInfo
}