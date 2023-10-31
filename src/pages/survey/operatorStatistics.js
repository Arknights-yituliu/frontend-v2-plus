import operatorItemCostTable from "/src/static/json/survey/operator_item_cost_table.json";
import levelCostTable from "/src/static/json/survey/level_cost_table.json";
import compositeTable from "/src/static/json/survey/compositeTable.json";
import itemTable from "/src/static/json/survey/item_table.json";


let itemCountStatistics = {};

/**
 * 计算干员消耗材料
 * @param operatorList 干员列表
 * @returns {{apCostCount: number, itemList: [], itemMap: {}|*}} 理智消耗总量，物品列表，物品列表
 */
function calAPCost(operatorList) {

    itemCountStatistics = {};

    for (let c in operatorList) {
        const {charId, rarity, elite, level, mainSkill, skill1, skill2, skill3, modX, modY} = operatorList[c];

        if (operatorItemCostTable[charId] == void 0) continue;
        const operatorItemCost = operatorItemCostTable[charId];
        const {allSkill, skills} = operatorItemCostTable[charId];
        const levelApCost = levelApCostCal(rarity, elite, level);

        for (const itemId in levelApCost) {
            let count = levelApCost[itemId];
            updateItemCostMap(itemId, count)
        }

        for (let i = 1; i <= elite; i++) {
            for (let itemId in operatorItemCost.elite[i]) {
                let count = operatorItemCost.elite[i][itemId];
                updateItemCostMap(itemId, count)
            }
        }

        // console.log('基础技能：',operator.mainSkill)
        for (let i = 0; i < mainSkill; i++) {
            for (let itemId in allSkill[i]) {
                let count = allSkill[i][itemId];
                updateItemCostMap(itemId, count)
            }
        }

        const skillRanks = [skill1, skill2, skill3]
        for (let index in skillRanks) {
            for (let rank = 0; rank < skillRanks[index]; rank++) {
                for (let itemId in skills[index][rank]) {
                    let count = skills[index][rank][itemId];
                    updateItemCostMap(itemId, count)
                }
            }
        }

        const modRanks = {"X": modX, "Y": modY}
        for (const type in modRanks) {
            if (operatorItemCost[`mod${type}`] == void 0) continue;
            for (let i = 0; i < modRanks[type]; i++) {
                for (let itemId in operatorItemCost[`mod${type}`][i]) {
                    let count = operatorItemCost[`mod${type}`][i][itemId];
                    updateItemCostMap(itemId, count)
                }
            }
        }
    }


    let itemList = [[],[],[],[],[],[]]


    let apCostCount = 0;

    for (const itemId in itemCountStatistics) {
        const item = itemCountStatistics[itemId]
        const rarity = item.rarity;
        const itemValueAp = item.itemValueAp
        const count = item.count;
        apCostCount += (itemValueAp * count)

        if (rarity === 5) {
            itemList[1].push(item)
        }
        if (rarity === 4) {
            if ("4001" === itemId || "2003" === itemId) {
                itemList[0].push(item)
            } else {
                itemList[2].push(item)
            }
        }

        if (rarity === 3) {
            itemList[3].push(item)
        }
        if (rarity === 2) {
            itemList[4].push(item)
        }
        if (rarity === 1) {
            itemList[5].push(item)
        }

    }

    for(let list of itemList){
        list.sort((a, b) => { return b.id - a.id})
    }

    return {
        itemList: itemList,
        apCostCount: apCostCount,
        itemMap: itemCountStatistics
    }
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

    if (rarity === 6) {
        return getLevelCostByRarity(rarity, elite, level, 49, 79)
    }

    if (rarity === 5) {
        return getLevelCostByRarity(rarity, elite, level, 49, 69)
    }

    if (rarity === 4) {
        return getLevelCostByRarity(rarity, elite, level, 44, 59)
    }

    if (rarity === 3) {
        return getLevelCostByRarity(rarity, elite, level, 39, 54)
    }

    if (rarity === 2) {
        return getLevelCostByRarity(rarity, elite, level, 29, 0)
    }

    if (rarity === 1) {
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
        "2003": parseInt((EXPCost / 1000).toString())
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



    for (let rarity = 5; rarity > highest_rarity; rarity--) {
        console.log(rarity)

        for (const itemId in item_cost_obj_copy) {
            const item = item_cost_obj_copy[itemId]
            if (item.rarity === rarity) {
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
                        if (new_item == void 0) {
                            const item = itemTable[material_id]
                            new_item = {
                                count: 0,
                                id: material_id,
                                itemValueAp: item.itemValueAp,
                                name: item.name,
                                rarity: item.rarity
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

    let itemList = [[],[],[],[],[],[]]


    for (const itemId in item_cost_obj_copy) {
        const item = item_cost_obj_copy[itemId]
        const rarity = item.rarity
        if (item.count > 0) {
            if (rarity === 5) {
                itemList[1].push(item)
            }
            if (rarity === 4) {
                if ("4001" === itemId || "2003" === itemId) {
                    itemList[0].push(item)
                } else {
                    itemList[2].push(item)
                }
            }
            if (rarity === 3) {
                itemList[3].push(item)
            }
            if (rarity === 2) {
                itemList[4].push(item)
            }
            if (rarity === 1) {
                itemList[5].push(item)
            }

        }
    }

    for(let list of itemList){
        list.sort((a, b) => { return b.id - a.id})
    }


    return itemList
}


function operatorStatistics(list) {
    console.log("开始统计干员")
    let group_by_rarity = {}
    for (const item of list) {
        if (!group_by_rarity[`rarity${item.rarity}`]) {
            group_by_rarity[`rarity${item.rarity}`] = [item]
        } else {
            group_by_rarity[`rarity${item.rarity}`].push(item)
        }
    }

    let initData = {
        total: {description: '总计干员练度：'},
        rarity6: {description: '六星干员练度：'},
        rarity5: {description: '五星干员练度：'},
        rarity4: {description: '四星干员练度：'},
        rarity3: {description: '三星干员练度：'},
        rarity2: {description: '二星干员练度：'},
        rarity1: {description: '一星计干员练度：'}
    }

    let operator_statistics_result = {
        score: []
    }

    for (const key in initData) {
        operator_statistics_result[key] = {
            description: initData[key].description,
            count: 0,
            own: 0,
            skill: [0, 0, 0],
            mod: [0, 0, 0],
            modX: [0, 0, 0],
            modY: [0, 0, 0],

        }
    }



    for (const rarity in group_by_rarity) {
        operator_statistics_result[rarity].count = group_by_rarity[rarity].length
        operator_statistics_result["total"].count += group_by_rarity[rarity].length
        for (const item of group_by_rarity[rarity]) {

            if (!item.own) continue

            operator_statistics_result[rarity].own++
            operator_statistics_result["total"].own++


            for (const index of [1, 2, 3]) {
                if (item[`skill${index}`] === 3) {
                    operator_statistics_result[rarity].skill[0]++
                    operator_statistics_result["total"].skill[0]++
                }
                if (item[`skill${index}`] === 2) {
                    operator_statistics_result[rarity].skill[1]++
                    operator_statistics_result["total"].skill[1]++
                }
                if (item[`skill${index}`] === 1) {
                    operator_statistics_result[rarity].skill[2]++
                    operator_statistics_result["total"].skill[2]++
                }
            }


            for (const type of ['X', 'Y']) {
                if (item[`mod${type}`] === 3) {
                    operator_statistics_result[rarity][`mod${type}`][0]++
                    operator_statistics_result[rarity][`mod`][0]++
                    operator_statistics_result["total"][`mod${type}`][0]++
                    operator_statistics_result["total"][`mod`][0]++
                }
                if (item[`mod${type}`] === 2) {
                    operator_statistics_result[rarity][`mod${type}`][1]++
                    operator_statistics_result[rarity][`mod`][1]++
                    operator_statistics_result["total"][`mod${type}`][1]++
                    operator_statistics_result["total"][`mod`][1]++
                }
                if (item[`mod${type}`] === 1) {
                    operator_statistics_result[rarity][`mod${type}`][2]++
                    operator_statistics_result[rarity][`mod`][2]++
                    operator_statistics_result["total"][`mod${type}`][2]++
                    operator_statistics_result["total"][`mod`][2]++
                }
            }

            if (item.rarity ===6) {

                item.score = item.elite
                    + (item.mainSkill === 7 ? 1 : 0)
                    + (item.skill1 < 1 ? 0 : item.skill1)
                    + (item.skill2 < 1 ? 0 : item.skill2)
                    + (item.skill3 < 1 ? 0 : item.skill3)
                    + (item.modX < 1 ? 0 : item.modX)
                    + (item.modY < 1 ? 0 : item.modY)

                operator_statistics_result.score.push(item)
            }
            // if (item.modX > 0) operatorStatisticsResult[rarity].modX++
            // if (item.modY > 0) operatorStatisticsResult[rarity].modY++
        }
    }

    operator_statistics_result.score.sort((a, b) => {return b.score - a.score})
    operator_statistics_result.score = operator_statistics_result.score.slice(0,10)

    console.log(operator_statistics_result)

    return operator_statistics_result

}


export default {
    calAPCost, splitMaterial, operatorStatistics
}