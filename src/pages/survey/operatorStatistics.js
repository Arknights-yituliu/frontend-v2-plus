import operatorItemCostTable from "@/static/json/survey/operator_item_cost_table.json";
import itemTable from "@/static/json/survey/item_table.json";
import levelCostTable from "@/static/json/survey/level_cost_table.json";

function calAPCost(operatorList) {
    let itemCountMap = new Map();
    for (let c in operatorList) {
        const operator = operatorList[c];
        const charId = operator.charId;
        const name = operator.name;
        const rarity = operator.rarity;
        const elite = operator.elite;
        const level = operator.level;
        const itemCost = operatorItemCostTable[charId];


        const levelApCost = levelApCostCal(rarity, elite, level);


        for(const itemId in levelApCost){
            if (itemCountMap.get(itemId) === void 0) {
                let count = levelApCost[itemId];
                itemCountMap.set(itemId, count)

            } else {
                let count = itemCountMap.get(itemId);
                count += levelApCost[itemId]
                itemCountMap.set(itemId, count)

            }
        }

        for (let i = 1; i <= operator.elite; i++) {
            for (let itemId in itemCost.elite[i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.elite[i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.elite[i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        // console.log('基础技能：',operator.mainSkill)
        for (let i = 0; i < operator.mainSkill; i++) {
            for (let itemId in itemCost.allSkill[i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.allSkill[i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.allSkill[i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        for (let i = 0; i < operator.skill1; i++) {
            for (let itemId in itemCost.skills[0][i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.skills[0][i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.skills[0][i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        for (let i = 0; i < operator.skill2; i++) {
            for (let itemId in itemCost.skills[1][i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.skills[1][i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.skills[1][i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        for (let i = 0; i < operator.skill3; i++) {
            for (let itemId in itemCost.skills[2][i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.skills[2][i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.skills[2][i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        if(operator.modXOwn){
            for (let i = 0; i < operator.modX; i++) {
                for (let itemId in itemCost.modX[i]){
                    if (itemCountMap.get(itemId) === void 0) {
                        let count = itemCost.modX[i][itemId];
                        itemCountMap.set(itemId, count)
                        // console.log("模组——没添加过的材料：", itemId, '数量：', count)
                    } else {
                        let count = itemCountMap.get(itemId);
                        count += itemCost.modX[i][itemId]
                        itemCountMap.set(itemId, count)
                        // console.log("模组——已添加过的材料：", itemId, '数量：', count)
                    }
                }
            }
        }


        if(operator.modYOwn){
            for (let i = 0; i < operator.modY; i++) {
                for (let itemId in itemCost.modY[i]){
                    if (itemCountMap.get(itemId) === void 0) {
                        let count = itemCost.modY[i][itemId];
                        itemCountMap.set(itemId, count)
                        // console.log("模组——没添加过的材料：", itemId, '数量：', count)
                    } else {
                        let count = itemCountMap.get(itemId);
                        count += itemCost.modY[i][itemId]
                        itemCountMap.set(itemId, count)
                        // console.log("模组——已添加过的材料：", itemId, '数量：', count)
                    }
                }
            }
        }

    }


    let itemList = []
    let rarityEXList = []
    let rarity5List = []
    let rarity4List = []
    let rarity3List = []
    let rarity2List = []
    let rarity1List = []

    let apCostCount = 0;

    itemCountMap.forEach((v, k) => {
        // console.log('材料id', k)
        if (itemTable[k] !== void 0) {
            const rarity = itemTable[k].rarity;
            let  itemValueAp =  itemTable[k].itemValueAp;
            let item = {
                id: k,
                rarity: rarity,
                count: v,
                itemValueAp:itemTable[k].itemValueAp
            }
            apCostCount+=(itemValueAp*v)

            if (rarity === 5) {
                rarity5List.push(item)
            }
            if (rarity === 4) {
                if("4001"===k||"2003"===k){
                    rarityEXList.push(item)
                }else {
                    rarity4List.push(item)
                }
            }
            if (rarity === 3) {
                rarity3List.push(item)
            }
            if (rarity === 2) {
                rarity2List.push(item)
            }
            if (rarity === 1) {
                rarity1List.push(item)
            }
        }
    })



    rarity5List.sort((a,b)=>{
        return b.id-a.id
    })

    rarity4List.sort((a,b)=>{
        return b.id-a.id
    })

    rarity3List.sort((a,b)=>{
        return b.id-a.id
    })

    itemList.push(rarityEXList)
    itemList.push(rarity5List)
    itemList.push(rarity4List)
    itemList.push(rarity3List)
    itemList.push(rarity2List)
    itemList.push(rarity1List)

    const result={
        itemList:itemList,
        apCostCount:apCostCount
    }

    return result;
}

function levelApCostCal(rarity,elite,level) {

    if(rarity===6){
        return   getLevelCostByRarity(rarity,elite,level,49,79)
    }

    if(rarity===5){
        return   getLevelCostByRarity(rarity,elite,level,49,69)
    }

    if(rarity===4){
        return   getLevelCostByRarity(rarity,elite,level,44,59)
    }

    if(rarity===3){
        return   getLevelCostByRarity(rarity,elite,level,39,54)
    }

    if(rarity===2){
        return   getLevelCostByRarity(rarity,elite,level,29,0)
    }

    if(rarity===1){
        return   getLevelCostByRarity(rarity,elite,level,29,0)
    }


}


function getLevelCostByRarity(rarity,elite,level,elite_0_max_level,elite_1_max_level){
    let LMDCost = 0;
    let EXPCost = 0;

    if(elite>0){
        LMDCost += levelCostTable['elite0'][elite_0_max_level].LMDCount
        EXPCost += levelCostTable['elite0'][elite_0_max_level].EXPCount
        if(rarity>2){
            LMDCost += (5000*(rarity-1))
        }
    }

    if(elite>1){
        LMDCost += levelCostTable['elite1'][elite_1_max_level].LMDCount
        EXPCost += levelCostTable['elite1'][elite_1_max_level].EXPCount
        if(rarity>3){
            LMDCost += (60000*(rarity-3))
        }
    }

    if(level>0){
        LMDCost += levelCostTable['elite'+elite][level-1].LMDCount
        EXPCost += levelCostTable['elite'+elite][level-1].EXPCount
    }

    let result={
        "4001":LMDCost,
        "2003":EXPCost/1000
    }

    return result;
}


function operatorStatistics(operatorList){
    for(const i in operatorList){
        const operator = operatorList[i];
        // for()
    }
}


export {
    calAPCost,
    operatorStatistics
}