import itemSeriesInfo from '/src/static/json/material/item_series_info.json';

let itemSeriesInfoByItemId = new Map();
let itemSeriesIdList = []
let itemSeriesObj = {};

for (const info of itemSeriesInfo) {
    const {seriesId, seriesName, itemSeries} = info;
    itemSeriesIdList.push(seriesId)
    const series = {}

    for (const item of itemSeries) {
        const {itemId, itemName, rarity} = item

        series[`T${rarity}`] = itemId

        itemSeriesInfoByItemId.set(itemId, {
            seriesId,
            seriesName,
            itemName,
            itemId
        })
    }
    itemSeriesObj[seriesId] = series

}


export {
    itemSeriesInfoByItemId, itemSeriesIdList, itemSeriesObj
}
