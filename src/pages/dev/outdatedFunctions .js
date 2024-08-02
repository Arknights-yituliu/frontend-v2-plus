import {ref} from "vue";
import surveyOperatorApi from "/src/api/operatorData.js";

let player_uid = ref('')  //玩家uid
/**
 * 通过玩家uid找回数据
 */
function retrievalByUid() {
    const data = {
        token: userInfo.value.token,
        uid: player_uid.value
    }
    surveyOperatorApi.retrievalOperatorDataByUid(data).then(response => {

        setTimeout(() => {
            location.reload()
        }, 1000);

    })
}