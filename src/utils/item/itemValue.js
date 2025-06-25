import ITEM_INFO from "@/static/json/material/item_info.json";
import COMPOSITE_TABLE from '/src/static/json/material/composite_table.v2.json'

import {getStageDropCollect} from "@/plugins/indexedDB/penguinData.js";
import {itemSeriesInfoByItemId} from "/src/utils/item/itemSeries.js";
// import {updateItemInfoWeight} from "/src/utils/item/updateItemInfoWeight.js";


//加工站每级期望产出理智初始值
let workShopProducts = {
    t1: 1.9622015949221407,
    t2: 5.853670784766422,
    t3: 24.578868967312253,
    t4: 79.8592285162492
}

//每种精英物品的初始迭代值
let itemValueCorrectionTerm = {
    30013: {correctionTerm: 1.00000137324044, itemName: '固源岩组'},
    30023: {correctionTerm: 1.0000040009822255, itemName: '糖组'},
    30033: {correctionTerm: 1.0000019925398336, itemName: '聚酸酯组'},
    30043: {correctionTerm: 0.9999483750088554, itemName: '异铁组'},
    30053: {correctionTerm: 1.0000022954075312, itemName: '酮凝集组'},
    30063: {correctionTerm: 1.0000013169421755, itemName: '全新装置'},
    30073: {correctionTerm: 0.9999649132885954, itemName: '扭转醇'},
    30083: {correctionTerm: 1.000002240727396, itemName: '轻锰矿'},
    30093: {correctionTerm: 1.0000022806201772, itemName: '研磨石'},
    30103: {correctionTerm: 1.0000130948559616, itemName: 'RMA70-12'},
    31013: {correctionTerm: 0.9999904276257087, itemName: '凝胶'},
    31023: {correctionTerm: 1.0000248495124442, itemName: '炽合金'},
    31033: {correctionTerm: 1.00000158366126, itemName: '晶体元件'},
    31043: {correctionTerm: 0.999997836003829, itemName: '半自然溶剂'},
    31053: {correctionTerm: 1.000006210539448, itemName: '化合切削液'},
    31063: {correctionTerm: 0.9999981294168673, itemName: '转质盐组'},
    31073: {correctionTerm: 1.0001889176671603, itemName: '褐素纤维'},
    31083: {correctionTerm: 0.9996130718228801, itemName: '环烃聚质'},
    31093: {correctionTerm: 0.9996130718228801, itemName: '类凝结核'}
}

//物品信息列表
let itemInfoList = ITEM_INFO.filter(e => e.cardNum < 100)

//按关卡id分组的关卡掉落数据
let stageDropCollect = void 0

//基础龙门币价值（按CE6  10000龙门币=36理智）
const baseLMDValue = 0.0036

// 公开招募结果的星级概率分布
let recruitRarity = {
    "3": 0.7882,
    "4": 0.2027,
    "5": 0.0069,
    "6": 0.0022,
}

// 公开招募获得的凭证数量
let recruitToken = {
    "3": {"4005": 10, "4004": 0},
    "4": {"4005": 30, "4004": 1},
    "5": {"4005": 0, "4004": 5},
    "6": {"4005": 0, "4004": 10},
}


/**
 * 计算物品价值
 * @param stageConfig 关卡自定义配置
 */
function calculatedItemValue(stageConfig) {
    //解构关卡自定义配置  经验书系数  龙门币系数  加工站爆率  自定义物品列表
    const {expCoefficient, lmdCoefficient, workshopEliteMaterialByProductRate,workshopSkillSummaryByProductRate, customItem} = stageConfig

    //自定义物品map
    let customItemMap = new Map()

    //将自定义物品列表转为一个map
    if (customItem) {
        for (const item of customItem) {
            customItemMap.set(item.itemId, item.itemValue)
        }
    }


    //物品信息map 以物品id为key
    let itemInfoMap = new Map()

    //将物品信息列表循环处理一下，写入到物品信息map
    for (let item of itemInfoList) {
        const itemId = item.itemId
        //这里处理经验书和龙门币的价值，根据经验书和龙门币系数计算价值
        if (itemId === "2004") {
            item.itemValue = baseLMDValue * expCoefficient * 2000
        }
        if (itemId === "2003") {
            item.itemValue = baseLMDValue * expCoefficient * 1000
        }
        if (itemId === "2002") {
            item.itemValue = baseLMDValue * expCoefficient * 400
        }
        if (itemId === "2001") {
            item.itemValue = baseLMDValue * expCoefficient * 200
        }
        if (itemId === "4001") {
            item.itemValue = baseLMDValue * lmdCoefficient
        }

        //迭代物品价值，  物品价值/对应最高效率关的理智转化率
        if (itemValueCorrectionTerm[itemId]) {
            // console.log(item.itemName, item.itemValue, '/', itemValueCorrectionTerm[itemId].correctionTerm)
            item.itemValue = item.itemValue / itemValueCorrectionTerm[itemId].correctionTerm
        }

        //如果物品被自定义价值了，将自定义价值强制写入
        if (customItemMap.get(itemId)) {
            item.itemValue = customItemMap.get(itemId)
        }

        //写入物品信息map
        itemInfoMap.set(itemId, item)
    }

    //将白绿紫金物品通过加工站合成路径得出价值
    for (const table of COMPOSITE_TABLE) {
        //解构加工路径表   合成或拆解的物品id  判断拆解还是合成  合成路径
        const {itemId, resolve, pathway} = table
        //如果这个物品被自定义了，不再通过合成路径得到价值
        if (customItemMap.get(itemId)) {
            continue
        }

        //通过id得到对应的物品信息
        let item = itemInfoMap.get(itemId);

        //物品等级
        const rarity = item.rarity

        //物品新价值
        let newValue = 0.0

        if (resolve) {
            //灰，绿色品质是向下拆解   灰，绿色物品 = （蓝物品价值 + 副产物 - 龙门币）/合成蓝物品的所需灰绿物品数量
            const expectProductsValue = workShopProducts[`t${rarity}`] * workshopEliteMaterialByProductRate
            for (const cost of pathway) {
                const rawItem = itemInfoMap.get(cost.itemId)
                newValue = (rawItem.itemValue + expectProductsValue - 0.36 * lmdCoefficient * rarity) / cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '=(' + rawItem.itemValue + "+" + expectProductsValue + '-' + (0.36 * rarity) + ')/' + cost.count + '=' + newValue)
            }
        } else {
            //紫，金色品质是向上合成    紫，金色物品 =  合成所需蓝物品价值之和  + 龙门币 - 副产物
            const expectProductsValue = workShopProducts[`t${rarity - 1}`] * workshopEliteMaterialByProductRate
            for (const cost of pathway) {
                const rawItem = itemInfoMap.get(cost.itemId)
                newValue += rawItem.itemValue * cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '*' + cost.count + '=' + newValue)
            }

            newValue = newValue + 0.36 * lmdCoefficient * (rarity - 1) - expectProductsValue
            // console.log(item.itemName + '=' + (0.36 * (rarity - 1)) + '-' + expectProductsValue + '=' + newValue)

        }
        // console.log(newValue)
        // console.log(item)

        //更新物品新价值
        item.itemValue = newValue
        // console.log(newValue)
    }

    _getWorkShopProductValue(itemInfoList)

    _calculatedCommonItemValue(stageConfig)

    function _calculatedCommonItemValue(stageConfig) {
        // 至纯源石
        const itemValue4002 = 135;
        // 合成玉
        const itemValue4003 = itemValue4002 / 180;
        // 寻访凭证
        const itemValue7003 = 600 * itemValue4003;
        // 十连寻访凭证
        const itemValue7004 = 10 * itemValue7003;
        // 资质凭证价值根据经验法则定价为 0.8
        const itemValue4005 = 0.8;
        // 高级凭证
        const itemValue4004 = 38 / 258 * itemValue7003;
        // 中坚寻访凭证
        const itemValueClassicGacha = 216 / 38 * itemValue4004;
        // 十连中坚寻访凭证
        const itemValueClassicGacha10 = 10 * itemValueClassicGacha;

        // 家具零件
        const itemValue3401 = 0;
        // 加急许可
        const itemValue7002 = 0;

        // 龙门币
        const itemValueLMD = itemInfoMap.get('4001').itemValue;
        // EXP
        const itemValueEXP = itemInfoMap.get('2001').itemValue / 200;
        // 无人机
        const itemValueBaseAp = itemValueEXP * 50 / 3;
        // 赤金
        const itemValue3003 = itemValueBaseAp * 24;

        // 采购凭证
        const itemValue4006 = 30 * (1 - itemValueLMD * 12) / 21;
        // 芯片助剂
        const itemValue32001 = itemValue4006 * 90;
        // 芯片
        const chip1Value = 18 * (1 - itemValueLMD * 12);
        // 芯片组
        const chip2Value = 36 * (1 - itemValueLMD * 12);
        // 双芯片，省略 1 秒制造站基础工时
        const chip3Value = chip2Value * 2 + itemValue32001;
        // 模组数据块
        const itemValueModUnlockToken = 120 * itemValue4006;
        // 事相碎片
        const itemValueSTORYREVIEWCOIN = 20 * itemValue4006;

        const t3workShopProductsValue = workShopProducts.t3;
        // 因果
        const itemValueYinGuo = 10 / 9 * (1 - workshopEliteMaterialByProductRate) * t3workShopProductsValue / 36;
        // 碳素组
        const itemValue3114 = 240 / 19 * itemValue3401 + 4 * itemValueYinGuo - 4000 / 19 * itemValueLMD;
        const itemValue3113 = 11 / 30 * itemValue3114 + 6 / 5 * itemValueYinGuo;
        const itemValue3112 = 11 / 30 * itemValue3113 + 3 / 5 * itemValueYinGuo;

        // 技巧概要·卷3
        const itemValue3303 = (30 * (1 - itemValueLMD * 12)
            / (2 + 3 / 2 * (1 + workshopSkillSummaryByProductRate) / 3 + 1.5 * (1 + workshopSkillSummaryByProductRate) ** 2 / 3 ** 2));

        // 技能概要·卷2
        const itemValue3302 = (1 + workshopSkillSummaryByProductRate) * itemValue3303 / 3;
        // 技能概要·卷1
        const itemValue3301 = (1 + workshopSkillSummaryByProductRate) * itemValue3302 / 3;

        // 招聘许可
        let itemValue7001 = 0;
        for (const rarity in recruitToken) {
            itemValue7001 += recruitRarity[rarity] * (recruitToken[rarity]["4005"] * itemValue4005 + recruitToken[rarity]["4004"] * itemValue4004);
        }

        // 合成玉（搓玉）
        const itemValue4003sp = (itemInfoMap.get('30012').itemValue * 2 + 1600 * itemValueLMD + 40 * itemValueBaseAp) / 10;

        itemInfoMap.get("4002").itemValue = itemValue4002;
        itemInfoMap.get("4003").itemValue = itemValue4003;
        itemInfoMap.get("7003").itemValue = itemValue7003;
        itemInfoMap.get("7004").itemValue = itemValue7004;
        itemInfoMap.get("4005").itemValue = itemValue4005;
        itemInfoMap.get("4004").itemValue = itemValue4004;
        itemInfoMap.get("classic_gacha").itemValue = itemValueClassicGacha;
        itemInfoMap.get("classic_gacha_10").itemValue = itemValueClassicGacha10;
        itemInfoMap.get("3401").itemValue = itemValue3401;
        // itemInfoMap.get("7002").itemValue = itemValue7002;
        itemInfoMap.get("base_ap").itemValue = itemValueBaseAp;
        itemInfoMap.get("3003").itemValue = itemValue3003;
        itemInfoMap.get("4006").itemValue = itemValue4006;
        itemInfoMap.get("32001").itemValue = itemValue32001;
        itemInfoMap.get("mod_unlock_token").itemValue = itemValueModUnlockToken;
        itemInfoMap.get("STORY_REVIEW_COIN").itemValue = itemValueSTORYREVIEWCOIN;
        itemInfoMap.get("3114").itemValue = itemValue3114;
        itemInfoMap.get("3113").itemValue = itemValue3113;
        itemInfoMap.get("3112").itemValue = itemValue3112;
        itemInfoMap.get("3303").itemValue = itemValue3303;
        itemInfoMap.get("3302").itemValue = itemValue3302;
        itemInfoMap.get("3301").itemValue = itemValue3301;
        itemInfoMap.get("7001").itemValue = itemValue7001;
        itemInfoMap.get("4003sp").itemValue = itemValue4003sp;

        const chip1 = ['3211', '3221', '3231', '3241', '3251', '3261', '3271', '3281']
        const chip2 = ['3212', '3222', '3232', '3242', '3252', '3262', '3272', '3282']
        const chip3 = ['3213', '3223', '3233', '3243', '3253', '3263', '3273', '3283']

        for (const chipId of chip1) {
            itemInfoMap.get(chipId).itemValue = chip1Value;
        }
        for (const chipId of chip2) {
            itemInfoMap.get(chipId).itemValue = chip2Value;
        }
        for (const chipId of chip3) {
            itemInfoMap.get(chipId).itemValue = chip3Value;
        }

    }


    /**
     * 获取加工站物品合成时的各级物品副产品期望产出
     * @param itemList
     * @private
     */
    function _getWorkShopProductValue(itemList) {

        //根据星级分类
        let collect = new Map()
        //循环物品信息表
        for (const item of itemList) {
            //通过副产物排除非可加工物品
            if (item.weight === 0) {
                continue
            }
            //判断物品等级进行分类
            if (!collect.get(item.rarity)) {
                collect.set(item.rarity, [])
            }

            collect.get(item.rarity).push(item)
        }

        //计算按物品等级分类后的加工站各级物品副产品期望产出
        for (const [rarity, group] of collect) {
            let expectValue = 0.0
            for (const item of group) {
                const {itemValue, itemName, weight} = item
                expectValue += itemValue * weight
                // console.log('+=',itemName+'='+itemValue+'*'+weight,'=',expectValue)
            }
            //更新加工站各级物品副产品期望产出
            workShopProducts[`t${rarity}`] = expectValue
        }
    }

}

/**
 *  * 获取物品价值迭代系数
 * @param stageConfig 关卡配置
 * @returns {Promise<{nextItemCorrectionTerm: Map<any, any>}>}
 */
async function getItemValueCorrectionTerm(stageConfig) {


    //物品map
    let itemMap = new Map()

    //将物品信息集合转为一个物品信息map
    for (const item of itemInfoList) {
        itemMap.set(item.itemId, item)
    }

    //每个物品系列的最高效率关卡
    let maxStageEfficiencyMap = new Map()
    //虚拟SideStory关卡效率集合
    let activityAverageStageEfficiency = new Map()

    //循环关卡的物品掉落集合，每个集合是根据关卡id分组的
    for (const [stageId, list] of stageDropCollect) {

        //关卡消耗理智，关卡代号，关卡类型
        const {apCost, stageCode, stageType} = list[0]

        if (['MAIN', 'ACT_PERM'].includes(stageType)) {
            //如果不使用活动关定价则跳出循环
        }

        if (['ACT', 'ACT_REP'].includes(stageType)) {
            if (!stageConfig.useActivityStage) {
                continue
            }
        }

        if ('YTL_VIRTUAL' === stageType) {
            if (!stageConfig.useActivityAverageStage) {
                continue
            }
        }


        //关卡效率
        let stageEfficiency = 0.0
        //关卡期望产出总理智
        let stageExpectedOutput = 0.0

        //如果是第一次迭代，需要给每个关卡的物品掉落添加一个龙门币掉落，
        // if (index === 0) {
        //     list.push({
        //         stageId: stageId,
        //         itemId: "4001",
        //         quantity: apCost * 12,
        //         times: 1
        //     })
        //     // 如果是活动再添加一个无限兑换龙门币，视为关卡掉落物
        //     if ("ACT" === stageType || "ACT_REP" === stageType||"ACT_REP" === 'YTL_VIRTUAL') {
        //         list.push({
        //             stageId: stageId,
        //             itemId: "4001",
        //             quantity: apCost * 20,
        //             times: 1
        //         })
        //     }
        // }

        //主产物物品id
        let mainItemId = ''
        //最高的单项物品产出价值
        let maxValue = 0

        let dropItemList = []

        //循环关卡的物品掉落集合
        for (const drop of list) {

            //解构出物品id，掉落次数，样本数
            const {itemId, quantity, times} = drop

            // 从物品表里面取出对应掉落物的信息
            const itemInfo = itemMap.get(itemId);

            //如果查不到物品信息则跳过
            if (!itemInfo) {
                continue
            }

            //从物品信息中解构出物品价值
            const {itemValue, itemName} = itemInfo;

            //计算物品掉率
            const knockRating = quantity / times

            //计算单项物品期望产出价值
            const expectedOutput = knockRating * itemValue

            //比较单项物品最大产出，最大的为主产物
            if (expectedOutput > maxValue) {
                mainItemId = itemId
                maxValue = expectedOutput
            }

            // if(stageId==='main_12-15'){
            //     // console.log(stageCode, '---', itemName, '=', itemValue, '*', knockRating, '=', expectedOutput, '=', dropValueCount)
            //     dropItemList.push({
            //         itemId,
            //         itemName,
            //         knockRating,
            //         itemValue
            //     })
            // }

            //计算关卡期望产出总理智
            stageExpectedOutput += expectedOutput
        }

        // console.log(JSON.stringify(dropItemList))

        //计算关卡效率
        stageEfficiency = stageExpectedOutput / apCost
        // if (stageId === 'main_02-05') {
        //     console.log(stageCode, '---', stageEfficiency, '=', dropValueCount, '/', apCost)
        // }


        //查询这个关卡的主产物是否是精英物品
        if (!itemSeriesInfoByItemId.has(mainItemId)) {
            // console.log(mainItemId,'不在18种物品中')
            continue
        }

        //获取精英物品对应系列的信息  如凝胶系为[凝胶、聚合凝胶]
        let seriesInfo = itemSeriesInfoByItemId.get(mainItemId)

        //物品系列的id和名称
        const {seriesId, seriesName} = seriesInfo

        //物品系列的迭代值
        const seriesCorrectionTerm = {
            stageCode: stageCode,
            seriesId: seriesId,
            seriesName: seriesName,
            correctionTerm: stageEfficiency,
        }

        // nextStageDropCollect.set(stageId, list)

        // //如果关卡系列为
        // if (stageType === 'YTL_VIRTUAL') {
        //     activityAverageStageEfficiency.set(seriesId, seriesCorrectionTerm)
        // }


        //判断是否有对应精英物品系列的迭代值
        if (maxStageEfficiencyMap.has(seriesId)) {

            //获取当前物品系列的迭代值
            const correctionTerm = maxStageEfficiencyMap.get(seriesId).correctionTerm

            //判断迭代值是否和已有的迭代值大小，如果更大则更新
            if (stageEfficiency > correctionTerm) {
                maxStageEfficiencyMap.set(seriesId, seriesCorrectionTerm)
            }
        } else {
            //没有对应物品系列迭代值新增
            maxStageEfficiencyMap.set(seriesId, seriesCorrectionTerm)
        }
    }

    // //如果自定义关卡配置将虚拟关卡作为定价关，重新再判断一次定价关
    // if (stageConfig.useActivityAverageStage) {
    //
    //     for (const [seriesId, seriesCorrectionTerm] of activityAverageStageEfficiency) {
    //
    //         //获取当前物品系列的迭代值
    //         const correctionTerm = maxStageEfficiencyMap.get(seriesId).correctionTerm
    //
    //         // if (!('31053' === seriesId || '31033' === seriesId)) {
    //         //     maxStageEfficiencyMap.set(seriesId, seriesCorrectionTerm)
    //         // }
    //
    //         if (seriesCorrectionTerm.correctionTerm > correctionTerm) {
    //             maxStageEfficiencyMap.set(seriesId, seriesCorrectionTerm)
    //         }
    //     }
    // }


    return {
        nextItemCorrectionTerm: maxStageEfficiencyMap
    }

}

/**
 * 根据关卡自定义参数获取自定义材料价值表
 * @param stageConfig 关卡自定义参数
 * @return {Promise<*>}
 */
async function getCustomItemList(stageConfig) {

    //获取根据关卡id分类的关卡掉落数据
    stageDropCollect = await getStageDropCollect(stageConfig,true)

    const customItem = stageConfig.customItem

    //自定义物品map
    let customItemMap = new Map()

    //将自定义物品列表转为一个map
    if (customItem) {
        for (const item of customItem) {
            const {itemId, itemValue} = item
            customItemMap.set(itemId, itemValue)
        }
    }


    //迭代物品价值，一般10次之内就能得出结果
    for (let i = 0; i < 50; i++) {
        // console.log(`第${i + 1}次迭代1`)
        // console.table(itemList)
        calculatedItemValue(stageConfig)

        const {nextItemCorrectionTerm} = await getItemValueCorrectionTerm(stageConfig);

        //是否迭代完成的标记
        let completionFlag = true;

        for (const [seriesId, item] of nextItemCorrectionTerm) {
            itemValueCorrectionTerm[seriesId].correctionTerm = item.correctionTerm

            //判断每个物品系列的最优关卡的理智转化率是否与1的误差小于0.0001
            if (!customItemMap.get(seriesId)) {
                // console.log(item.seriesName, '————', item.stageCode, '————', item.correctionTerm, '————', Math.abs(1 - item.correctionTerm))
                completionFlag = completionFlag && Math.abs(1 - item.correctionTerm) < 0.0001
            }
        }

        //如果上面的误差均小于0.0001，结束迭代
        if (completionFlag) {
            console.log(`第${i + 1}次迭代完成`)
            break;
        }


    }

    // console.log("物品价值：",itemList)

    return itemInfoList
}


export {
    getCustomItemList
}
