import {ref} from "vue";


const defaultConfig = {
    id: 202412050002,
    expCoefficient: 0.633,
    lmdCoefficient: 1,
    useActivityStage: false,
    stageBlacklist: [],
    source: 'penguin',
    customItem: [
        {
            itemId: '30073',
            itemValue: 1.8
        },
        {
            itemId: '30083',
            itemValue: 1.8
        }
    ]
}

const classicItem = {
    30073:'no-exist',
    30083:'no-exist'
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

        for(const item of config.customItem){

            if(classicItem[item.itemId]){
                classicItem[item.itemId] = 'exist'
            }
        }

        for(const itemId in classicItem){
            const value = classicItem[itemId]
            if(value==='no-exist'){

                config.customItem.push({
                    itemId: itemId,
                    itemValue: 1.8
                })
            }

        }


        stageConfig.value = config
        return config;
    } else {
        return defaultConfig
    }
}

export {
    getStageConfig, stageConfig
}