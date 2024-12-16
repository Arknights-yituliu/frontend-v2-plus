import OPERATOR_ITEM_COST_TABLE from "/src/static/json/survey/operator_item_cost_table.json";
import LEVEL_COST_TABLE from "/src/static/json/survey/level_cost_table.json";
import COMPOSITE_TABLE from "/src/static/json/survey/composite_table.json";
import ITEM_TABLE from "/src/static/json/survey/item_table.json";
import deepClone from "/src/utils/deepClone.js";

// 初始练度
const InitialRanks = {
    elite: 0,
    level: 0,
    mainSkill: 0,
    skill1: 0,
    skill2: 0,
    skill3: 0,
    modX: 0,
    modY: 0,
    modD: 0
}

/**
 * 计算干员消耗材料
 * @param operatorTable 干员列表
 * @returns {{apCostCount: number, itemList: [], itemMap: {}}} 理智消耗总量，物品列表，物品列表
 */
function calAPCost(operatorTable) {

    let itemCostCount = {};

    // 计算已持有干员用掉的材料总和
    for (let charId in operatorTable) {
        const operator = operatorTable[charId];
        // 获得每个干员的材料消耗
        const item_cost = getOperatorItemCost(operator.charId, operator.rarity, InitialRanks, operator)
        //将材料消耗情况进行统计
        for (let id in item_cost) {
            updateItemCostCount(itemCostCount, id, item_cost[id].count)
        }

    }

    //计算已持有干员用掉的材料明细集合
    const {itemList, apCost} = getItemList(itemCostCount)

    return {
        itemList: itemList, apCostCount: apCost, itemMap: itemCostCount
    }
}


/**
 *
 * @param charId 干员id
 * @param rarity 干员星级
 * @param current 当前干员练度
 * @param target 目标干员练度
 * @returns {{}}
 */
function getOperatorItemCost(charId, rarity, current, target) {


    let itemCost = {}
    //解构当前练度属性
    const currentElite = current.elite
    const currentLevel = current.level
    const currentMainSkill = current.mainSkill
    const currentSkill1 = current.skill1
    const currentSkill2 = current.skill3
    const currentSkill3 = current.skill3
    const currentModX = current.modX
    const currentModY = current.modY
    const currentModD = current.modD

    const name = target.name

    const targetElite = target.elite
    const targetLevel = target.level
    const targetMainSkill = target.mainSkill
    const targetSkill1 = target.skill1
    const targetSkill2 = target.skill3
    const targetSkill3 = target.skill3
    const targetModX = target.modX
    const targetModY = target.modY
    const targetModD = target.modD

    debug("获取材料消耗时，传入的干员对象", target, target)

    // 查不到干员返回空对象
    if (OPERATOR_ITEM_COST_TABLE[charId] === void 0) return {};
    //id对应的干员信息
    const operatorItemCost = OPERATOR_ITEM_COST_TABLE[charId];
    //解构出通用技能和专精技能的材料消耗
    const {allSkill, skills} = OPERATOR_ITEM_COST_TABLE[charId];
    //计算干员升级消耗
    const levelApCost = getLevelUpCostByRarity(rarity,
        {current_elite: currentElite, current_level: currentLevel},
        {target_elite: targetElite, target_level: targetLevel});

    debug("干员原始消耗", target, operatorItemCost)


    // console.log(name,'狗粮：',levelApCost["2003"]*1000,'龙门币：',levelApCost["4001"])

    //统计材料消耗
    for (const itemId in levelApCost) {
        let count = levelApCost[itemId];
        _addItemCost(itemId, count)
    }

    // 下面的是计算从当前练度到目标练度的消耗
    // 精英化消耗的材料

    for (let e = currentElite; e <=targetElite; e++) {
        const costList =  operatorItemCost.elite[e]
        debug(`精英消耗`, target,costList)
        for (let itemId in costList) {

            let count = operatorItemCost.elite[e][itemId];
            _addItemCost(itemId, count)
            debug( `精英'+${e}`, target,itemId,count)
        }
    }

    // 通用技能消耗的材料
    for (let i = currentMainSkill; i < targetMainSkill; i++) {
        for (let itemId in allSkill[i]) {
            let count = allSkill[i][itemId];
            _addItemCost(itemId, count)
            // console.log(name,'技能'+i,"消耗：",itemId+'X.'+count)
        }
    }

    // 技能专精消耗的材料
    const currentSkillRanks = [currentSkill1, currentSkill2, currentSkill3]
    const targetSkillRanks = [targetSkill1, targetSkill2, targetSkill3]
    debug("干员从当前到目标练度的消耗", target, currentSkillRanks, targetSkillRanks)
    for (let index in currentSkillRanks) {
        debug("干员当前技能专精的消耗", target, skills[index])
        for (let rank = currentSkillRanks[index]; rank < targetSkillRanks[index]; rank++) {
            debug("干员当前技能专精每级的消耗", target, rank, skills[index])
            for (let itemId in skills[index][rank]) {
                let count = skills[index][rank][itemId];
                _addItemCost(itemId, count)
                // console.log(name, index + '技能专精' + rank, "消耗：", itemId + 'X.' + count)
            }
        }
    }

    // 模组升级消耗的材料
    const currentEquipRanks = {"X": currentModX, "Y": currentModY, "D": currentModD}
    const targetEquipRanks = {"X": targetModX, "Y": targetModY, "D": targetModD}
    // debug(target, currentEquipRanks, targetEquipRanks)

    for (const type in currentEquipRanks) {
        if (!operatorItemCost[`mod${type}`]) {
            continue;
        }
        // debug(target, `mod${type}` , operatorItemCost[`mod${type}`])
        for (let i = currentEquipRanks[type]; i < targetEquipRanks[type]; i++) {
            for (let itemId in operatorItemCost[`mod${type}`][i]) {
                let count = operatorItemCost[`mod${type}`][i][itemId];
                // console.log(name,'模组'+type,'等级',i,"消耗：",itemId+' : '+count)
                _addItemCost(itemId, count)
            }
        }
    }

    function _addItemCost(id, count) {
        if (!ITEM_TABLE[id]) {
            return;
        }

        const {rarity, name, itemValueAp} = ITEM_TABLE[id]
        let lastCount = 0;
        if (itemCost[id]) {
            lastCount = itemCost[id].count
        }
        itemCost[id] = {
            id: id,
            rarity: rarity,
            name: name,
            count: lastCount + count,
            itemValueAp: itemValueAp
        }
    }


    return itemCost;
}


/**
 * 将材料消耗情况转为根据材料等级分类的集合
 * @param itemCost 材料效率总和
 * @returns {{itemList:*[][], apCost: number }}  总材料消耗，根据材料等级分类的集合
 */
function getItemList(itemCost) {
    let itemList = [[], [], [], [], []]

    let apCost = 0;

    for (const itemId in itemCost) {
        const item = itemCost[itemId]
        const rarity = item.rarity;
        const itemValueAp = item.itemValueAp
        const count = item.count;
        apCost += (itemValueAp * count)
        itemList[(5 - rarity)].push(item)
    }

    for (let list of itemList) {
        list.sort((a, b) => {
            return b.count - a.count
        })
    }

    return {itemList, apCost}
}


/**
 * 更新材料统计对象的结果
 * @param result 统计对象
 * @param id 材料id
 * @param count 材料消耗总和
 */
function updateItemCostCount(result, id, count) {
    if (!ITEM_TABLE[id]) return;

    if (result[id]) {
        count += result[id].count
    }

    result[id] = {
        id: id,
        name: ITEM_TABLE[id].name,
        rarity: ITEM_TABLE[id].rarity,
        count: count,
        itemValueAp: ITEM_TABLE[id].itemValueAp
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

    const {elite0, elite1, elite2} = LEVEL_COST_TABLE
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


function statisticsOperatorInfo(operatorList) {

    try {

        let logs = []

        if (!operatorList) {
            return void 0;
        }

        let itemCostCollect = {
            "T5": {},
            "T4": {},
            "T3": {},
            "T2": {},
            "T1": {}
        }

        let infoItem = {
            module: 'all',
            own: 0,
            notOwn: 0,
            count: 0,
            elite: {
                rank0: 0,
                rank1: 0,
                rank2: 0,
            },
            skill: {
                rank0: 0,
                rank1: 0,
                rank2: 0,
                rank3: 0,
            },
            equip: {
                rank0: 0,
                rank1: 0,
                rank2: 0,
                rank3: 0,
            },
        }

        let statisticalData = {
            operatorCount: operatorList.length,
            notOwn: [],
            apCostRanking: [],
            itemCostCollect: [],
            itemCostMap: [],
            apCostCount: 0,
            info: [],

        }


        for (const operator of operatorList) {
            //干员信息
            // 解构干员信息
            _statistics(operator, 0)

            if (operator.rarity > 3) {

                _statistics(operator, _checkRarity(operator.rarity))
            }

            const itemCost = getOperatorItemCost(operator.charId, operator.rarity, InitialRanks, operator)
            debug("统计方法调用获取材料方法后返回的干员的材料消耗", operator, itemCost)

            const apCost = _calcApCost(itemCost);


            if (itemCost['30115'] && itemCostCollect.T5['30115']) {
                let log = {charId: operator.charId,name: operator.name, cost: itemCost['30115'].count,count: itemCostCollect.T5['30115'].count}
                logs.push(log)
            }

            operator.apCost = apCost;

            statisticalData.apCostCount += apCost;
        }


        statisticalData.itemCostCollect = itemCostCollect

        console.table(logs)
        console.table(itemCostCollect.T5)
        console.table(itemCostCollect.T4)
        console.table(itemCostCollect.T3)

        statisticalData.notOwn.sort((a, b) => {
            return b.rarity - a.rarity
        })

        operatorList.sort((a, b) => {
            return b.apCost - a.apCost
        })

        statisticalData.apCostRanking = operatorList.slice(0, 10)

        function _statistics(operator, index) {
            const {charId, rarity, own, elite, skill1, skill2, skill3, modX, modY, modD} = operator;

            if (!statisticalData.info[index]) {

                statisticalData.info[index] = deepClone(infoItem);

                statisticalData.info[index].module = _getModule(index);
            }

            statisticalData.info[index].rarity = rarity

            statisticalData.info[index].count++

            if (own) {
                statisticalData.info[index].own++;
            } else {
                if (index === 0) {
                    statisticalData.notOwn.push(operator)
                }
                statisticalData.info[index].notOwn++;
            }

            statisticalData.info[index].elite[`rank${elite}`]++
            statisticalData.info[index].skill[`rank${skill3}`]++
            statisticalData.info[index].skill[`rank${skill1}`]++
            statisticalData.info[index].skill[`rank${skill2}`]++
            statisticalData.info[index].equip[`rank${modX}`]++
            statisticalData.info[index].equip[`rank${modY}`]++
            statisticalData.info[index].equip[`rank${modD}`]++
        }

        function _checkRarity(rarity) {
            switch (rarity) {
                case 6:
                    return 1;
                case 5:
                    return 2;
                case 4:
                    return 3;
            }
        }

        function _getModule(index) {
            switch (index) {
                case 0:
                    return '全部干员';
                case 1:
                    return '六星干员';
                case 2:
                    return '五星干员';
                case 3:
                    return '四星干员';
            }
        }

        /**
         * 将材料消耗情况转为根据材料等级分类的集合

         * @param itemCost 材料效率总和
         * @returns {number}  总材料消耗，根据材料等级分类的集合
         */
        function _calcApCost(itemCost) {

            let apCost = 0;

            for (const itemId in itemCost) {
                const item = itemCost[itemId]
                const {id,name,rarity,itemValueAp,count} = item
                apCost += (itemValueAp * count)
                const tier = `T${rarity}`





                if (!itemCostCollect[tier][itemId]) {
                    itemCostCollect[tier][itemId] = item
                } else {
                    itemCostCollect[tier][itemId] = {
                        id: id,
                        rarity: rarity,
                        name: name,
                        count: itemCostCollect[tier][itemId].count + count,
                        itemValueAp: itemValueAp
                    }
                }
            }


            return apCost

        }

        statisticalData.logs = logs

        return statisticalData

    } catch (error) {
        console.log(error)
    }

}


function operatorPlanCal(operator_data, operator_plan) {

    // 更新练度计划的材料明细集合
    let itemCostDetail = {};

    //计算练度计划的材料消耗
    for (const char_id in operator_plan) {
        if (!operator_data[char_id]) continue
        const item_cost = getOperatorItemCost(char_id, operator_plan[char_id].rarity,
            operator_data[char_id], operator_plan[char_id])
        // 更新练度计划的材料明细集合
        for (let id in item_cost) {
            updateItemCostCount(itemCostDetail, id, item_cost[id].count)
        }
    }

    //计算练度计划的材料明细集合
    const {itemList, apCost} = getItemList(itemCostDetail)

    return {
        itemList: itemList, apCostCount: apCost, itemMap: itemCostDetail
    }
}

/**
 * 按材料等级拆分材料
 * @param tier 最高材料等级 int
 * @param itemCollect 材料消耗原始数据 obj
 * @returns {[]} item_list 材料消耗表 arr
 */
function splitMaterialByTier(tier, itemCollect) {

    let newCollect = deepClone(itemCollect)

    // console.log("材料消耗：", newCollect)
    for (let t = 5; t > tier; t--) {
        // console.log(`tier${tier}`)
        _splitMaterial(t)
    }

    function _splitMaterial(tier) {
        const advancedMaterials = newCollect[`T${tier}`]
        const baseMaterials = newCollect[`T${tier - 1}`]
        // console.log(`T${tier}：`, advancedMaterials)
        // console.log(`T${tier - 1}：`, advancedMaterials)
        for (const itemId in advancedMaterials) {
            const item = advancedMaterials[itemId]

            const productId = item.id   //材料id
            const productCount = item.count; //材料总数

            if (COMPOSITE_TABLE[productId]) {
                //材料的合成列表
                let {itemCost} = COMPOSITE_TABLE[productId];

                for (const cost of itemCost) {
                    const materialId = cost.id;  //合成原料id
                    const materialCount = cost.count;  //合成原料总数
                    if (baseMaterials[materialId]) {
                        let newItem = baseMaterials[materialId];
                        newItem.count += (productCount * materialCount);
                        newCollect[`T${tier - 1}`][materialId] = newItem
                    } else {
                        newCollect[`T${tier - 1}`][materialId] = {
                            count: productCount * materialCount,
                            id: materialId,
                        }
                    }
                }
                newCollect[`T${tier}`][productId] = {
                    count: 0,
                    id: productId,
                }
            }
        }
    }


    // console.log("拆分后材料消耗：", newCollect)
    const {T5, T4, T3, T2, T1} = newCollect
    return [T5, T4, T3, T2, T1]
}


function debug(breakpoint, operator, value1, value2, value3) {

    // return;
    const {name, rarity} = operator
    if (rarity < 6) {
        return
    }

    if('浊心斯卡蒂'!==name){
        return;
    }

    console.log(breakpoint, ' {} ', name, ' {} ', value1, ' {} ', value2, ' {} ', value3)
}

export {
    calAPCost, InitialRanks, splitMaterialByTier, operatorPlanCal, statisticsOperatorInfo
}