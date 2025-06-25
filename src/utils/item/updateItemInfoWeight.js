import itemInfo from '/src/static/json/material/item_info.json'
import extraOutComeGroup from '/src/static/json/material/extraOutcomeGroup.json'
import actStoreUnlimitedExchange from '/src/static/json/material/act_store_unlimited_exchange_item.json'
import COMPOSITE_TABLE from '/src/static/json/material/composite_table.v2.json'


function getNewItemInfo(){
    const list = []
    for(const item of itemInfo){
        const {itemId,itemName,itemValue,rarity,weight,cardNum} = item
        list.push({
            itemId,itemName,itemValue,rarity,weight,cardNum,groupId:cardNum
        })
    }

    list.sort((a,b)=>a.groupId-b.groupId)
    console.log(JSON.stringify(list))
}




function updateItemInfoWeight() {

    let list = []

    let t4WeightCount = 0
    let t5WeightCount = 0
    let weightMap = new Map()
    for (const item of extraOutComeGroup.T4) {
        t4WeightCount += item.weight
    }

    for (const item of extraOutComeGroup.T5) {
        t5WeightCount += item.weight
    }

    for (const item of extraOutComeGroup.T4) {
        weightMap.set(item.itemId, item.weight / t4WeightCount)
    }

    for (const item of extraOutComeGroup.T5) {
        weightMap.set(item.itemId, item.weight / t5WeightCount)
    }

    for (const item of itemInfo) {
        if (weightMap.has(item.itemId)) {
            item.weight = weightMap.get(item.itemId)
        }
        if (item.weight > 0) {
            list.push(item)
        }
    }

    list.sort((a, b) => a.rarity - b.rarity)
    console.log(JSON.stringify(list))
    console.log(JSON.stringify(itemInfo))
}


function getYTLStageList() {


    let workShopProducts = {
        t3: 0.46,
        t4: 1.643578947
    }

    let ytlStageList = {}
    let index = 1
    for (const item of actStoreUnlimitedExchange) {
        const {itemId, itemName} = item

        if (itemId.slice(4) > 3) {
            continue
        }

        const stageId = `ytl_${index.toString().padStart(2, '0')}`
        ytlStageList[itemId] = {
            stageId: stageId,
            // stageCode: `ytl-${index.toString().padStart(2, '0')}`,
            stageCode:'活动关',
            itemId: itemId,
            itemName: itemName,
            quantity: 0,
            times: 0,
            apCost: 21,
            zoneId: "ytl_virtual",
            zoneName: "SS平均掉率",
            stageType: 'YTL_VIRTUAL',
            start: new Date('2025/05/12 00:00:00').getTime(),
            end: new Date('2099/05/01 00:00:00').getTime()
        }
        index++
    }

    console.log(JSON.stringify(ytlStageList))

}

function getItemMinValue() {


    const exchangeItemMap = new Map()
    for (const item of actStoreUnlimitedExchange) {
        item.itemValue = item.min
        exchangeItemMap.set(item.itemId, item.min)
    }

    for (const table of COMPOSITE_TABLE) {
        const {itemId, itemName, resolve, rarity, pathway} = table

        if (resolve) {
            continue
        }

        let newValue = 0.0
        if (!resolve) {
            //紫，金色品质是向上合成    紫，金色材料 =  合成所需蓝材料价值之和  + 龙门币 - 副产物
            const expectProductsValue = workShopProducts[`t${rarity - 1}`]
            for (const cost of pathway) {
                const rawItemValue = exchangeItemMap.get(cost.itemId)
                newValue += rawItemValue * cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '*' + cost.count + '=' + newValue)
            }

            newValue = newValue + 0.36 * (rarity - 1) - expectProductsValue
            // console.log(item.itemName + '=' + (0.36 * (rarity - 1)) + '-' + expectProductsValue + '=' + newValue)
        }
        exchangeItemMap.set(itemId, newValue)
        actStoreUnlimitedExchange.push({
            "itemId": itemId,
            "itemName": itemName,
            "active": false,
            itemValue: newValue,
            "min": newValue
        })

    }
    console.log(JSON.stringify(actStoreUnlimitedExchange))
}

getNewItemInfo()
// updateItemInfoWeight()
// getYTLStageList()

export {
    updateItemInfoWeight
}
