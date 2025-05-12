import {ref} from "vue";
import {stringToNumber} from '/src/utils/stringUtils.js'

const defaultConfig = {
    id: 202412050002,
    expCoefficient: 0.633,
    lmdCoefficient: 1,
    useActivityStage: false,
    useActivityAverageStage:false,
    stageBlacklist: [],
    source: 'penguin',
    customItem: [
        {
            itemId: '30073',
            itemValue: 1.8
        },
        {
            itemId: '30083',
            itemValue: 2.16
        }
    ]
}


const actStoreUnlimitedExchangeItem = {
    "30073":1.8,
    "30083":2.16
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
        if (!config.source) {
            config.source = 'penguin'
        }

        let customItemMap = new Map()

        for(const item of config.customItem){
            item.itemValue = stringToNumber( item.itemValue)
            customItemMap.set(item.itemId, item)
        }

        for(const itemId in actStoreUnlimitedExchangeItem){
            if(!customItemMap.has(itemId)){
                customItemMap.set(itemId,{
                    itemId:itemId,
                    itemValue:actStoreUnlimitedExchangeItem[itemId],
                })
            }
        }

        let list = []
        for(const [key,value] of customItemMap){
            list.push(value)
        }



        config.customItem = list
        stageConfig.value = config
        return config;
    } else {
        return defaultConfig
    }
}

export {
    getStageConfig, stageConfig
}