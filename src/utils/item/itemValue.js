import { getStageDropCollect } from "@/plugins/indexedDB/penguinData.js";
import ITEM_INFO from "@/static/json/material/item_info.json";
import ITEM_SERIES_INFO from '/src/static/json/material/item_series_info.json';
import COMPOSITE_TABLE from '/src/static/json/material/composite_table.v2.json';
import { itemSeriesInfoByItemId } from "/src/utils/item/itemSeries.js";

/**
 * @typedef {Object} ItemInfo
 * @property {string} itemId - 物品 ID
 * @property {string} itemName - 物品名称
 * @property {number} itemValue - 物品价值
 * @property {number} rarity - 物品稀有度
 * @property {number} weight - 物品权重
 */

/**
 * @typedef {Object} StageDropInfo
 * @property {string} stageId - 作战 ID
 * @property {string} stageCode - 作战名称
 * @property {number} apCost - 理智消耗
 * @property {number} quantity - 掉落数
 * @property {number} times - 样本数
 */


/**
 * 判断物品是否为精英材料
 * 直接使用物品 ID 判断，不一定准确
 * @param {string} item_id 物品 ID
 * @return {boolean} 是否为精英材料
 */
function isEliteMaterial(item_id) {
    return /^3[01]\d{3}/.test(item_id);
}


/**
 * 物品信息列表，包含物品id、名称、价值、稀有度、权重等信息
 * @type {Array<ItemInfo>}
 */
const itemInfoList = ITEM_INFO.filter(e => e.cardNum < 100);

/**
 * 物品信息映射，key 为物品 ID，value 为物品信息
 * @type {Map<string, ItemInfo>}
 */
const itemInfoMap = new Map(itemInfoList.map(item => [item.itemId, item]));


/**
 * 加工产出副产品时，各种物品作为副产品的概率
 * key 为物品稀有度，value 为副产品概率映射
 * @type {Map<number, Map<string, number>>}
 */
const workshopByproductWeightMap = new Map([
    [1, new Map()],
    [2, new Map()],
    [3, new Map()],
    [4, new Map()],
]);
for (const item of itemInfoList) {
    if (item.weight === 0) {
        continue;  // 通过副产品排除非可加工物品
    }
    workshopByproductWeightMap.get(item.rarity).set(item.itemId, item.weight);
}


// 基础龙门币价值、基础 EXP 价值
const baseLMDValue = 36 / 10000;
const baseEXPValue = 36 / 10000;

/**
 * 公开招募结果的星级概率分布
 * 来源：教捐
 * 详见物品价值算法文档 (https://ark.yituliu.cn/docs/item-value-algorithm#%E6%8B%9B%E8%81%98%E8%AE%B8%E5%8F%AF)
 */
const recruitRarity = {
    "3": 0.7882,
    "4": 0.2027,
    "5": 0.0069,
    "6": 0.0022,
};

/** 公开招募获得的凭证数量 */
const recruitTokenMap = {
    "RECRUITMENT_PERMIT_PRICING_3_4": {
        "3": { "4005": 10, "4004": 0 },
        "4": { "4005": 30, "4004": 1 },
        "5": { "4005": 0, "4004": 5 },
        "6": { "4005": 0, "4004": 10 },
    },
    "RECRUITMENT_PERMIT_PRICING_3_4_5": {
        "3": { "4005": 10, "4004": 0 },
        "4": { "4005": 30, "4004": 1 },
        "5": { "4005": 0, "4004": 13 },
        "6": { "4005": 0, "4004": 10 },
    },
    "RECRUITMENT_PERMIT_PRICING_3_4_5_6": {
        "3": { "4005": 10, "4004": 0 },
        "4": { "4005": 30, "4004": 1 },
        "5": { "4005": 0, "4004": 13 },
        "6": { "4005": 0, "4004": 25 },
    },
};


/**
 * 根据自定义配置计算物品价值表
 * @param stageConfig 自定义参数
 * @return {Promise<Array<ItemInfo>>}
 */
async function getCustomItemList(stageConfig, maxIteration = 50, tolerance = 0.000001) {

    /**
     * 作战效率和主产物（仅包含定价作战集中的作战）
     * key 为作战 ID，value 为作战效率和主产物 ID
     * @type {Map<string, { stageEfficiency: number, mainItemId: string }>}
     */
    const stageDropInfoMap = new Map();

    /**
     * 每系列材料的最高效率作战的作战效率
     * key 为物品系列 ID，
     * value 为定价作战集中，以该系列材料为主产物的最高效率作战和对应的效率
     * @type {Map<string, { stageId: string, stageEfficiency: number }>}
     */
    const maxStageEfficiencyMap = new Map(ITEM_SERIES_INFO.map(series => [series.seriesId, { stageId: "", stageEfficiency: -Infinity }]));


    // 步骤 1. 确定定价作战集和自定义物品价值

    /**
     * 按作战 ID 分组的作战掉落数据
     * - 已排除样本数小于 `stageConfig.sampleSize` 的作战
     * - 已排除 `stageConfig.stageBlacklist` 中的作战
     * - 无论 `stageConfig.useActivityStage` 和 `stageConfig.useActivityAverageStage` 真假，总是包含活动作战，需要进一步手动排除
     * @type {Map<string, Array<StageDropInfo>>}
     */
    const stageDropCollect = await getStageDropCollect(stageConfig, true);
    /**
     * 定价作战集
     * 从 `stageDropCollect` 中筛选出符合定价作战集条件的作战
     * - 已排除样本数小于 `stageConfig.sampleSize` 的作战
     * - 已排除 `stageConfig.stageBlacklist` 中的作战
     * - 若 `stageConfig.useActivityStage` 为假，则已排除所有活动作战
     * - 若 `stageConfig.useActivityAverageStage` 为假，则已排除所有活动平均作战
     */
    const stageDropCollectForPricing = new Map();
    for (const [stageId, dropList] of stageDropCollect) {
        // 提取关卡消耗理智、关卡代号、关卡类型
        const { apCost, stageType } = dropList[0];
        if (['MAIN', 'ACT_PERM'].includes(stageType)) {
            // 主线和常驻活动关卡总是包含在定价作战集中
        }
        if (['ACT', 'ACT_REP'].includes(stageType) && !stageConfig.useActivityStage) {
            continue;  // 如果不使用活动作战定价则跳过
        }
        if ('YTL_VIRTUAL' === stageType && !stageConfig.useActivityAverageStage) {
            continue;  // 如果不使用活动平均作战定价则跳过
        }
        stageDropCollectForPricing.set(stageId, dropList);
    }

    /**
     * 自定义精英材料价值映射，key 为物品 ID，value 为物品价值
     * @type {Map<string, number>}
     */
    const customEliteMaterialValueMap = new Map(stageConfig.customItem.map(item => [item.itemId, item.itemValue]));


    // 步骤 2. 设定初始值
    // - 除已经自定义的蓝材料外，给每种其他蓝材料的价值分别设定初始值。
    // - 给加工绿、蓝、紫、金材料时副产品价值的期望分别设定初始值。

    /**
     * 物品价值映射，key 为物品 ID，value 为物品价值
     * - 精英材料初始价值设为 3 ** rarity，非精英材料初始价值设为 0
     * - 精英材料的初始价值不能太小，否则迭代时会有很多作战的主产物为非精英材料，导致这部分作战永远不会被考虑
     * @type {Map<string, number>}
     */
    const itemValueMap = new Map(itemInfoList.map(({ itemId, rarity }) => [itemId, isEliteMaterial(itemId) ? 3 ** rarity : 0]));

    /**
     * 白、绿、蓝、紫副产品价值的期望，也即一个随机材料的价值
     * key 为副产品稀有度，value 为期望值
     * - 初始值设为 3 ** rarity
     * @type {Map<number, number>}
     */
    const workshopByproductExpectedValue = new Map([
        [1, 3],
        [2, 9],
        [3, 27],
        [4, 81],
    ]);


    // 重复步骤 3、4、5、6、7，迭代计算物品价值，一般 10 次之内就能得出结果
    for (let i = 0; i < maxIteration; i++) {
        // console.log(`第${i + 1}次迭代`);

        // 步骤 7. 计算非精英材料的价值
        calculateCommonItemValue();
        // console.log("itemValueMap", Object.fromEntries(itemValueMap));

        // 步骤 3. 计算所有精英材料的价值
        calculateEliteMaterialValueFromT3();
        // console.log("itemValueMap", Object.fromEntries(itemValueMap));

        // 步骤 4. 计算副产品价值的期望
        calculateWorkshopByproductExpectedValue();
        // console.log("workshopByproductExpectedValue", Object.fromEntries(workshopByproductExpectedValue));

        // 步骤 5. 计算作战期望掉落物品的总价值
        calculateStageDropExpectedValue();
        // console.log("stageDropInfoMap", Object.fromEntries(stageDropInfoMap));

        // 步骤 6. 修正蓝材料的价值
        updateT3EliteMaterialValue();
        // console.log("maxStageEfficiencyMap", Object.fromEntries(maxStageEfficiencyMap));

        // 检查是否满足停机条件
        if (checkCompletion(tolerance)) {
            // 如果满足停机条件，结束迭代
            break;
        }
    }

    // 把物品信息列表中的物品价值更新为计算后的值
    for (const item of itemInfoList) {
        item.itemValue = itemValueMap.get(item.itemId);
    }

    return itemInfoList;

    // ========== 函数结束 ==========

    /**
     * 步骤 3. 计算所有精英材料的价值
     * 在已知所有蓝材料价值的情况下，根据加工配方，计算白、绿、紫、金材料的价值。
     * 思想：所有精英材料配方的消耗总价值等于产出总价值
     *
     * 函数将修改 `itemValueMap` 中的白、绿、紫、金材料价值。
     */
    function calculateEliteMaterialValueFromT3() {
        /** 龙门币价值 */
        const lmdValue = itemValueMap.get("4001");

        for (const table of COMPOSITE_TABLE) {
            // 解构加工路径表：合成或拆解的物品id、判断拆解还是合成、合成路径
            const { itemId, resolve, pathway } = table;

            // 如果这个物品被自定义了，不再通过合成路径得到价值
            if (customEliteMaterialValueMap.has(itemId)) {
                continue;
            }

            // 通过id得到对应的物品信息
            const rarity = itemInfoMap.get(itemId).rarity;

            // 物品新价值
            let newValue = 0.0;

            if (resolve) {
                // 灰、绿色品质是向下拆解   灰、绿色物品 = （蓝物品价值 + 副产品 - 龙门币）/合成蓝物品的所需灰绿物品数量
                const expectProductsValue = workshopByproductExpectedValue.get(rarity) * stageConfig.workshopEliteMaterialByProductRate;
                for (const cost of pathway) {
                    const rawItemValue = itemValueMap.get(cost.itemId);
                    newValue = (rawItemValue + expectProductsValue - 100 * rarity * lmdValue) / cost.count;
                }
            } else {
                // 紫、金色品质是向上合成    紫、金色物品 = 合成所需蓝物品价值之和 + 龙门币 - 副产品
                const expectProductsValue = workshopByproductExpectedValue.get(rarity - 1) * stageConfig.workshopEliteMaterialByProductRate;
                for (const cost of pathway) {
                    const rawItemValue = itemValueMap.get(cost.itemId);
                    newValue += rawItemValue * cost.count;
                }
                newValue += 100 * (rarity - 1) * lmdValue - expectProductsValue;
            }

            // 更新物品新价值
            itemValueMap.set(itemId, newValue);
        }
    }

    /**
     * 步骤 4. 计算副产品价值的期望
     * 使用上一步计算出的所有精英材料的价值，计算加工绿、蓝、紫、金材料时副产品价值的期望。
     *
     * 函数将修改 `workshopByproductExpectedValue`。
     */
    function calculateWorkshopByproductExpectedValue() {

        // 计算按物品等级分类后的加工站各级物品副产品期望产出
        for (const [rarity, group] of workshopByproductWeightMap) {
            let expectValue = 0.0;
            for (const [itemId, weight] of group) {
                expectValue += itemValueMap.get(itemId) * weight;
            }
            // 更新加工站各级物品副产品期望产出
            workshopByproductExpectedValue.set(rarity, expectValue);
        }
    }

    /**
     * 步骤 5. 对于每个作战，计算作战期望掉落物品的总价值，进而计算作战效率。
     * 作战效率 = 作战期望掉落物品的总价值 ÷ 作战的理智消耗
     *
     * 函数将修改 `stageDropInfoMap`。
     */
    function calculateStageDropExpectedValue() {

        // 循环关卡的物品掉落集合，每个集合是根据关卡id分组的
        for (const [stageId, dropList] of stageDropCollectForPricing) {

            // 提取关卡消耗理智
            const { apCost } = dropList[0];

            // 关卡期望产出总理智
            let stageExpectedOutput = 0;

            // 主产物物品id
            // 这里主产物定义为价值占比最高的物品
            let mainItemId;
            // 最高的单项物品产出价值
            let maxValue = -Infinity;

            // 循环关卡的物品掉落集合
            for (const drop of dropList) {

                // 解构出物品id，掉落次数，样本数
                const { itemId, quantity, times } = drop;

                // 从物品表里面取出对应掉落物的信息
                const itemValue = itemValueMap.get(itemId);

                // 如果查不到物品信息则跳过
                if (!itemValue) {
                    continue;
                }

                // 计算物品掉率
                const knockRating = quantity / times;

                // 计算单项物品期望产出价值
                const expectedOutput = knockRating * itemValue;

                // 比较单项物品最大产出，最大的为主产物
                if (expectedOutput > maxValue) {
                    mainItemId = itemId;
                    maxValue = expectedOutput;
                }

                // 计算关卡期望产出总理智
                stageExpectedOutput += expectedOutput;
            }

            stageDropInfoMap.set(stageId, {
                stageEfficiency: stageExpectedOutput / apCost,
                mainItemId: mainItemId,
            });
        }
    }

    /**
     * 步骤 6. 修正蓝材料的价值
     *
     * 思想：
     * 1. 定价作战集中的所有作战效率 ≤ 1；
     * 2. 对于每一系列材料，在定价作战集中至少存在 1 个以该系列材料为主产物且效率等于 1 的作战。
     *
     * 固定一类材料，在定价作战集中寻找以该系列材料为主产物的所有作战，取其中作战效率最高的那个作战，作战效率记为 E。然后把对应的蓝材料的价值进行修正，将对应蓝材料的价值除以 E，得到新的价值。
     * 这个步骤需要对每系列材料都做一遍（除了已经在步骤 1 自定义价值的材料）。
     *
     * 函数将修改 `maxStageEfficiencyMap` 与 `itemValueMap` 中的蓝材料价值。
     */
    function updateT3EliteMaterialValue() {

        // 先清空 maxStageEfficiencyMap
        for (const seriesId of maxStageEfficiencyMap.keys()) {
            maxStageEfficiencyMap.set(seriesId, { stageId: "", stageEfficiency: -Infinity });
        }

        // 遍历所有作战
        for (const [stageId, { stageEfficiency, mainItemId }] of stageDropInfoMap) {

            // 查询这个关卡的主产物是否是精英材料
            if (!itemSeriesInfoByItemId.has(mainItemId)) {
                continue;  // 如果不是精英材料则跳过
            }

            // 获取精英材料对应系列的信息  如凝胶系为[凝胶、聚合凝胶]
            const seriesInfo = itemSeriesInfoByItemId.get(mainItemId);

            // 物品系列的id和名称
            const { seriesId } = seriesInfo;

            // 该系列材料的最高作战效率
            const currentMaxStageEfficiency = maxStageEfficiencyMap.get(seriesId).stageEfficiency;

            if (stageEfficiency > currentMaxStageEfficiency) {
                // 如果当前作战效率大于该系列材料的最高效率，则更新最高效率
                maxStageEfficiencyMap.set(seriesId, { stageId, stageEfficiency });
            }
        }

        // 更新蓝材料的价值
        for (const [seriesId, { stageId, stageEfficiency }] of maxStageEfficiencyMap) {

            // 获取该系列蓝材料的物品 ID，蓝材料物品 ID 就是系列 ID
            const itemIdT3 = seriesId;

            // 获取该系列蓝材料之前的价值
            const itemValueT3 = itemValueMap.get(itemIdT3);

            // 更新蓝材料的价值
            itemValueMap.set(itemIdT3, itemValueT3 / stageEfficiency);
        }

        // 将自定义精英材料价值写入物品价值映射
        for (const [itemId, itemValue] of customEliteMaterialValueMap) {
            itemValueMap.set(itemId, itemValue);
        }
    }


    /**
     * 步骤 7. 计算非精英材料的价值
     */
    function calculateCommonItemValue() {
        // 龙门币
        const itemValue4001 = stageConfig.lmdCoefficient * baseLMDValue;
        // EXP
        const itemValueEXP = stageConfig.expCoefficient * baseEXPValue;
        const itemValue2001 = itemValueEXP * 200;
        const itemValue2002 = itemValueEXP * 400;
        const itemValue2003 = itemValueEXP * 1000;
        const itemValue2004 = itemValueEXP * 2000;
        // 无人机
        const itemValueBaseAp = itemValueEXP * 50 / 3;
        // 赤金
        const itemValue3003 = itemValueBaseAp * 24;

        // 合成玉
        let itemValue4003;
        switch (stageConfig.orundumPricingStrategy) {
            case "ORUNDUM_PRICING_ORININUM_FARMING_ORIROCK_CUBE":
                itemValue4003 = (itemValueMap.get("30012") * 2 + 1600 * itemValue4001 + 40 * itemValueBaseAp) / 10; break;
            case "ORUNDUM_PRICING_ORININUM_FARMING_DEVICE":
                itemValue4003 = (itemValueMap.get("30062") + 1000 * itemValue4001 + 40 * itemValueBaseAp) / 10; break;
            default:
                itemValue4003 = stageConfig.orundumValue;
        }
        // 至纯源石
        let itemValue4002;
        if (stageConfig.originitePrimeCoefficient === Infinity) {
            itemValue4002 = Infinity;
        } else {
            itemValue4002 = stageConfig.originitePrimeCoefficient * itemValue4003;
        }
        // 寻访凭证
        const itemValue7003 = 600 * itemValue4003;
        // 十连寻访凭证
        const itemValue7004 = 10 * itemValue7003;
        // 资质凭证价值根据经验法则定价为 0.8
        const itemValue4005 = 0.8;
        // 高级凭证
        const itemValue4004 = 38 / 258 * itemValue7003;
        // 中坚寻访凭证
        let itemValueClassicGacha;
        if (stageConfig.kernelHeadhuntingPermitCoefficient === 0) {
            itemValueClassicGacha = 0;
        } else {
            itemValueClassicGacha = stageConfig.kernelHeadhuntingPermitCoefficient * itemValue7003;
        }
        // 十连中坚寻访凭证
        const itemValueClassicGacha10 = 10 * itemValueClassicGacha;

        // 招聘许可
        let itemValue7001 = 0;
        if (itemValue4004 === Infinity) {
            itemValue7001 = Infinity;
        }
        else {
            for (const [rarity, recruitToken] of Object.entries(recruitTokenMap[stageConfig.recruitmentPermitPricingStrategy])) {
                itemValue7001 += recruitRarity[rarity] * (recruitToken["4005"] * itemValue4005 + recruitToken["4004"] * itemValue4004);
            }
        }
        // 加急许可
        let itemValue7002;
        switch (stageConfig.expeditedPlanPricingStrategy) {
            case "EXPEDITED_PLAN_PRICING_RECRUITMENT_PERMIT":
                itemValue7002 = itemValue7001; break;
            default:
                itemValue7002 = stageConfig.expeditedPlanValue;
        }
        // 家具零件
        // TODO: 按 SK-5 定价
        const itemValue3401 = stageConfig.furniturePartValue;

        // 采购凭证
        const itemValue4006 = 30 * (1 - itemValue4001 * 12) / 21;
        // 芯片助剂
        const itemValue32001 = itemValue4006 * 90;
        // 芯片
        const chip1Value = 18 * (1 - itemValue4001 * 12);
        // 芯片组
        const chip2Value = 36 * (1 - itemValue4001 * 12);
        // 双芯片
        const chip3Value = chip2Value * 2 + itemValue32001 + 1 / 180 * itemValueBaseAp;
        // 模组数据块
        let itemValueModUnlockToken;
        switch (stageConfig.modUnlockTokenPricingStrategy) {
            case "MOD_UNLOCK_TOKEN_PRICING_PURCHASE_CERTIFICATE":
                itemValueModUnlockToken = 120 * itemValue4006; break;
            case "MOD_UNLOCK_TOKEN_PRICING_DISTINCTION_CERTIFICATE":
                itemValueModUnlockToken = 20 * itemValue4004; break;
            case "MOD_UNLOCK_TOKEN_PRICING_CUSTOM":
                itemValueModUnlockToken = stageConfig.modUnlockTokenValue; break;
        }
        // 事相碎片
        const itemValueSTORYREVIEWCOIN = 20 * itemValue4006;

        const t3workShopProductsValue = workshopByproductExpectedValue.get(3);
        // 因果
        const itemValueYinGuo = 10 / 9 * (1 - stageConfig.workshopEliteMaterialByProductRate) * t3workShopProductsValue / 36;
        // 碳素组
        const itemValue3114 = 240 / 19 * itemValue3401 + 4 * itemValueYinGuo - 4000 / 19 * itemValue4001;
        const itemValue3113 = 11 / 30 * itemValue3114 + 6 / 5 * itemValueYinGuo;
        const itemValue3112 = 11 / 30 * itemValue3113 + 3 / 5 * itemValueYinGuo;

        // 技巧概要·卷3
        const itemValue3303 = (30 * (1 - itemValue4001 * 12)
            / (2 + 3 / 2 * (1 + stageConfig.workshopSkillSummaryByProductRate) / 3 + 1.5 * (1 + stageConfig.workshopSkillSummaryByProductRate) ** 2 / 3 ** 2));

        // 技能概要·卷2
        const itemValue3302 = (1 + stageConfig.workshopSkillSummaryByProductRate) * itemValue3303 / 3;
        // 技能概要·卷1
        const itemValue3301 = (1 + stageConfig.workshopSkillSummaryByProductRate) * itemValue3302 / 3;

        // 回写物品价值
        itemValueMap.set("4003", itemValue4003);
        itemValueMap.set("4002", itemValue4002);
        itemValueMap.set("7003", itemValue7003);
        itemValueMap.set("7004", itemValue7004);
        itemValueMap.set("4005", itemValue4005);
        itemValueMap.set("4004", itemValue4004);
        itemValueMap.set("classic_gacha", itemValueClassicGacha);
        itemValueMap.set("classic_gacha_10", itemValueClassicGacha10);
        itemValueMap.set("3401", itemValue3401);
        itemValueMap.set("7002", itemValue7002);
        itemValueMap.set("4001", itemValue4001);
        itemValueMap.set("2001", itemValue2001);
        itemValueMap.set("2002", itemValue2002);
        itemValueMap.set("2003", itemValue2003);
        itemValueMap.set("2004", itemValue2004);
        itemValueMap.set("base_ap", itemValueBaseAp);
        itemValueMap.set("3003", itemValue3003);
        itemValueMap.set("4006", itemValue4006);
        itemValueMap.set("32001", itemValue32001);
        itemValueMap.set("mod_unlock_token", itemValueModUnlockToken);
        itemValueMap.set("STORY_REVIEW_COIN", itemValueSTORYREVIEWCOIN);
        itemValueMap.set("3114", itemValue3114);
        itemValueMap.set("3113", itemValue3113);
        itemValueMap.set("3112", itemValue3112);
        itemValueMap.set("3303", itemValue3303);
        itemValueMap.set("3302", itemValue3302);
        itemValueMap.set("3301", itemValue3301);
        itemValueMap.set("7001", itemValue7001);

        const chipIdList = ["3211", "3221", "3231", "3241", "3251", "3261", "3271", "3281"];
        const chipPackIdList = ["3212", "3222", "3232", "3242", "3252", "3262", "3272", "3282"];
        const dualChipIdList = ["3213", "3223", "3233", "3243", "3253", "3263", "3273", "3283"];

        for (const chipId of chipIdList) {
            itemValueMap.set(chipId, chip1Value);
        }
        for (const chipId of chipPackIdList) {
            itemValueMap.set(chipId, chip2Value);
        }
        for (const chipId of dualChipIdList) {
            itemValueMap.set(chipId, chip3Value);
        }
    }


    /**
     * 检查是否满足停机条件
     * 停机条件：对于每种未自定义价值的蓝材料，定价作战集中以该系列材料为主产物的最高效率作战的作战效率在 (1 - tolerance, 1 + tolerance) 之间。
     * @returns {boolean} 是否满足停机条件
     */
    function checkCompletion(tolerance) {
        return ITEM_SERIES_INFO.every(({ seriesId }) => (
            customEliteMaterialValueMap.has(seriesId)  // 已经自定义的蓝材料不需要检查
            || Math.abs(maxStageEfficiencyMap.get(seriesId).stageEfficiency - 1) < tolerance
        ));
    }
}


export { getCustomItemList };
