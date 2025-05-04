import itemInfo from '/src/static/json/material/item_info.json'
import extraOutComeGroup from '/src/static/json/material/extraOutcomeGroup.json'
import itemSeries from '/src/static/json/material/item_series.json'

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

let itemInfoMap = new Map()

for (const item of itemInfo) {
    if (weightMap.has(item.itemId)) {
        item.weight = weightMap.get(item.itemId)
    }
    itemInfoMap.set(item.itemId, item)
}

const itemSeriesTable = []



for (const seriesId in itemSeries) {
    const info = itemSeries[seriesId]
    const name = info.name
    const seriesInfo = info.series
    const data = []
    for(const t in seriesInfo) {
        const id = seriesInfo[t]
        const {itemId,itemName,rarity} = itemInfoMap.get(id)
        data.push({
            itemId,itemName,rarity
        })
    }

    const t3 = seriesInfo['r3']

    console.log(data)
    itemSeriesTable.push({
        seriesId:seriesId,
        seriesName:name,
        itemSeries:data
    })
}

console.log(JSON.stringify(itemSeriesTable))
console.log(JSON.stringify(itemInfo))

export {
    weightMap
}
