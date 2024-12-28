import {ref} from "vue";

const filterByYear = (condition, data) => {
    console.log(data)
    return data.date >= condition.start && data.date <= condition.end;
}

const filterByProfession = (condition, data) => {
    return data.profession === condition;
}

const filterByRarity = (condition, data) => {
    return data.rarity === condition;
}

const filterByItemObtainApproach = (condition, data) => {
    return data.itemObtainApproach === condition;
}

const filterByEquip = (condition, data) => {
    return condition === !!data.equip;
}

const filterByEquipType = (type, data) => {
    return data[type] > 0;
}

const filterByOwn = (condition, data) => {
    return condition===data.own;
}


//{label: "开服干员", value:{start: 1556553600000,end: 1556726400000},func: filterByYear},

let operatorFilterCondition = ref({
    'profession': {
        label: "干员职业",
        type: 'profession',
        actionFunc: (index) => {
            operatorFilterCondition.value.profession.conditions[index].action = !operatorFilterCondition.value.profession.conditions[index].action
        },
        conditions: [
            {label: "先锋", value: "PIONEER", func: filterByProfession, action: false},
            {label: "近卫", value: "WARRIOR", func: filterByProfession, action: false},
            {label: "重装", value: "TANK", func: filterByProfession, action: false},
            {label: "狙击", value: "SNIPER", func: filterByProfession, action: false},
            {label: "术师", value: "CASTER", func: filterByProfession, action: false},
            {label: "医疗", value: "MEDIC", func: filterByProfession, action: false},
            {label: "辅助", value: "SUPPORT", func: filterByProfession, action: false},
            {label: "特种", value: "SPECIAL", func: filterByProfession, action: false}
        ]
    },
    'rarity': {
        label: "干员星级",
        type: 'rarity',
        actionFunc: (index) => {
            operatorFilterCondition.value.rarity.conditions[index].action = !operatorFilterCondition.value.rarity.conditions[index].action
        },
        conditions: [
            {label: "6★", value: 6, func: filterByRarity, action: true},
            {label: "5★", value: 5, func: filterByRarity, action: false},
            {label: "4★", value: 4, func: filterByRarity, action: false},
            {label: "3★", value: 3, func: filterByRarity, action: false},
            {label: "2★", value: 2, func: filterByRarity, action: false},
            {label: "1★", value: 1, func: filterByRarity, action: false},
        ]
    },
    'date': {
        label: "实装日期",
        type: 'date',
        actionFunc: (index) => {
            operatorFilterCondition.value.date.conditions[index].action = !operatorFilterCondition.value.date.conditions[index].action
        },
        conditions: [
            {label: "2019", value: {start: 1556553600000, end: 1577721600000}, func: filterByYear, action: false},
            {label: "2020", value: {start: 1577808000000, end: 1609344000000}, func: filterByYear, action: false},
            {label: "2021", value: {start: 1609430400000, end: 1640880000000}, func: filterByYear, action: false},
            {label: "2022", value: {start: 1640966400000, end: 1672416000000}, func: filterByYear, action: false},
            {label: "2023", value: {start: 1672502400000, end: 1703952000000}, func: filterByYear, action: false},
            {label: "2024", value: {start: 1704038400000, end: 1735660799000}, func: filterByYear, action: false}
        ]
    },
    'itemObtainApproach': {
        label: "获得方式",
        type: 'itemObtainApproach',
        actionFunc: (index) => {
            operatorFilterCondition.value.itemObtainApproach.conditions[index].action = !operatorFilterCondition.value.itemObtainApproach.conditions[index].action
        },
        conditions: [
            {label: "常驻干员", value: "常驻干员", func: filterByItemObtainApproach, action: false},
            {label: "赠送干员", value: "赠送干员", func: filterByItemObtainApproach, action: false},
            {label: "限定干员", value: "限定干员", func: filterByItemObtainApproach, action: false},
        ]
    },
    'equip': {
        label: "干员模组",
        type: 'equip',
        actionFunc: (index) => {
            operatorFilterCondition.value.equip.conditions[index].action = !operatorFilterCondition.value.equip.conditions[index].action
        },
        conditions: [
            {label: "模组已实装", value: true, func: filterByEquip, action: false},
            {label: "模组未实装", value: false, func: filterByEquip, action: false},

        ]
    },
    'own': {
        label: "招募情况",
        type: 'own',
        actionFunc: (index) => {
            operatorFilterCondition.value.own.conditions[index].action = !operatorFilterCondition.value.own.conditions[index].action
        },
        conditions: [
            {label: "已招募", value: true,func: filterByOwn, action: false},
            {label: "未招募", value: false,func: filterByOwn, action: false},
        ]
    },
})

//
// {label: "开放X模组的干员", value: 'modX', func: filterByEquipType, action: false},
// {label: "开放Y模组的干员", value: 'modY', func: filterByEquipType, action: false},
// {label: "开放D模组的干员", value: 'modD', func: filterByEquipType, action: false},
// {label: "开放A模组的干员", value: 'modA', func: filterByEquipType, action: false},

function filterOperatorList(list) {
    let displayList = []
    for (const index in list) {
        const operator = list[index]
        let display = true

        // let logText = operator.name

        for (const c in operatorFilterCondition.value) {
            const item = operatorFilterCondition.value[c];
            const conditions = item.conditions
            // logText+=`{  }要判断的内容:${item.label}`
            let flag = true
            for (const condition of conditions) {
                if (condition.action) {
                    flag = condition.func(condition.value, operator)
                    if (flag) {
                        break
                    }
                }
            }
            display = display&&flag
            // logText+=`{  }结果:${flag}`
        }
        // logText+=`{  }最终结果${display}`
        // console.log(logText)

        if (display) {
            // console.log('加入了')
            displayList.push(operator)
        }
    }

    // console.log(displayList)

    return displayList;
}

export {
    operatorFilterCondition, filterOperatorList
}