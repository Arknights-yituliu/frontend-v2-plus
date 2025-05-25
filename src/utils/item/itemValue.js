import ITEM_INFO from "@/static/json/material/item_info.json";
import COMPOSITE_TABLE from '/src/static/json/material/composite_table.v2.json'

import {getStageDropCollect} from "@/plugins/indexedDB/penguinData.js";
import {itemSeriesInfoByItemId} from "/src/utils/item/itemSeries.js";
import {updateItemInfoWeight} from "/src/utils/item/updateItemInfoWeight.js";


//加工站每级期望产出理智
let workShopProducts = {
    t1: 1.9622015949221407,
    t2: 5.853670784766422,
    t3: 24.578868967312253,
    t4: 79.8592285162492
}

//加工站每级期望产出理智
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
    30103: {correctionTerm: 1.0000130948559616, itemName: 'RMA70-12 '},
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

let itemList = ITEM_INFO.filter(e => e.cardNum < 100)
let stageDropCollect = void 0
const baseLMDValue = 0.0036


function calculatedItemValue(stageConfig) {
    const {expCoefficient, lmdCoefficient, workShopProductKnockRating, customItem} = stageConfig


    let customItemMap = new Map()
    for (const item of customItem) {
        customItemMap.set(item.itemId, item.itemValue)
    }

    let itemMap = new Map()

    for (let item of itemList) {
        const itemId = item.itemId
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

        if (itemValueCorrectionTerm[itemId]) {
            // console.log(item.itemName, item.itemValue, '/', itemValueCorrectionTerm[itemId].correctionTerm)
            item.itemValue = item.itemValue / itemValueCorrectionTerm[itemId].correctionTerm
        }

        if (customItemMap.get(itemId)) {
            item.itemValue = customItemMap.get(itemId)
        }

        itemMap.set(itemId, item)
    }

    for (const table of COMPOSITE_TABLE) {
        const {itemId, resolve, pathway} = table
        if (customItemMap.get(itemId)) {
            continue
        }
        let item = itemMap.get(itemId);
        const rarity = item.rarity
        let newValue = 0.0
        if (resolve) {
            //灰，绿色品质是向下拆解   灰，绿色材料 = （蓝材料价值 + 副产物 - 龙门币）/合成蓝材料的所需灰绿材料数量
            const expectProductsValue = workShopProducts[`t${rarity}`] * workShopProductKnockRating
            for (const cost of pathway) {
                const rawItem = itemMap.get(cost.itemId)
                newValue = (rawItem.itemValue + expectProductsValue - 0.36 * rarity) / cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '=(' + rawItem.itemValue + "+" + expectProductsValue + '-' + (0.36 * rarity) + ')/' + cost.count + '=' + newValue)
            }
        } else {
            //紫，金色品质是向上合成    紫，金色材料 =  合成所需蓝材料价值之和  + 龙门币 - 副产物
            const expectProductsValue = workShopProducts[`t${rarity - 1}`] * workShopProductKnockRating
            for (const cost of pathway) {
                const rawItem = itemMap.get(cost.itemId)
                newValue += rawItem.itemValue * cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '*' + cost.count + '=' + newValue)

            }

            newValue = newValue + 0.36 * (rarity - 1) - expectProductsValue
            // console.log(item.itemName + '=' + (0.36 * (rarity - 1)) + '-' + expectProductsValue + '=' + newValue)

        }
        // console.log(newValue)
        // console.log(item)

        item.itemValue = newValue
        // console.log(newValue)
    }

    _getWorkShopProductValue(itemList)

    // EXP价值 = 龙门币价值 * EXP系数 = 36/10000 * 145/229 = 261/114500
    // 基础作战记录价值 = 200 * EXP价值 = 522/1145
    // 初级作战记录价值 = 400 * EXP价值 = 1044/1145
    // 中级作战记录价值 = 1000 * EXP价值 = 522/229
    // 高级作战记录价值 = 2000 * EXP价值 = 1044/229
    // 无人机价值 = EXP价值 * 无人机生产EXP数量 =  261/114500 * 50/3 = 87/2290
    // 赤金价值 = 无人机价值 / 无人机生产赤金数量 = 1044/1145
    // 芯片组价值 = 36 * (1 - 12 * 龙门币价值) = 21528/625
    // 采购凭证价值 = AP-5消耗理智 * (1 - 12 * 龙门币价值) / AP-5掉落采购凭证 = 1196/875
    // 芯片助剂价值 = 90 * 采购凭证价值 = 21528/175
    // 双芯片价值 = 2 * 芯片组价值 + 芯片助剂价值 + 20 * 无人机价值 = 193027818/1001875
    // 模组数据块价值 = 120 * 采购凭证价值 = 28704/175
    // 事相碎片价值 = 20 * 采购凭证价值 = 4784/175

    // - θ 为合成精英材料时的副产物出率（θ = 20%），
    // - BM 为蓝材料价值关于加工站副产物出率的加权平均（简单来说就是 1 个随机蓝材料的价值），
    // 解得：
    // - 因果价值 = 10/9 * (1 - θ) * BM / 36
    // - 碳素组价值 = 240/19 * 家具零件价值 + 4 * 因果价值 - 4000/19 * 龙门币价值
    // - 碳素价值 = 11/30 * 碳素组价值 + 6/5 * 因果价值
    // - 碳价值 = 11/30 * 碳素价值 + 3/5 * 因果价值

    _calculatedCommonItemValue(stageConfig)

    function _calculatedCommonItemValue(stageConfig) {
        const itemValueLMD = itemMap.get('4001').itemValue
        const itemValueEXP = itemMap.get('2001').itemValue / 200
        //无人机
        const itemValueBaseAp = itemValueEXP * 50 / 3
        //采购凭证  （关卡AP - 龙门币价值*关卡掉落*倍率*关卡AP)/掉落数
        const itemValue4006 = (30 - itemValueLMD * 12 * 30) / 21;
        //芯片助剂
        const itemValue32001 = itemValue4006 * 90;
        //赤金
        const itemValue3003 = itemValueBaseAp * 24
        //技能书3
        const itemValue3303 = (30 - itemValueLMD * 12 * 30) / (2 + 1.5 * (1 + 0.18) / 3 + 1.5 * (1 + 0.18) * (1 + 0.18) / 9);
        //技能书2
        const itemValue3302 = 1.18 * itemValue3303 / 3;
        //技能书1
        const itemValue3301 = 1.18 * itemValue3302 / 3;

        //芯片 扣除龙门币
        const chip1Value = 18 - 18 * itemValueLMD * 12;
        //芯片组 扣除龙门币
        const chip2Value = 36 - 36 * itemValueLMD * 12;
        //双芯片
        const chip3Value = chip2Value * 2 + itemValue32001;
        //模组数据块
        const itemValueModUnlockToken = 120 * itemValue4006;
        //模组数据块
        const itemValueSTORYREVIEWCOIN = 20 * itemValue4006;

        const t3workShopProductsValue = workShopProducts.t3

        const itemValueYinGuo = 10 / 9 * (1 - workShopProductKnockRating) * t3workShopProductsValue / 0.2 / 36
        const itemValue3114 = 240 / 19 * 0 + 4 * itemValueYinGuo - 4000 / 19 * itemValueLMD
        const itemValue3113 = 11 / 30 * itemValue3114 + 6 / 5 * itemValueYinGuo
        const itemValue3112 = 11 / 30 * itemValue3113 + 3 / 5 * itemValueYinGuo


        const itemValue4003sp = (itemMap.get('30012').itemValue * 2 + 1600 * itemValueLMD + 40 * itemValueBaseAp) / 10

        itemMap.get("base_ap").itemValue = itemValueBaseAp;
        itemMap.get("3003").itemValue = itemValue3003;
        itemMap.get("4006").itemValue = itemValue4006;
        itemMap.get("32001").itemValue = itemValue32001;
        itemMap.get("3303").itemValue = itemValue3303;
        itemMap.get("3302").itemValue = itemValue3302;
        itemMap.get("3301").itemValue = itemValue3301;
        itemMap.get("mod_unlock_token").itemValue = itemValueModUnlockToken;
        itemMap.get("STORY_REVIEW_COIN").itemValue = itemValueSTORYREVIEWCOIN;
        itemMap.get("3303").itemValue = itemValue3303;
        itemMap.get("3302").itemValue = itemValue3302;
        itemMap.get("3301").itemValue = itemValue3301;
        itemMap.get("4003sp").itemValue = itemValue4003sp;
        itemMap.get("3114").itemValue = itemValue3114;
        itemMap.get("3113").itemValue = itemValue3113;
        itemMap.get("3112").itemValue = itemValue3112;

        const chip1 = ['3211', '3221', '3231', '3241', '3251', '3261', '3271', '3281']
        const chip2 = ['3212', '3222', '3232', '3242', '3252', '3262', '3272', '3282']
        const chip3 = ['3213', '3223', '3233', '3243', '3253', '3263', '3273', '3283']
        for (const chipId of chip1) {
            itemMap.get(chipId).itemValue = chip1Value;
        }
        for (const chipId of chip2) {
            itemMap.get(chipId).itemValue = chip2Value;
        }
        for (const chipId of chip3) {
            itemMap.get(chipId).itemValue = chip3Value;
        }

    }


    function _getWorkShopProductValue(itemList) {

        let collect = new Map()
        for (const item of itemList) {
            if (item.weight === 0) {
                continue
            }
            if (!collect.get(item.rarity)) {
                collect.set(item.rarity, [])
            }
            collect.get(item.rarity).push(item)
        }

        for (const [rarity, group] of collect) {
            let expectValue = 0.0
            for (const item of group) {
                const {itemValue, itemName, weight} = item
                expectValue += itemValue * weight
                // console.log('+=',itemName+'='+itemValue+'*'+weight,'=',expectValue)
            }

            workShopProducts[`t${rarity}`] = expectValue
        }
    }

}

/**
 *  * 获取材料价值迭代系数
 * @param stageConfig 关卡配置
 * @param index  迭代次数
 * @returns {Promise<{nextItemCorrectionTerm: Map<any, any>}>}
 */
async function getItemValueCorrectionTerm(stageConfig, index) {


    //材料表
    let itemMap = new Map()

    //将材料信息集合转为一个材料表
    for (const item of itemList) {
        itemMap.set(item.itemId, item)
    }

    //下一轮的材料价值迭代系数表
    let nextItemCorrectionTerm = new Map()
    let activityAverageStageEfficiency = new Map()

    //循环关卡的材料掉落集合，每个集合是根据关卡id分组的
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
        let dropValueCount = 0.0

        //如果是第一次迭代，需要给每个关卡的材料掉落添加一个龙门币掉落，
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

        //主产物材料id
        let mainItemId = ''
        //最高的单项材料产出价值
        let maxValue = 0

        let dropItemList = []

        //循环关卡的材料掉落集合
        for (const drop of list) {
            //解构出材料id，掉落次数，样本数
            const {itemId,  quantity, times} = drop
            // 从材料表里面取出对应掉落物的信息
            const itemInfo = itemMap.get(itemId);
            //如果查不到材料信息则跳过
            if (!itemInfo) {
                continue
            }
            //从材料信息中解构出材料价值
            const {itemValue,itemName} = itemInfo;
            //计算材料掉率
            const knockRating = quantity / times
            //计算单项材料期望产出价值
            const value = knockRating * itemValue
            //比较单项材料最大产出，最大的为主产物
            if (value > maxValue) {
                mainItemId = itemId
                maxValue = value
            }

            if(stageId==='main_12-15'){
                // console.log(stageCode, '---', itemName, '=', itemValue, '*', knockRating, '=', value, '=', dropValueCount)
                dropItemList.push({
                    itemId,
                    itemName,
                    knockRating,
                    itemValue
                })
            }

            //计算关卡期望产出总理智
            dropValueCount += value
        }

        // console.log(JSON.stringify(dropItemList))

        //计算关卡效率
        stageEfficiency = dropValueCount / apCost
        // if (stageId === 'main_02-05') {
        //     console.log(stageCode, '---', stageEfficiency, '=', dropValueCount, '/', apCost)
        // }


        //查询这个关卡的主产物是否是精英材料
        if (!itemSeriesInfoByItemId.has(mainItemId)) {
            // console.log(mainItemId,'不在18种材料中')
            continue
        }

        //获取精英材料对应系列的信息  如凝胶系为[凝胶、聚合凝胶]
        let seriesInfo = itemSeriesInfoByItemId.get(mainItemId)

        //材料系列的id和名称
        const {seriesId, seriesName} = seriesInfo

        //下次迭代值
        const seriesCorrectionTerm = {
            stageCode: stageCode,
            seriesId: seriesId,
            seriesName: seriesName,
            correctionTerm: stageEfficiency,
        }

        // nextStageDropCollect.set(stageId, list)


        if (stageType === 'YTL_VIRTUAL') {
            activityAverageStageEfficiency.set(seriesId, seriesCorrectionTerm)
        }


        //判断是否有对应精英材料系列的迭代值
        if (nextItemCorrectionTerm.has(seriesId)) {
            //判断迭代值是否和已有的迭代值大小，如果更大则更新
            const correctionTerm = nextItemCorrectionTerm.get(seriesId).correctionTerm
            if (stageEfficiency > correctionTerm) {
                nextItemCorrectionTerm.set(seriesId, seriesCorrectionTerm)
            }
        } else {
            //没有对应材料系列迭代值新增
            nextItemCorrectionTerm.set(seriesId, seriesCorrectionTerm)
        }
    }

    if (stageConfig.useActivityAverageStage) {
        for (const [seriesId, seriesCorrectionTerm] of activityAverageStageEfficiency) {
            if (!('31053' === seriesId || '31033' === seriesId)) {
                nextItemCorrectionTerm.set(seriesId, seriesCorrectionTerm)
            }
        }
    }


    return {

        nextItemCorrectionTerm: nextItemCorrectionTerm
    }

}


async function getCustomItemList(stageConfig) {

    stageDropCollect = await getStageDropCollect(stageConfig)
    const customItem = stageConfig.customItem

    let customItemMap = new Map()
    for (const item of customItem) {
        const {itemId, itemValue} = item
        customItemMap.set(itemId, itemValue)
    }

    for (let i = 0; i < 50; i++) {
        // console.log(`第${i + 1}次迭代1`)
        // console.table(itemList)
        calculatedItemValue(stageConfig)

        const {nextItemCorrectionTerm} = await getItemValueCorrectionTerm(stageConfig, i);

        let completionFlag = true;

        for (const [seriesId, item] of nextItemCorrectionTerm) {
            itemValueCorrectionTerm[seriesId].correctionTerm = item.correctionTerm
            if (!customItemMap.get(seriesId)) {
                // console.log(item.seriesName, '————', item.stageCode, '————', item.correctionTerm, '————', Math.abs(1 - item.correctionTerm))
                completionFlag = completionFlag && Math.abs(1 - item.correctionTerm) < 0.0001
            }
        }

        if (completionFlag) {
            console.log(`第${i + 1}次迭代完成`)
            break;
        }


    }

    // console.log("材料价值：",itemList)

    return itemList
}


export {
    getCustomItemList
}