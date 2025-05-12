import ITEM_INFO from "@/static/json/material/item_info.json";
import COMPOSITE_TABLE from '/src/static/json/material/composite_table.v2.json'
import itemCache from "@/utils/indexedDB/itemCache.js";
import {getStageDropCollect} from "@/utils/indexedDB/penguinData.js";
import {itemSeriesInfoByItemId} from "/src/utils/item/itemSeries.js";


//加工站每级期望产出理智
let workShopProducts = {
    t1: 0.393,
    t2: 1.172,
    t3: 5.204,
    t4: 17.598
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
let stageInfoMap = new Map()

function calculatedItemValue(stageConfig) {
    const {expCoefficient, lmdCoefficient, customItem} = stageConfig

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
            const expectProductsValue = workShopProducts[`t${rarity}`]
            for (const cost of pathway) {
                const rawItem = itemMap.get(cost.itemId)
                newValue = (rawItem.itemValue + expectProductsValue - 0.36 * rarity) / cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '=(' + rawItem.itemValue + "+" + expectProductsValue + '-' + (0.36 * rarity) + ')/' + cost.count + '=' + newValue)
            }
        } else {
            //紫，金色品质是向上合成    紫，金色材料 =  合成所需蓝材料价值之和  + 龙门币 - 副产物
            const expectProductsValue = workShopProducts[`t${rarity - 1}`]
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

    function _getWorkShopProductValue(itemList) {
        const knockRating = 0.2
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
                const {itemValue, weight} = item
                expectValue += itemValue * weight
                // console.log('+=',itemName+'='+itemValue+'*'+weight,'=',expectValue)
            }

            expectValue = expectValue * knockRating
            // console.log(expectValue)
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

    //是否使用活动关作为基准
    const useActivityStage = stageConfig.useActivityStage

    //材料表
    let itemMap = new Map()

    //将材料信息集合转为一个材料表
    for (const item of itemList) {
        itemMap.set(item.itemId, item)
    }

    //下一轮的材料价值迭代系数表
    let nextItemCorrectionTerm = new Map()

    //循环关卡的材料掉落集合，每个集合是根据关卡id分组的
    for (const [stageId, list] of stageDropCollect) {
        //关卡信息，包括关卡消耗理智灯箱信息
        const stageInfo = stageInfoMap.get(stageId)
        //如果查不到关卡信息则跳过
        if (!stageInfo) {
            continue;
        }

        if (['MAIN', 'ACT_PERM'].includes(stageType)) {

            //如果不使用活动关定价则推出
        } else if (!useActivityStage) {
            continue
        }

        //关卡消耗理智，关卡代号，关卡类型
        const {apCost, stageCode, stageType} = stageInfo
        //关卡效率
        let stageEfficiency = 0.0
        //关卡期望产出总理智
        let dropValueCount = 0.0

        //如果是第一次迭代，需要给每个关卡的材料掉落添加一个龙门币掉落，
        if (index === 0) {
            list.push({
                stageId: stageId,
                itemId: "4001",
                quantity: apCost * 12,
                times: 1
            })
            //如果是活动再添加一个无限兑换龙门币，视为关卡掉落物
            if ("ACT" === stageType || "ACT_REP" === stageType) {
                list.push({
                    stageId: stageId,
                    itemId: "4001",
                    quantity: apCost * 20,
                    times: 1
                })
            }
        }

         //主产物材料id
        let mainItemId = ''
        //最高的单项材料产出价值
        let maxValue = 0

        //循环关卡的材料掉落集合
        for (const drop of list) {
            //解构出材料id，掉落次数，样本数
            const {itemId, itemName, quantity, times} = drop
            // 从材料表里面取出对应掉落物的信息
            const itemInfo = itemMap.get(itemId);
            //如果查不到材料信息则跳过
            if (!itemInfo) {
                continue
            }
            //从材料信息中解构出材料价值
            const {itemValue} = itemInfo;
            //计算材料掉率
            const knockRating = quantity / times
            //计算单项材料期望产出价值
            const value = knockRating * itemValue
            //比较单项材料最大产出，最大的为主产物
            if (value > maxValue) {
                mainItemId = itemId
                maxValue = value
            }
            // if(stageId==='main_02-05'){
            //     console.log(stageCode, '---', itemName, '=', itemValue, '*', knockRating, '=', value, '=', dropValueCount)
            //
            // }

            //计算关卡期望产出总理智
            dropValueCount += value
        }

        //计算关卡效率
        stageEfficiency = dropValueCount / apCost
        // if (stageId === 'main_02-05') {
        //     console.log(stageCode, '---', stageEfficiency, '=', dropValueCount, '/', apCost)
        // }

        //查询这个关卡的主产物是否是精英材料
        if(!itemSeriesInfoByItemId.has(mainItemId)){
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



    return {

        nextItemCorrectionTerm: nextItemCorrectionTerm
    }

}


async function getCustomItemList(stageConfig) {
    stageDropCollect = await getStageDropCollect(stageConfig)

    let stageInfoList = await itemCache.getStageInfoCache()
    for (const stage of stageInfoList) {
        const {stageId} = stage
        stageInfoMap.set(stageId, stage)
    }


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
                // console.log(item.seriesName, '————', item.correctionTerm, '————', Math.abs(1 - item.correctionTerm))
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