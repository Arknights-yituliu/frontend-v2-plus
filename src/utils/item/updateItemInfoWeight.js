import itemInfo from '/src/static/json/material/item_info.json'
import extraOutComeGroup from '/src/static/json/material/extraOutcomeGroup.json'

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

}




console.log(JSON.stringify(itemInfo))

export {
    weightMap
}
