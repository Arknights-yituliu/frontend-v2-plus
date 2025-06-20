import OPERATOR_ITEM_COST_TABLE from "/src/static/json/operator/operator_item_cost_table.json";
import LEVEL_COST_TABLE from "/src/static/json/operator/level_cost_table.json";
import COMPOSITE_TABLE from "/src/static/json/operator/composite_table.json";
import deepClone from "/src/utils/deepClone.js";
import {getStageConfig} from "@/utils/user/userConfig.js";
import itemCache from "@/plugins/indexedDB/itemCache.js";
import compositeTableJson from '/src/static/json/material/composite_table.v2.json'


const stageConfig = getStageConfig()
let compositeTable = {}
for (const item of compositeTableJson) {
    const {itemId, resolve, pathway, rarity} = item
    compositeTable[itemId] = {resolve, pathway, rarity}
}

const itemInfoMap = new Map()

async function getItemInfoMap() {
    const itemList = await itemCache.getItemValueCacheByConfig(stageConfig)
    let map = new Map()
    for (const item of itemList) {
        map.set(item.itemId, item)
        itemInfoMap.set(item.itemId, item)
    }

    return map
}

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
 *

 * @param current 当前干员练度
 * @param target 目标干员练度
 * @param itemInfoMap
 * @returns {{}}
 */
function getOperatorItemCost(current, target, itemInfoMap) {

    const charId = target.charId
    const rarity = target.rarity

    const itemCostLog = []

    let itemCost = {}
    //解构当前练度属性
    const currentElite = current.elite
    const currentLevel = current.level
    const currentMainSkill = current.mainSkill
    const currentSkill1 = current.skill1
    const currentSkill2 = current.skill2
    const currentSkill3 = current.skill3
    const currentModX = current.modX
    const currentModY = current.modY
    const currentModD = current.modD

    const name = target.name

    const targetElite = target.elite
    const targetLevel = target.level
    const targetMainSkill = target.mainSkill
    const targetSkill1 = target.skill1
    const targetSkill2 = target.skill2
    const targetSkill3 = target.skill3
    const targetModX = target.modX
    const targetModY = target.modY
    const targetModD = target.modD

    debug("获取材料消耗时，传入的干员对象", target, target)

    let apCost = 0

    // 查不到干员返回空对象
    if (OPERATOR_ITEM_COST_TABLE[charId] === void 0) return {};
    //id对应的干员信息
    const operatorItemCost = OPERATOR_ITEM_COST_TABLE[charId];
    //解构出通用技能和专精技能的材料消耗
    const {allSkill, skills} = OPERATOR_ITEM_COST_TABLE[charId];

    //计算干员升级消耗
    const levelApCost = getLevelUpCostByRarityV2({rarity,
        currentElite: currentElite, currentLevel: currentLevel,
        targetElite: targetElite, targetLevel: targetLevel});


    debug("干员原始消耗", target, operatorItemCost)


    // console.log(name,'狗粮：',levelApCost["2003"]*1000,'龙门币：',levelApCost["4001"])

    itemCostLog.push({"itemName": "经验书", "itemId": "2003", "num": levelApCost["2003"] * 1000})
    itemCostLog.push({"itemName": "龙门币", "itemId": "4001", "num": levelApCost["4001"]})

    // apCost+=itemInfoMap.get("4001").itemValue*levelApCost["4001"]
    // apCost+=itemInfoMap.get("2003").itemValue*levelApCost["2003"]


    //统计材料消耗
    for (const itemId in levelApCost) {
        let count = levelApCost[itemId];
        _addItemCost(itemId, count)
    }

    // 下面的是计算从当前练度到目标练度的消耗
    // 精英化消耗的材料
    itemCostLog.push({"itemName": "精英化", "itemId": 0, "num": 0})

    for (let e = currentElite; e <= targetElite; e++) {
        const costList = operatorItemCost.elite[e]
        debug(`精英消耗`, target, costList)
        for (let itemId in costList) {

            let count = operatorItemCost.elite[e][itemId];
            _addItemCost(itemId, count)
            debug(`精英等级${e}`, target, itemId, count)

            itemCostLog.push({"itemName": itemInfoMap.get(itemId).itemName, "itemId": itemId, "num": count})
            // apCost+=itemInfoMap.get(itemId).itemValue*count
        }
    }


    itemCostLog.push({"itemName": "主技能", "itemId": 0, "num": 0})

    // 通用技能消耗的材料
    for (let mainSkillRank = currentMainSkill; mainSkillRank <= targetMainSkill; mainSkillRank++) {
        if (mainSkillRank < 2) {
            continue
        }
        const list = allSkill[mainSkillRank - 2]
        for (let itemId in list) {
            let count = list[itemId];
            _addItemCost(itemId, count)
            debug(`主技能等级${mainSkillRank}`, target, itemId, count)

            itemCostLog.push({"itemName": itemInfoMap.get(itemId).itemName, "itemId": itemId, "num": count})
        }
    }

    _statisticsSkills(0, currentSkill1, targetSkill1)
    _statisticsSkills(1, currentSkill2, targetSkill2)
    _statisticsSkills(2, currentSkill3, targetSkill3)

    // debug("11111", target, currentSkill2, targetSkill2)

    function _statisticsSkills(index, currentSkill, targetSkill) {
        const list = skills[index]
        if (!list) {
            return
        }

        itemCostLog.push({"itemName": `技能-${index + 1}专精`, "itemId": 0, "num": 0})

        debug("干员专精的消耗", target, `技能${index + 1}`, list)

        for (let i = currentSkill; i < targetSkill; i++) {

            const itemCost = list[i]
            for (const id in itemCost) {
                const count = itemCost[id]
                debug("干员专精每级的消耗", target, id, count)
                _addItemCost(id, count)

                itemCostLog.push({"itemName": itemInfoMap.get(id).itemName, "itemId": id, "num": count})
            }
        }

    }


    _statisticsEquip('X', currentModX, targetModX)
    _statisticsEquip('Y', currentModY, targetModY)
    _statisticsEquip('D', currentModD, targetModD)

    function _statisticsEquip(type, currentEquipRank, targetEquipRank) {
        if (!operatorItemCost[`mod${type}`]) {
            return;
        }

        itemCostLog.push({"itemName": `模组-${type}专精`, "itemId": 0, "num": 0})

        const list = operatorItemCost[`mod${type}`]

        debug("干员模组消耗", target, `mod${type}`, list)
        for (let i = currentEquipRank; i < targetEquipRank; i++) {
            const itemCost = list[i]
            for (let id in itemCost) {
                let count = itemCost[id];
                debug("干员模组每级的消耗", target, id, count)
                _addItemCost(id, count)


                if (itemInfoMap.get(id)) {
                    itemCostLog.push({"itemName": itemInfoMap.get(id).itemName, "itemId": id, "num": count})
                }
            }
        }
    }

    function _addItemCost(id, count) {
        if (!itemInfoMap.has(id)) {
            return;
        }

        const {rarity, itemName, itemValue} = itemInfoMap.get(id)
        let lastCount = 0;
        if (itemCost[id]) {
            lastCount = itemCost[id].count
        }

        itemCost[id] = {
            id: id,
            rarity: rarity,
            name: itemName,
            count: lastCount + count,
            itemValue: itemValue
        }
    }

    // console.table(itemCostLog)
    // console.table(itemCost)

    return itemCost;
}


const operatorMaxLevelTable = {
    6: {elite0MaxLevel: 50, elite1MaxLevel: 80, elite2MaxLevel: 90},
    5: {elite0MaxLevel: 50, elite1MaxLevel: 70, elite2MaxLevel: 80},
    4: {elite0MaxLevel: 45, elite1MaxLevel: 60, elite2MaxLevel: 70},
    3: {elite0MaxLevel: 40, elite1MaxLevel: 55, elite2MaxLevel: 0},
    2: {elite0MaxLevel: 30, elite1MaxLevel: 0, elite2MaxLevel: 0},
    1: {elite0MaxLevel: 30, elite1MaxLevel: 0, elite2MaxLevel: 0}
}

const operatorEliteCostTable = {
    6: {elite1Cost: 30000, elite2Cost: 180000},
    5: {elite1Cost: 20000, elite2Cost: 120000},
    4: {elite1Cost: 15000, elite2Cost: 60000},
    3: {elite1Cost: 10000, elite2Cost: 0},
    2: {elite1Cost: 0, elite2Cost: 0},
    1: {elite1Cost: 0, elite2Cost: 0},
}


// console.table(getLevelUpCostByRarityV2({rarity:6, currentElite: 0, currentLevel: 0, targetElite: 2, targetLevel: 90}))


/**
 *
 * @param rarity 星级
 * @param currentElite 当前精英等级
 * @param currentLevel 当前等级
 * @param targetElite 目标精英等级
 * @param targetLevel 目标等级
 * @returns {{"4001": number, "2003": number}}
 */
function getLevelUpCostByRarityV2({rarity, currentElite, currentLevel, targetElite, targetLevel}) {

    let levelCost = {
        "4001": 0, "2003": 0
    }

    if (!operatorMaxLevelTable[rarity]) return {
        level_cost: levelCost
    };

    const {elite0MaxLevel, elite1MaxLevel, elite2MaxLevel,} = operatorMaxLevelTable[rarity]
    let totalGold = 0;
    let totalExp = 0;


    // 辅助函数：获取某个阶段的等级上限
    function _getMaxLevel(eliteLevel) {
        if (eliteLevel === 0) return elite0MaxLevel;
        else if (eliteLevel === 1) return elite1MaxLevel;
        else return elite2MaxLevel; // 阶段2无上限
    }

    // 辅助函数：累加某阶段中一段等级区间的消耗
    function _addCostBetween(eliteLevel, fromLevel, toLevel) {
        const eliteKey = `elite${eliteLevel}`;
        let levelCostTable = LEVEL_COST_TABLE[eliteKey]
        let total = 0
        if (fromLevel < 1) {
            fromLevel = 1
        }
        for (let level = fromLevel; level < toLevel; level++) {
            total += levelCostTable[level].gold
            // console.log(`精英${eliteLevel}，等级${level}、gold+${levelCostTable[level].gold}、exp+${levelCostTable[level].exp},总计${total}`)
            totalGold += levelCostTable[level].gold;
            totalExp += levelCostTable[level].exp;
        }
    }



    // 循环遍历每个阶段
    for (let elite = currentElite; elite <= targetElite; elite++) {

        const maxLevelInThisElite = _getMaxLevel(elite);
        let startLevel = 1;
        let endLevel = maxLevelInThisElite;

        // 如果是第一个阶段（即 currentElite）
        if (elite === currentElite) {
            startLevel = currentLevel;
        }

        // 如果是最后一个阶段（即 targetElite）
        if (elite === targetElite) {
            endLevel = Math.min(targetLevel, maxLevelInThisElite);
        }

        // 如果该阶段最大等级为0（如2星以下精英阶段1），跳过
        if (maxLevelInThisElite === 0) continue;



        // 添加这一阶段内的经验与金币消耗
        if (endLevel > startLevel) {

            _addCostBetween(elite, startLevel, endLevel);
        }

        // 如果进入下一阶段，判断是否要添加跃迁费用
        if (elite < targetElite) {
            if (elite === 0) {
                // 从阶段0到阶段1的额外费用
                totalGold += operatorEliteCostTable[rarity].elite1Cost;
            } else if (elite === 1) {
                // 从阶段1到阶段2的额外费用
                totalGold += operatorEliteCostTable[rarity].elite2Cost;
            }
        }
    }

    totalExp = totalExp/1000;


    levelCost = {
        "4001": totalGold,
        "2003": totalExp
    }
    return levelCost
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

    if (!operatorMaxLevelTable[rarity]) return {
        level_cost
    };

    const {elite0, elite1, elite2} = LEVEL_COST_TABLE
    const {elite0MaxLevel, elite1MaxLevel} = operatorMaxLevelTable[rarity]

    let current_level_0 = current_elite === 0 ? current_level : 0;
    let current_level_1 = current_elite === 1 ? current_level : 0;
    let current_level_2 = current_elite === 2 ? current_level : 0;
    if (current_elite > 0) current_level_0 = elite0MaxLevel
    if (current_elite > 1) current_level_1 = elite1MaxLevel

    let target_level_0 = target_elite === 0 ? target_level : 0;
    let target_level_1 = target_elite === 1 ? target_level : 0;
    let target_level_2 = target_elite === 2 ? target_level : 0;
    if (target_elite > 0) target_level_0 = elite0MaxLevel
    if (target_elite > 1) target_level_1 = elite1MaxLevel


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


    if (rarity > 2 && target_elite > 0) {
        if (current_elite < 1) {
            level_cost["4001"] += 5000 * (rarity - 1);
        }

        if (current_elite < 2 && target_elite > 1) {
            level_cost["4001"] += 60000 * (rarity - 3);
        }
    }


    level_cost["2003"] = level_cost["2003"] / 1000


    return level_cost;
}


async function statisticsOperatorInfo(operatorList) {
    const itemInfoMap = await getItemInfoMap()
    // console.log(itemInfoMap)
    // console.log(operatorList)

    // operatorList = operatorList.filter(item => item.charId === "char_4193_lemuen")

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


            const itemCost = getOperatorItemCost(InitialRanks, operator, itemInfoMap)
            debug("统计方法调用获取材料方法后返回的干员的材料消耗", operator, itemCost)


            const apCost = _calcApCost(itemCost);


            operator.apCost = apCost;

            statisticalData.apCostCount += apCost;
        }


        statisticalData.itemCostCollect = itemCostCollect

        // console.table(logs)
        // console.table(itemCostCollect.T5)
        // console.table(itemCostCollect.T4)
        // console.table(itemCostCollect.T3)

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
                const {id, name, rarity, itemValue, count} = item
                apCost += (itemValue * count)
                const tier = `T${rarity}`


                if (!itemCostCollect[tier][itemId]) {
                    itemCostCollect[tier][itemId] = item
                } else {
                    itemCostCollect[tier][itemId] = {
                        id: id,
                        rarity: rarity,
                        name: name,
                        count: itemCostCollect[tier][itemId].count + count,
                        itemValue: itemValue
                    }
                }
            }


            return apCost

        }

        statisticalData.logs = logs

        // console.log(statisticalData)

        return statisticalData

    } catch (error) {
        console.log(error)
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
        const higherTier = `T${t}`
        const lowerTier = `T${t - 1}`
        for (const itemId in newCollect[higherTier]) {
            const t5Item = newCollect[higherTier][itemId]
            const t5ItemCount = t5Item.count
            const compositeTableElement = compositeTable[itemId];
            if (!compositeTableElement) {
                continue
            }

            const {pathway, rarity} = compositeTableElement
            for (const item of pathway) {
                const needCount = item.count
                const needItemId = item.itemId
                if (!newCollect[lowerTier][needItemId]) {
                    newCollect[lowerTier][needItemId] = {
                        id: needItemId,
                        count: 0
                    }
                }
                let t4ItemCount = newCollect[lowerTier][needItemId].count;
                t4ItemCount = t4ItemCount ? t4ItemCount : 0
                newCollect[lowerTier][needItemId].count = t4ItemCount + needCount * t5ItemCount
                newCollect[higherTier][itemId].count = 0
                // console.log(itemInfoMap.get(itemId).itemName, ':', value, '*', item.count, '==', itemInfoMap.get(item.itemId).itemName, '--->', copyMap.get(item.itemId))
            }
        }
    }


    // console.log("拆分后材料消耗：", newCollect)
    const {T5, T4, T3, T2, T1} = newCollect
    return [T5, T4, T3, T2, T1]
}


function debug(breakpoint, operator, value1, value2, value3) {
    const {name} = operator
    // return

    // console.log('debug',breakpoint, ' {} ', name, ' {} ', value1, ' {} ', value2, ' {} ', value3)
}

export {
    InitialRanks, splitMaterialByTier, statisticsOperatorInfo
}