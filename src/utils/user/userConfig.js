import {ref} from "vue";
import {stringToNumber} from '/src/utils/stringUtils.js'
import {getUid} from "@/utils/user/userInfo.js";

const defaultConfig = {
    id: getUid(),
    expCoefficient: 0.633,
    lmdCoefficient: 1,
    useActivityStage: false,
    useActivityAverageStage:false,
    stageBlacklist: [],
    source: 'penguin',
    workShopProductKnockRating:0.2,
    customItem: [
        {
            itemId: '30073',
            itemName: "扭转醇",
            itemValue: 1.8
        },
        {
            itemId: '30083',
            itemName: "轻锰矿",
            itemValue: 2.16
        }
    ]
}




let stageConfig = ref(defaultConfig)

/**
 * 获取关卡配置
 * @returns {any|{customItem: [{itemId: string, itemValue: number}], expCoefficient: number, lmdCoefficient: number, useActivityStage: boolean, id: number, stageBlacklist: *[], source: string}}
 */
function getStageConfig() {
    const cacheStageConfig = localStorage.getItem("StageConfig");
    if (cacheStageConfig) {
        let config = JSON.parse(cacheStageConfig);
        if(!config.customItem){
            config.customItem = []
        }

        stageConfig.value = config

        return config;
    } else {
        return defaultConfig
    }
}


// let customItemMap = new Map()
//
// for(const item of config.customItem){
//     item.itemValue = stringToNumber( item.itemValue)
//     customItemMap.set(item.itemId, item)
// }
//
// for(const itemId in actStoreUnlimitedExchangeItem){
//     if(!customItemMap.has(itemId)){
//         customItemMap.set(itemId,{
//             itemId:itemId,
//             itemValue:actStoreUnlimitedExchangeItem[itemId],
//         })
//     }
// }
//
// let list = []
// for(const [key,value] of customItemMap){
//     list.push(value)
// }
// config.customItem = list

export {
    getStageConfig, stageConfig,defaultConfig
}