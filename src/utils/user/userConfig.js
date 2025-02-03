const config1 ={
    "id": 202412050001,
    "expCoefficient": 0.633,
    "sampleSize": 300
}

const defaultConfig = {
    id: 202412050002,
    expCoefficient: 0.633,
    lmdCoefficient: 1,
    useActivityStage: false,
    stageBlacklist: [],
    customItem: [{
        itemId:'30073',
        itemValue:1.8
    }]
}

function getStageConfig(){
    return defaultConfig
    // const item = localStorage.getItem("StageConfig");
    // if(item){
    //     return JSON.parse(item);
    // }else {
    //
    //     return defaultConfig
    // }
}

export  {
    getStageConfig
}