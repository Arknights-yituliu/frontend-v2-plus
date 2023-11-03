import operator_item_cost_table from "/src/static/json/survey/operator_item_cost_table.json";
import level_cost_table from "/src/static/json/survey/level_cost_table.json";
import composite_table from "/src/static/json/survey/composite_table.json";
import item_table from "/src/static/json/survey/item_table.json";




const zone_ranks = {
    current_elite: 0,
    current_level: 0,
    current_mainSkill: 0,
    current_skill1: 0,
    current_skill2: 0,
    current_skill3: 0,
    current_modX: 0,
    current_modY: 0
}

/**
 * 计算干员消耗材料
 * @param operator_list 干员列表
 * @returns {{apCostCount: number, itemList: [], itemMap: {}}} 理智消耗总量，物品列表，物品列表
 */
function calAPCost(operator_list) {

    let item_cost_count = {};

    // 计算干员的消耗材料
    for (let operator of operator_list) {
        const item_cost  =  getOperatorItemCost(operator.charId, operator.rarity, zone_ranks, operator)

        for(let id in item_cost){
            updateItemCostCount(item_cost_count,id,item_cost[id].count)
        }

    }

    //获得消耗材料的明细集合
    const {item_list, ap_cost_count} = getItemList(item_cost_count)

    return {
        itemList: item_list, apCostCount: ap_cost_count, itemMap: item_cost_count
    }
}

/**
 *
 * @param charId 干员id
 * @param rarity 干员星级
 * @param current_ranks 当前干员练度
 * @param target_ranks 目标干员练度
 * @returns {{}}
 */
function getOperatorItemCost(charId, rarity, current_ranks, target_ranks,) {

    let item_cost = {}
    const {
        current_elite,
        current_level,
        current_mainSkill,
        current_skill1,
        current_skill2,
        current_skill3,
        current_modX,
        current_modY
    } = current_ranks;

    const {elite, level, mainSkill, skill1, skill2, skill3, modX, modY} = target_ranks;


    if (operator_item_cost_table[charId] === void 0) return;
    const operatorItemCost = operator_item_cost_table[charId];
    const {allSkill, skills} = operator_item_cost_table[charId];
    const levelApCost = getLevelUpCostByRarity(rarity,
        {current_elite:current_elite, current_level:current_level},
        {target_elite:elite, target_level:level});

    for (const itemId in levelApCost) {
        let count = levelApCost[itemId];
        updateItemCostCount(item_cost,itemId, count)
    }

    for (let i = current_elite; i <= elite; i++) {
        for (let itemId in operatorItemCost.elite[i]) {
            let count = operatorItemCost.elite[i][itemId];
            updateItemCostCount(item_cost,itemId, count)
        }
    }

    for (let i = current_mainSkill; i < mainSkill; i++) {
        for (let itemId in allSkill[i]) {
            let count = allSkill[i][itemId];
            updateItemCostCount(item_cost,itemId, count)
        }
    }

    const current_skill_ranks = [current_skill1, current_skill2, current_skill3]
    const target_skill_ranks = [skill1, skill2, skill3]

    for (let index in current_skill_ranks) {
        for (let rank = current_skill_ranks[index]; rank < target_skill_ranks[index]; rank++) {
            for (let itemId in skills[index][rank]) {
                let count = skills[index][rank][itemId];
                updateItemCostCount(item_cost,itemId, count)
            }
        }
    }

    const current_mod_ranks = {"X": current_modX, "Y": current_modY}
    const target_mod_ranks = {"X": modX, "Y": modY}
    for (const type in current_mod_ranks) {
        if (operatorItemCost[`mod${type}`] === void 0) continue;
        for (let i = current_mod_ranks[type]; i < target_mod_ranks[type]; i++) {
            for (let itemId in operatorItemCost[`mod${type}`][i]) {
                let count = operatorItemCost[`mod${type}`][i][itemId];
                updateItemCostCount(item_cost,itemId, count)
            }
        }
    }

    return item_cost;
}


function getItemList(item_cost_count) {
    let item_list = [[], [], [], [], [], []]

    let ap_cost_count = 0;

    for (const itemId in item_cost_count) {
        const item = item_cost_count[itemId]
        const rarity = item.rarity;
        const itemValueAp = item.itemValueAp
        const count = item.count;
        ap_cost_count += (itemValueAp * count)

        if (rarity === 5) {
            item_list[1].push(item)
        }
        if (rarity === 4) {
            if ("4001" === itemId || "2003" === itemId) {
                item_list[0].push(item)
            } else {
                item_list[2].push(item)
            }
        }

        if (rarity === 3) {
            item_list[3].push(item)
        }
        if (rarity === 2) {
            item_list[4].push(item)
        }
        if (rarity === 1) {
            item_list[5].push(item)
        }

    }

    for (let list of item_list) {
        list.sort((a, b) => {
            return b.id - a.id
        })
    }

    return {item_list, ap_cost_count}
}

function updateItemCostCount(result,id, count) {
    if (item_table[id] === void 0) return;

    let item = {
        id: id,
        name: item_table[id].name,
        rarity: item_table[id].rarity,
        count: count,
        itemValueAp: item_table[id].itemValueAp
    }

    if (result[id]) {
        const last_item = result[id]
        item.count = count + last_item.count
        result[id] = item
    } else {
        item.count = count
        result[id] = item
    }
}

const rarity_level_table = {
    6: {elite0_max_level: 50, elite1_max_level: 80},
    5: {elite0_max_level: 50, elite1_max_level: 70},
    4: {elite0_max_level: 45, elite1_max_level: 60},
    3: {elite0_max_level: 40, elite1_max_level: 55},
    2: {elite0_max_level: 30, elite1_max_level: 0},
    1: {elite0_max_level: 30, elite1_max_level: 0}
}

/**
 *
 * @param rarity 星级
 * @param current_elite 当前精英等级
 * @param current_level 当前等级
 * @param target_elite 目标精英等级
 * @param target_level 目标等级
 * @returns {{"4001": number, "2003": number}|{level_cost: {"4001": number, "2003": number}}}
 */
function getLevelUpCostByRarity(rarity, {current_elite, current_level}, {target_elite, target_level}) {

    let level_cost = {
        "4001": 0, "2003": 0
    }

    if (!rarity_level_table[rarity]) return {
        level_cost
    };

    const {elite0, elite1, elite2} = level_cost_table
    const {elite0_max_level, elite1_max_level} = rarity_level_table[rarity]

    let current_level_0 = current_elite === 0?current_level:0;
    let current_level_1  = current_elite === 1?current_level:0;
    let current_level_2  = current_elite === 2?current_level:0;
    if(current_elite>0) current_level_0 =  elite0_max_level
    if(current_elite>1) current_level_1 =  elite1_max_level

    let target_level_0 = target_elite === 0?target_level:0;
    let target_level_1  = target_elite === 1?target_level:0;
    let target_level_2  = target_elite === 2?target_level:0;
    if(target_elite>0) target_level_0 =  elite0_max_level
    if(target_elite>1) target_level_1 =  elite1_max_level


    for (let i = current_level_0; i < target_level_0; i++) {
        const {gold, exp} = elite0[i];
        level_cost["4001"] += gold
        level_cost["2003"] += exp
    }

    for (let i = current_level_1; i < target_level_1; i++) {
        const {gold, exp} = elite1[i];
        level_cost["4001"] += gold
        level_cost["2003"] += exp
    }

    for (let i = current_level_2; i < target_level_2; i++) {
        const {gold, exp} = elite2[i];
        level_cost["4001"] += gold
        level_cost["2003"] += exp
    }


    if (rarity > 2 && current_elite < 1 && target_elite > 0) {
        level_cost["4001"] += (5000 * (rarity - 1))
    }

    if (rarity > 3 && current_elite < 2 && target_elite > 1) {
        level_cost["4001"] += (60000 * (rarity - 3))
    }


    level_cost["2003"] = level_cost["2003"]/1000
    return level_cost;
}

/**
 * 按材料等级拆分材料
 * @param highest_rarity 最高材料等级 int
 * @param item_cost_obj 材料消耗原始数据 obj
 * @returns {*[]} 材料消耗表 arr
 */

function splitMaterial(highest_rarity, item_cost_obj) {

    let item_count = JSON.parse(JSON.stringify(item_cost_obj))

    for (let rarity = 5; rarity > highest_rarity; rarity--) {


        for (const itemId in item_count) {
            const item = item_count[itemId]
            if (item.rarity === rarity) {
                const product_id = item.id   //材料id
                const product_count = item.count; //材料总数
                if (composite_table[product_id] !== void 0) {
                    let {item_cost} = composite_table[product_id];//材料的合成列表
                    for (const cost of item_cost) {
                        // const material_name = composite_list_element.name;  //合成原料名称
                        const material_id = cost.id;  //合成原料id
                        const material_count = cost.count;  //合成原料总数
                        let new_item = item_count[material_id];
                        // 如果没有这个材料添加一个
                        if (new_item === void 0) {
                            const item = item_table[material_id]
                            new_item = {
                                count: 0,
                                id: material_id,
                                itemValueAp: item.itemValueAp,
                                name: item.name,
                                rarity: item.rarity
                            }
                        }
                        new_item.count = new_item.count + product_count * material_count;
                        item_count[material_id] = new_item;
                    }
                    let new_item = item_count[product_id];
                    new_item.count = 0;
                    item_count[product_id] = new_item;
                }
            }
        }
    }


    let itemList = [[], [], [], [], [], []]
    for (const itemId in item_count) {
        const item = item_count[itemId]
        const rarity = item.rarity
        if (item.count > 0) {
            if ("4001" === itemId || "2003" === itemId) {
                itemList[0].push(item)
                continue;
            }
            if (rarity === 5) {
                itemList[1].push(item)
            }
            if (rarity === 4) {
                itemList[2].push(item)

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

    for (let list of itemList) {
        list.sort((a, b) => {
            return b.id - a.id
        })
    }
    return itemList
}


function operatorStatistics(list) {

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
        max: []
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

            if (item.rarity === 6) {
                const item_cost =  getOperatorItemCost(item.charId,item.rarity,zone_ranks,item)
                const {ap_cost_count} = getItemList(item_cost);
                console.log(ap_cost_count)
                item.apCost = ap_cost_count
                operator_statistics_result.max.push(item)
            }
            // if (item.modX > 0) operatorStatisticsResult[rarity].modX++
            // if (item.modY > 0) operatorStatisticsResult[rarity].modY++
        }
    }

    operator_statistics_result.max.sort((a, b) => {
        return b.apCost - a.apCost
    })
    operator_statistics_result.max = operator_statistics_result.max.slice(0, 10)
   console.log(operator_statistics_result.max)

    return operator_statistics_result

}


export default {
    calAPCost, splitMaterial, operatorStatistics
}