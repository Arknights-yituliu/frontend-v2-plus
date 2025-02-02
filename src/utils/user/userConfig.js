import {ref} from "vue";



const defaultConfig = {
    id: 202412050004,
    expCoefficient: 0.633,
    lmdCoefficient: 1,
    useActivityStage: false,
    stageBlacklist: [],
    customItem: [{
        itemId:'30073',
        itemValue:1.8
    }]
}

let stageConfig = ref(defaultConfig)

function getStageConfig() {
    const item = localStorage.getItem("StageConfig");
    if (item) {
        const config = JSON.parse(item);
        stageConfig.value = config
        return config;
    } else {
        return defaultConfig
    }
}

export {
    getStageConfig, stageConfig
}