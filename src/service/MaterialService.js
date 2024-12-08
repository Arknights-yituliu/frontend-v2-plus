import materialAPI from "/src/api/material.js";
import userService from "/src/service/UserService.js";

function checkItemValue(){
    const data = userService.getStageConfig();
    materialAPI.checkItemValue(data).then(response => {
        let updateTime = response.data
        if(data.updateTime!==updateTime){
            materialAPI.getItemValueTableV4(data).then(response => {
                const itemValueTable = response.data
                
            })
        }
        localStorage.getItem("StageConfig")
    })
}



export default {
    checkItemValue
}