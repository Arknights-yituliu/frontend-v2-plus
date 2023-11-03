import item_list from '/src/static/json/item_list.json'
import composite_table from '/src/static/json/survey/composite_table.json'


let item_table = {}

for (let e of item_list) {
    item_table = [e.itemId] = e
}




console.log(item_table)

let table = {}

for (const itemName in composite_table) {

}