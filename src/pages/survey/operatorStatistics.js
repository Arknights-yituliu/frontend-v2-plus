import operatorItemCostTable from "@/static/json/survey/operator_item_cost_table.json";
import levelCostTable from "@/static/json/survey/level_cost_table.json";
import compositeTable from "@/static/json/survey/compositeTable.json";
import itemTable from "@/static/json/survey/item_table.json";


let itemCountStatistics = {};

/**
 * 计算干员消耗材料
 * @param operatorList 干员列表
 * @returns {{apCostCount('理智消耗总量'): number, itemList('材料消耗表'): [], itemMap('材料原始数据'): {}|*}}
 */
function calAPCost(operatorList) {

    itemCountStatistics = {};

    for (let c in operatorList) {
        const operator = operatorList[c];

        const charId = operator.charId;

        // const name = operator.name;
        const rarity = operator.rarity;
        const elite = operator.elite;
        const level = operator.level;
        if (operatorItemCostTable[charId] == void 0) continue;
        const operatorItemCost = operatorItemCostTable[charId];
        const levelApCost = levelApCostCal(rarity, elite, level);

        for (const itemId in levelApCost) {
            let count = levelApCost[itemId];
            updateItemCostMap(itemId, count)
        }

        for (let i = 1; i <= operator.elite; i++) {
            for (let itemId in operatorItemCost.elite[i]) {
                let count = operatorItemCost.elite[i][itemId];
                updateItemCostMap(itemId, count)
            }
        }

        // console.log('基础技能：',operator.mainSkill)
        for (let i = 0; i < operator.mainSkill; i++) {
            for (let itemId in operatorItemCost.allSkill[i]) {
                let count = operatorItemCost.allSkill[i][itemId];
                updateItemCostMap(itemId, count)
            }
        }

        for (let i = 0; i < operator.skill1; i++) {
            for (let itemId in operatorItemCost.skills[0][i]) {
                let count = operatorItemCost.skills[0][i][itemId];
                updateItemCostMap(itemId, count)
            }
        }

        for (let i = 0; i < operator.skill2; i++) {
            for (let itemId in operatorItemCost.skills[1][i]) {
                let count = operatorItemCost.skills[1][i][itemId];
                updateItemCostMap(itemId, count)
            }
        }

        if(charId==='char_4088_hodrer'){
          console.log(operatorItemCost.skills[2])
        }
        for (let i = 0; i < operator.skill3; i++) {
            for (let itemId in operatorItemCost.skills[2][i]) {
                let count = operatorItemCost.skills[2][i][itemId];
                updateItemCostMap(itemId, count)
            }
        }


        if (operator.equip != void 0) {
            for (const mod of operator.equip) {
                if ('X' == mod.typeName2) {
                    for (let i = 0; i < operator.modX; i++) {
                        if (operatorItemCost.modX == void 0) continue;
                        for (let itemId in operatorItemCost.modX[i]) {
                            let count = operatorItemCost.modX[i][itemId];
                            updateItemCostMap(itemId, count)
                        }
                    }
                }

                if ('Y' == mod.typeName2) {
                    for (let i = 0; i < operator.modY; i++) {
                        if (operatorItemCost.modY == void 0) continue;
                        for (let itemId in operatorItemCost.modY[i]) {
                            let count = operatorItemCost.modY[i][itemId];
                            updateItemCostMap(itemId, count)
                        }
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

    for (const itemId in itemCountStatistics) {
        const item = itemCountStatistics[itemId]
        const rarity = item.rarity;
        const itemValueAp = item.itemValueAp
        const count = item.count;
        apCostCount += (itemValueAp * count)


        if (rarity == 5) {
            rarity5List.push(item)
        }
        if (rarity == 4) {
            if ("4001" == itemId || "2003" == itemId) {
                rarityEXList.push(item)
            } else {
                rarity4List.push(item)
            }
        }
        if (rarity == 3) {
            rarity3List.push(item)
        }
        if (rarity == 2) {
            rarity2List.push(item)
        }
        if (rarity == 1) {
            rarity1List.push(item)
        }

    }


    rarity5List.sort((a, b) => {
        return b.id - a.id
    })

    rarity4List.sort((a, b) => {
        return b.id - a.id
    })

    rarity3List.sort((a, b) => {
        return b.id - a.id
    })

    itemList.push(rarityEXList)
    itemList.push(rarity5List)
    itemList.push(rarity4List)
    itemList.push(rarity3List)
    itemList.push(rarity2List)
    itemList.push(rarity1List)


    const result = {
        itemList: itemList,
        apCostCount: apCostCount,
        itemMap: itemCountStatistics
    }
    return result;
}

function updateItemCostMap(id, count) {
    if (itemTable[id] == void 0) {
        return;
    }

    const rarity = itemTable[id].rarity;
    const name = itemTable[id].name;
    let itemValueAp = itemTable[id].itemValueAp;

    let item = {
        id: id,
        name: name,
        rarity: rarity,
        count: count,
        itemValueAp: itemValueAp
    }

    if (itemCountStatistics[id] != void 0) {
        const last_item = itemCountStatistics[id]
        item.count = count + last_item.count
        itemCountStatistics[id] = item
    } else {
        item.count = count
        itemCountStatistics[id] = item
    }
}

/**
 *
 * @param rarity 星级
 * @param elite 精英等级
 * @param level 等级
 * @returns {{"4001": number, "2003": number}} 龙门币和经验书的消耗情况
 */
function levelApCostCal(rarity, elite, level) {

    if (rarity == 6) {
        return getLevelCostByRarity(rarity, elite, level, 49, 79)
    }

    if (rarity == 5) {
        return getLevelCostByRarity(rarity, elite, level, 49, 69)
    }

    if (rarity == 4) {
        return getLevelCostByRarity(rarity, elite, level, 44, 59)
    }

    if (rarity == 3) {
        return getLevelCostByRarity(rarity, elite, level, 39, 54)
    }

    if (rarity == 2) {
        return getLevelCostByRarity(rarity, elite, level, 29, 0)
    }

    if (rarity == 1) {
        return getLevelCostByRarity(rarity, elite, level, 29, 0)
    }
}


function getLevelCostByRarity(rarity, elite, level, elite_0_max_level, elite_1_max_level) {
    let LMDCost = 0;
    let EXPCost = 0;

    if (elite > 0) {
        LMDCost += levelCostTable['elite0'][elite_0_max_level].LMDCount
        EXPCost += levelCostTable['elite0'][elite_0_max_level].EXPCount
        if (rarity > 2) {
            LMDCost += (5000 * (rarity - 1))
        }
    }

    if (elite > 1) {
        LMDCost += levelCostTable['elite1'][elite_1_max_level].LMDCount
        EXPCost += levelCostTable['elite1'][elite_1_max_level].EXPCount
        if (rarity > 3) {
            LMDCost += (60000 * (rarity - 3))
        }
    }

    if (level > 0) {
        LMDCost += levelCostTable['elite' + elite][level - 1].LMDCount
        EXPCost += levelCostTable['elite' + elite][level - 1].EXPCount
    }



    return {
        "4001": LMDCost,
        "2003": parseInt(EXPCost / 1000)
    };
}

/**
 * 按材料等级拆分材料
 * @param highest_rarity 最高材料等级 int
 * @param item_cost_obj 材料消耗原始数据 obj
 * @returns {*[]} 材料消耗表 arr
 */

function splitMaterial(highest_rarity, item_cost_obj) {

    let item_cost_obj_copy = JSON.parse(JSON.stringify(item_cost_obj))
    let itemList = []
    let rarityEXList = []
    let rarity5List = []
    let rarity4List = []
    let rarity3List = []
    let rarity2List = []
    let rarity1List = []


    for (let rarity = 5; rarity > highest_rarity; rarity--) {
        console.log(rarity)

        for (const itemId in item_cost_obj_copy) {
            const item = item_cost_obj_copy[itemId]
            if (item.rarity == rarity) {
                const product_id = item.id   //材料id
                const product_name = item.name //材料名称
                const product_count = item.count; //材料总数
                if (compositeTable[product_name] != void 0) {
                    let composite_list = compositeTable[product_name]  //材料的合成列表
                    for (const composite_list_element of composite_list) {
                        // const material_name = composite_list_element.name;  //合成原料名称
                        const material_id = composite_list_element.id;  //合成原料id
                        const material_count = composite_list_element.count;  //合成原料总数
                        let new_item = item_cost_obj_copy[material_id];
                        if(new_item == void 0 ) {
                           const item =  itemTable[material_id]
                           new_item = {
                               count:0,
                               id:material_id,
                               itemValueAp:item.itemValueAp,
                               name:item.name,
                               rarity:item.rarity
                           }
                        }
                        new_item.count = new_item.count + product_count * material_count;
                        item_cost_obj_copy[material_id] = new_item;
                    }

                    let new_item = item_cost_obj_copy[product_id];
                    new_item.count = 0;
                    item_cost_obj_copy[product_id] = new_item;
                }
            }
        }
    }


    // console.log(item_cost_map)

    for (const itemId in item_cost_obj_copy) {
        const item = item_cost_obj_copy[itemId]
        const rarity = item.rarity
        if (item.count > 0) {
            if (rarity == 5) {
                rarity5List.push(item)
            }
            if (rarity == 4) {
                if ("4001" == itemId || "2003" == itemId) {
                    rarityEXList.push(item)
                } else {
                    rarity4List.push(item)
                }
            }
            if (rarity == 3) {
                rarity3List.push(item)
            }
            if (rarity == 2) {
                rarity2List.push(item)
            }
            if (rarity == 1) {
                rarity1List.push(item)
            }

        }
    }

    rarity5List.sort((a, b) => {
        return b.id - a.id
    })

    rarity4List.sort((a, b) => {
        return b.id - a.id
    })

    rarity3List.sort((a, b) => {
        return b.id - a.id
    })

    itemList.push(rarityEXList)
    itemList.push(rarity5List)
    itemList.push(rarity4List)
    itemList.push(rarity3List)
    itemList.push(rarity2List)
    itemList.push(rarity1List)
    // console.table(itemList)

    return itemList
}


export default {
    calAPCost, splitMaterial
}