function getStageConfig(){
    const item = localStorage.getItem("StageConfig");
    if(item){
        return JSON.parse(item);
    }else {
        const config1 ={
            "id": 202412050001,
            "expCoefficient": 0.633,
            "sampleSize": 300
        }

        const config2 ={
            "id": 202412050002,
            "expCoefficient": 0.633,
            "sampleSize": 300,
            "customItemValue": {
                "30073": 1.8
            }
        }
        return config2
    }
}

export default {
    getStageConfig
}