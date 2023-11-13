import operator_item_cost_table from "/src/static/json/survey/operator_item_cost_table.json";
import level_cost_table from "/src/static/json/survey/level_cost_table.json";
import composite_table from "/src/static/json/survey/composite_table.json";
import item_table from "/src/static/json/survey/item_table.json";


// 初始练度
const zone_ranks = {
    elite: 0,
    level: 0,
    mainSkill: 0,
    skill1: 0,
    skill2: 0,
    skill3: 0,
    modX: 0,
    modY: 0
}

/**
 * 计算干员消耗材料
 * @param operator_list 干员列表
 * @returns {{apCostCount: number, itemList: [], itemMap: {}}} 理智消耗总量，物品列表，物品列表
 */
function calAPCost(operator_list) {

    let item_cost_count = {};

    // 计算已持有干员用掉的材料总和
    for (let operator of operator_list) {
        // 获得每个干员的材料消耗
        const item_cost = getOperatorItemCost(operator.charId, operator.rarity, zone_ranks, operator)
        //将材料消耗情况进行统计
        for (let id in item_cost) {
            updateItemCostCount(item_cost_count, id, item_cost[id].count)
        }

    }

    //计算已持有干员用掉的材料明细集合
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
    //解构当前练度属性
    let current_elite = current_ranks.elite
    let current_level = current_ranks.level
    let current_mainSkill = current_ranks.mainSkill
    let current_skill1 = current_ranks.skill1
    let current_skill2 = current_ranks.skill3
    let current_skill3 = current_ranks.skill3
    let current_modX = current_ranks.modX
    let current_modY = current_ranks.modY
    let current_modD = current_ranks.modD

    //解构目标练度属性
    const {elite, level, mainSkill, skill1, skill2, skill3, modX, modY} = target_ranks;

    // 查不到干员返回空对象
    if (operator_item_cost_table[charId] == void 0) return {};
    //id对应的干员信息
    const operatorItemCost = operator_item_cost_table[charId];
    //解构出通用技能和专精技能的材料消耗
    const {allSkill, skills} = operator_item_cost_table[charId];
    //计算干员升级消耗
    const levelApCost = getLevelUpCostByRarity(rarity,
        {current_elite: current_elite, current_level: current_level},
        {target_elite: elite, target_level: level});

    //统计材料消耗
    for (const itemId in levelApCost) {
        let count = levelApCost[itemId];
        updateItemCostCount(item_cost, itemId, count)
    }

    // 下面的是计算从当前练度到目标练度的消耗
    // 精英化消耗的材料

    for (let i = current_elite; i <= elite; i++) {
        for (let itemId in operatorItemCost.elite[i]) {
            let count = operatorItemCost.elite[i][itemId];

            updateItemCostCount(item_cost, itemId, count)
        }
    }

    // 通用技能消耗的材料
    for (let i = current_mainSkill; i < mainSkill; i++) {
        for (let itemId in allSkill[i]) {
            let count = allSkill[i][itemId];
            updateItemCostCount(item_cost, itemId, count)
        }
    }

    // 技能专精消耗的材料
    const current_skill_ranks = [current_skill1, current_skill2, current_skill3]
    const target_skill_ranks = [skill1, skill2, skill3]

    for (let index in current_skill_ranks) {
        for (let rank = current_skill_ranks[index]; rank < target_skill_ranks[index]; rank++) {
            for (let itemId in skills[index][rank]) {
                let count = skills[index][rank][itemId];

                updateItemCostCount(item_cost, itemId, count)
            }
        }
    }

    // 模组升级消耗的材料
    const current_mod_ranks = {"X": current_modX, "Y": current_modY}
    const target_mod_ranks = {"X": modX, "Y": modY}
    for (const type in current_mod_ranks) {
        if (operatorItemCost[`mod${type}`] == void 0) continue;
        for (let i = current_mod_ranks[type]; i < target_mod_ranks[type]; i++) {
            for (let itemId in operatorItemCost[`mod${type}`][i]) {
                let count = operatorItemCost[`mod${type}`][i][itemId];
                updateItemCostCount(item_cost, itemId, count)
            }
        }
    }

    return item_cost;
}

/**
 * 将材料消耗情况转为根据材料等级分类的集合
 * @param item_cost_count 材料效率总和
 * @returns {{ap_cost_count: number, item_list: *[][]}}  总材料消耗，根据材料等级分类的集合
 */
function getItemList(item_cost_count) {
    let item_list = [[], [], [], [], []]

    let ap_cost_count = 0;

    for (const itemId in item_cost_count) {
        const item = item_cost_count[itemId]
        const rarity = item.rarity;
        const itemValueAp = item.itemValueAp
        const count = item.count;
        ap_cost_count += (itemValueAp * count)
        item_list[(5 - rarity)].push(item)
    }

    for (let list of item_list) {
        list.sort((a, b) => {
            return b.count - a.count
        })
    }

    return {item_list, ap_cost_count}
}


/**
 * 更新材料统计对象的结果
 * @param result 统计对象
 * @param id 材料id
 * @param count 材料消耗总和
 */
function updateItemCostCount(result, id, count) {
    if (item_table[id] == void 0) return;

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

    let current_level_0 = current_elite === 0 ? current_level : 0;
    let current_level_1 = current_elite === 1 ? current_level : 0;
    let current_level_2 = current_elite === 2 ? current_level : 0;
    if (current_elite > 0) current_level_0 = elite0_max_level
    if (current_elite > 1) current_level_1 = elite1_max_level

    let target_level_0 = target_elite === 0 ? target_level : 0;
    let target_level_1 = target_elite === 1 ? target_level : 0;
    let target_level_2 = target_elite === 2 ? target_level : 0;
    if (target_elite > 0) target_level_0 = elite0_max_level
    if (target_elite > 1) target_level_1 = elite1_max_level


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


    level_cost["2003"] = level_cost["2003"] / 1000
    return level_cost;
}


/**
 * 统计已经持有的干员练度情况
 * @param list 干员练度信息集合
 * @returns {{}} 干员统计结果
 */
function operatorStatistics(list) {

    let group_by_rarity = {}
    //将干员根据星级分类
    for (const item of list) {
        if (!group_by_rarity[`rarity${item.rarity}`]) {
            group_by_rarity[`rarity${item.rarity}`] = [item]
        } else {
            group_by_rarity[`rarity${item.rarity}`].push(item)
        }
    }

    //初始化一个返回结果的对象
    let operator_statistics_result = {
        max: []
    }

    for (const key of ['total', 'rarity6', 'rarity5', 'rarity4', 'rarity3', 'rarity2', 'rarity1']) {
        operator_statistics_result[key] = {
            notOwn: [],
            count: 0,
            own: 0,
            skill: {rank1: 0, rank2: 0, rank3: 0},
            mod: {rank1: 0, rank2: 0, rank3: 0},
            modX: {rank1: 0, rank2: 0, rank3: 0},
            modY: {rank1: 0, rank2: 0, rank3: 0},
        }
    }


    //根据干员星级进行统计练度
    for (const rarity in group_by_rarity) {
        //每个星级的干员总和
        operator_statistics_result[rarity].count = group_by_rarity[rarity].length
        //所有星级的干员总和
        operator_statistics_result["total"].count += group_by_rarity[rarity].length

        for (const item of group_by_rarity[rarity]) {

            //判断是否持有，未持有的干员塞入未持有集合里面并跳出本次循环
            if (!item.own) {
                operator_statistics_result["total"].notOwn.push(item)
                continue
            }

            //每个星级已持有的干员
            operator_statistics_result[rarity].own++
            //所有星级已持有的干员
            operator_statistics_result["total"].own++


            // 统计每个星级干员和全部星级干员的技能专精情况
            for (const index of [1, 2, 3]) {
                if (item[`skill${index}`] === 1) {
                    operator_statistics_result[rarity].skill.rank1++
                    operator_statistics_result["total"].skill.rank1++
                }
                if (item[`skill${index}`] === 2) {
                    operator_statistics_result[rarity].skill.rank2++
                    operator_statistics_result["total"].skill.rank2++
                }
                if (item[`skill${index}`] === 3) {
                    operator_statistics_result[rarity].skill.rank3++
                    operator_statistics_result["total"].skill.rank3++
                }
            }

            // 统计每个星级干员和全部星级干员的模组升级情况
            for (const type of ['X', 'Y']) {
                if (item[`mod${type}`] === 1) {
                    operator_statistics_result[rarity][`mod${type}`].rank1++
                    operator_statistics_result[rarity][`mod`].rank1++
                    operator_statistics_result["total"][`mod${type}`].rank1++
                    operator_statistics_result["total"][`mod`].rank1++
                }
                if (item[`mod${type}`] === 2) {
                    operator_statistics_result[rarity][`mod${type}`].rank2++
                    operator_statistics_result[rarity][`mod`].rank2++
                    operator_statistics_result["total"][`mod${type}`].rank2++
                    operator_statistics_result["total"][`mod`].rank2++
                }
                if (item[`mod${type}`] === 3) {
                    operator_statistics_result[rarity][`mod${type}`].rank3++
                    operator_statistics_result[rarity][`mod`].rank3++
                    operator_statistics_result["total"][`mod${type}`].rank3++
                    operator_statistics_result["total"][`mod`].rank3++
                }
            }

            //统计干员练度消耗理智情况
            if(rarity<5) continue;
            const item_cost = getOperatorItemCost(item.charId, item.rarity, zone_ranks, item)
            const {ap_cost_count} = getItemList(item_cost);
            item.apCost = ap_cost_count
            operator_statistics_result.max.push(item)
        }
    }

    //将未持有干员根据星级倒序
    operator_statistics_result.total.notOwn.sort((a, b) => {
        return b.rarity - a.rarity
    })

    //所有干员的消耗理智根据星级倒序
    operator_statistics_result.max.sort((a, b) => {
        return b.apCost - a.apCost
    })

    //选择练度最高的十位
    operator_statistics_result.max = operator_statistics_result.max.slice(0, 10)


    return operator_statistics_result
}


function operatorPlanCal(operator_data,operator_plan){



    // 更新练度计划的材料明细集合
    let item_cost_count = {};

    //计算练度计划的材料消耗
    for(const char_id in operator_plan){
        if(!operator_data[char_id]) continue
      const item_cost =   getOperatorItemCost(char_id,operator_plan[char_id].rarity,
          operator_data[char_id],operator_plan[char_id])
        // 更新练度计划的材料明细集合
        for (let id in item_cost) {
            updateItemCostCount(item_cost_count, id, item_cost[id].count)
        }
    }

    //计算练度计划的材料明细集合
    const {item_list, ap_cost_count} = getItemList(item_cost_count)

    return {
        itemList: item_list, apCostCount: ap_cost_count, itemMap: item_cost_count
    }
}

/**
 * 按材料等级拆分材料
 * @param highest_rarity 最高材料等级 int
 * @param item_cost_obj 材料消耗原始数据 obj
 * @returns {[][]} item_list 材料消耗表 arr
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
                    let {itemCost} = composite_table[product_id];//材料的合成列表

                    for (const cost of itemCost) {
                        // const material_name = composite_list_element.name;  //合成原料名称
                        const material_id = cost.id;  //合成原料id
                        const material_count = cost.count;  //合成原料总数
                        let new_item = item_count[material_id];
                        // 如果没有这个材料添加一个
                        if (new_item == void 0) {
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

    const {item_list} = getItemList(item_count)


    return item_list
}

export default {
    calAPCost, splitMaterial, operatorStatistics , operatorPlanCal
}