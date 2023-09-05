import characterBasicInfo from "@/static/json/survey/character_table_simple.json";
import operatorItemCostTable from "@/static/json/survey/operator_item_cost_table.json";
import itemTable from "@/static/json/survey/item_table.json";
import levelCostTable from "@/static/json/survey/level_cost_table.json";
import {ref} from "vue";

let yearDict = [
    {
        label: "开服干员",
        start: 1556553600000,
        end: 1556726400000
    },
    {
        label: "2019",
        start: 1556553600000,
        end: 1577721600000
    },
    {
        label: "2020",
        start: 1577808000000,
        end: 1609344000000
    },
    {
        label: "2021",
        start: 1609430400000,
        end: 1640880000000
    },
    {
        label: "2022",
        start: 1640966400000,
        end: 1672416000000
    },
    {
        label: "2023",
        start: 1672502400000,
        end: 1703952000000
    },
];

let professionDict = [
    {label: "狙击", value: "SNIPER"},
    {label: "近卫", value: "WARRIOR"},
    {label: "特种", value: "SPECIAL"},
    {label: "医疗", value: "MEDIC"},
    {label: "辅助", value: "SUPPORT"},
    {label: "先锋", value: "PIONEER"},
    {label: "重装", value: "TANK"},
    {label: "术师", value: "CASTER"},
];

function getProfession(str) {
    if ("SNIPER" === str) return "狙击";
    if ("WARRIOR" === str) return "近卫";
    if ("SPECIAL" === str) return "特种";
    if ("MEDIC" === str) return "医疗";
    if ("SUPPORT" === str) return "辅助";
    if ("PIONEER" === str) return "先锋";
    if ("TANK" === str) return "重装";
    if ("CASTER" === str) return "术师";
    return "";
}

function calAPCost(operatorList) {
    let itemCountMap = new Map();
    for (let c in operatorList) {
        const operator = operatorList[c];
        const charId = operator.charId;
        const name = operator.name;
        const rarity = operator.rarity;
        const elite = operator.elite;
        const level = operator.level;
        const itemCost = operatorItemCostTable[charId];


        const levelApCost = levelApCostCal(rarity, elite, level);


        for(const itemId in levelApCost){
            if (itemCountMap.get(itemId) === void 0) {
                let count = levelApCost[itemId];
                itemCountMap.set(itemId, count)

            } else {
                let count = itemCountMap.get(itemId);
                count += levelApCost[itemId]
                itemCountMap.set(itemId, count)

            }
        }

        console.table(levelApCost)




        for (let i = 1; i <= operator.elite; i++) {
            for (let itemId in itemCost.elite[i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.elite[i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.elite[i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        // console.log('基础技能：',operator.mainSkill)
        for (let i = 0; i < operator.mainSkill; i++) {
            for (let itemId in itemCost.allSkill[i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.allSkill[i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.allSkill[i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        for (let i = 0; i < operator.skill1; i++) {
            for (let itemId in itemCost.skills[0][i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.skills[0][i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.skills[0][i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        for (let i = 0; i < operator.skill2; i++) {
            for (let itemId in itemCost.skills[1][i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.skills[1][i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.skills[1][i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        for (let i = 0; i < operator.skill3; i++) {
            for (let itemId in itemCost.skills[2][i]) {
                if (itemCountMap.get(itemId) === void 0) {
                    let count = itemCost.skills[2][i][itemId];
                    itemCountMap.set(itemId, count)
                    // console.log("没添加过的材料：", itemId, '数量：', count)
                } else {
                    let count = itemCountMap.get(itemId);
                    count += itemCost.skills[2][i][itemId]
                    itemCountMap.set(itemId, count)
                    // console.log("已添加过的材料：", itemId, '数量：', count)
                }
            }
        }

        if(operator.modXOwn){
            for (let i = 0; i < operator.modX; i++) {
                for (let itemId in itemCost.modX[i]){
                    if (itemCountMap.get(itemId) === void 0) {
                        let count = itemCost.modX[i][itemId];
                        itemCountMap.set(itemId, count)
                        // console.log("模组——没添加过的材料：", itemId, '数量：', count)
                    } else {
                        let count = itemCountMap.get(itemId);
                        count += itemCost.modX[i][itemId]
                        itemCountMap.set(itemId, count)
                        // console.log("模组——已添加过的材料：", itemId, '数量：', count)
                    }
                }
            }
        }


        if(operator.modYOwn){
            for (let i = 0; i < operator.modY; i++) {
                for (let itemId in itemCost.modY[i]){
                    if (itemCountMap.get(itemId) === void 0) {
                        let count = itemCost.modY[i][itemId];
                        itemCountMap.set(itemId, count)
                        // console.log("模组——没添加过的材料：", itemId, '数量：', count)
                    } else {
                        let count = itemCountMap.get(itemId);
                        count += itemCost.modY[i][itemId]
                        itemCountMap.set(itemId, count)
                        // console.log("模组——已添加过的材料：", itemId, '数量：', count)
                    }
                }
            }
        }

    }


    let itemList = []
    let rarityEXList = []
    let rarity5List = []
    let rarity4List = []
    let rarity3List = []
    let rarity2List = []
    let rarity1List = []

    let apCostCount = 0;

    itemCountMap.forEach((v, k) => {
        // console.log('材料id', k)
        if (itemTable[k] !== void 0) {
            const rarity = itemTable[k].rarity;
            let  itemValueAp =  itemTable[k].itemValueAp;
            let item = {
                id: k,
                rarity: rarity,
                count: v,
                itemValueAp:itemTable[k].itemValueAp
            }
            apCostCount+=(itemValueAp*v)

            if (rarity === 5) {
                rarity5List.push(item)
            }
            if (rarity === 4) {
                if("4001"===k||"2003"===k){
                    rarityEXList.push(item)
                }else {
                    rarity4List.push(item)
                }
            }
            if (rarity === 3) {
                rarity3List.push(item)
            }
            if (rarity === 2) {
                rarity2List.push(item)
            }
            if (rarity === 1) {
                rarity1List.push(item)
            }
        }
    })



    rarity5List.sort((a,b)=>{
        return b.id-a.id
    })

    rarity4List.sort((a,b)=>{
        return b.id-a.id
    })

    rarity3List.sort((a,b)=>{
        return b.id-a.id
    })

    itemList.push(rarityEXList)
    itemList.push(rarity5List)
    itemList.push(rarity4List)
    itemList.push(rarity3List)
    itemList.push(rarity2List)
    itemList.push(rarity1List)

    const result={
        itemList:itemList,
        apCostCount:apCostCount
    }

    return result;
}

function levelApCostCal(rarity,elite,level) {

      if(rarity===6){
         return   tableByRarity(rarity,elite,level,49,79)
      }

    if(rarity===5){
        return   tableByRarity(rarity,elite,level,49,69)
    }

    if(rarity===4){
        return   tableByRarity(rarity,elite,level,44,59)
    }

    if(rarity===3){
        return   tableByRarity(rarity,elite,level,39,54)
    }

    if(rarity===2){
        return   tableByRarity(rarity,elite,level,29,0)
    }

    if(rarity===1){
        return   tableByRarity(rarity,elite,level,29,0)
    }


}


function tableByRarity(rarity,elite,level,elite_0_max_level,elite_1_max_level){
    let LMDCost = 0;
    let EXPCost = 0;

          if(elite>0){
              LMDCost += levelCostTable['elite0'][elite_0_max_level].LMDCount
              EXPCost += levelCostTable['elite0'][elite_0_max_level].EXPCount
              if(rarity>2){
                  LMDCost += (5000*(rarity-1))
              }
          }
          if(elite>1){
              LMDCost += levelCostTable['elite1'][elite_1_max_level].LMDCount
              EXPCost += levelCostTable['elite1'][elite_1_max_level].EXPCount
              if(rarity>3){
                  LMDCost += (60000*(rarity-3))
              }
          }

          if(level>0){
              LMDCost += levelCostTable['elite'+elite][level-1].LMDCount
              EXPCost += levelCostTable['elite'+elite][level-1].EXPCount
          }

          let result={
              "4001":LMDCost,
              "2003":EXPCost/1000
          }

          return result;
}


/**
 *
 * @param filterCondition  筛选条件对象
 * @param characterInfo   角色信息
 * @returns {boolean}  筛选结果
 */

function filterByCharacterProperty(filterCondition, characterInfo) {
    let show = true;
    for (const property in filterCondition) {

        if (property === 'rarity' || property === 'profession' || property === 'own' ||
            property === 'mod' || property === 'itemObtainApproach') {
            const flag = determineProperty(filterCondition, characterInfo, property);
            show = show && flag
        }
        if (property === 'year') {
            const flag = determineYear(filterCondition, characterInfo);
            show = show && flag
        }
    }

    return show;
}

/**
 *
 * @param filterCondition  筛选条件
 * @param characterInfo  角色信息
 * @param property  角色属性
 * @returns {boolean}  筛选结果
 */
function determineProperty(filterCondition, characterInfo, property) {
    if (filterCondition[property].length === 0) return true;
    for (let condition of filterCondition[property]) {
        if (characterInfo[property] === condition) {
            return true;
        }
    }
    return false;
}

/**
 *
 * @param filterCondition  筛选条件
 * @param characterInfo  角色信息
 * @returns {boolean}  筛选结果
 */
function determineYear(filterCondition, characterInfo) {
    if (filterCondition.year.length === 0) return true;
    for (let value of filterCondition.year) {
        // console.log(filterRules.value.year[r])
        let year = yearDict[value];
        // console.log(characterInfo.date, ">=", year.start, characterInfo.date, "<=", year.end);
        if (characterInfo.date >= year.start && characterInfo.date <= year.end) {
            return true;
        }
    }
    return false;
}

let characterList = [];

//干员基础数据
function characterListInit() {
    for (let charId in characterBasicInfo) {
        const baseData = characterBasicInfo[charId];
        // if (baseInfo.rarity < 5) continue;
        let modX_own = false;
        let modY_own = false;
        let default_show = false;

        if (baseData.mod !== undefined) {
            if (baseData.mod.modX) {
                modX_own = true;
            }
            if (baseData.mod.modY) {
                modY_own = true;
            }
        }

        if (baseData.rarity === 6) {
            default_show = true
        }


        let character = {
            charId: charId,
            name: baseData.name,
            own: false,
            level: -1,
            modX: -1,
            modXOwn: modX_own,
            modY: -1,
            modYOwn: modY_own,
            elite: -1,
            potential: -1,
            rarity: baseData.rarity,
            mainSkill:-1,
            skill1: -1,
            skill2: -1,
            skill3: -1,
            skill: baseData.skill,
            date: baseData.date,
            itemObtainApproach: baseData.itemObtainApproach,
            profession: baseData.profession,
            mod: baseData.mod !== undefined,
            show: default_show,
        };
        characterList.push(character);
    }

    characterList.sort((a, b) => {
        return b.rarity - a.rarity;
    });

    // console.log(characterList);
    return characterList;
}


let scoreList = [];

function scoreListInit() {
    for (let charId in characterBasicInfo) {
        const baseInfo = characterBasicInfo[charId];
        // console.log(baseInfo)
        let score = {
            charId: charId,
            name: baseInfo.name,
            itemDesc: baseInfo.itemDesc,
            itemUsage: baseInfo.itemUsage,
            rarity: baseInfo.rarity,
            daily: -1,
            rogue: -1,
            securityService: -1,
            hard: -1,
            universal: -1,
            building: -1,
            counter: -1,
            comprehensive: -1,
            date: baseInfo.date,
            profession: baseInfo.profession,
            itemObtainApproach: baseInfo.itemObtainApproach,
            mod: baseInfo.mod !== undefined,
            show: true,
        };

        scoreList.push(score);
    }

    scoreList.sort((a, b) => {
        return b.rarity - a.rarity;
    });
    return scoreList;
}

let rankingList = [];

function rankingListInit() {
    for (let charId in characterBasicInfo) {
        const baseInfo = characterBasicInfo[charId];
        let rankInfo = {
            charId: charId,
            name: baseInfo.name,
            rarity: baseInfo.rarity,
            own: 0,
            elite2: 0,
            skill1: {'rank3': 0},
            skill2: {'rank3': 0},
            skill3: {'rank3': 0},
            modX: {'rank3': 0},
            modY: {'rank3': 0},
            profession: baseInfo.profession,
            itemObtainApproach: baseInfo.itemObtainApproach,
            mod: baseInfo.mod !== undefined,
            skill: baseInfo.skill,
            show: true,
        };

        if (rankInfo.rarity < 6) {
            // console.log(rankInfo)
            rankInfo.skill3 = {rank3: undefined}
        }

        rankingList.push(rankInfo);
    }

    rankingList.sort((a, b) => {
        return b.rarity - a.rarity;
    });
    return rankingList;
}


/**
 * 控制折叠栏的通用方法
 * @param collapse_item_class  传入所有折叠内容的样式名称  比如在id为collapse的元素中有10个样式为collapse_item的元素，折叠或展开的高度即为10个collapse_item的高度
 * @param collapse_box_id 传入折叠内容盒子的元素id
 * @param collapse_wrap_id  传入折叠内容盒子外的套子的元素id
 */
function collapse(collapse_item_class, collapse_wrap_id, collapse_box_id) {
    // 包裹折叠内容的元素高度
    const wrapHeight = document.getElementById(collapse_wrap_id).offsetHeight;
    //获取所有折叠内容的样式高度
    let elements = document.getElementsByClassName(collapse_item_class);
    // const collapse_box_element = document.getElementById(collapse_box_id);
    // const collapse_box_computed_style = window.getComputedStyle(collapse_box_element, null);
    // const marginTop = parseInt(collapse_box_computed_style.marginTop.replace('px','')) ;
    // const marginBottom = parseInt(collapse_box_computed_style.marginBottom.replace('px',''));
    // let height = marginTop+marginBottom
    let height = 8;
    for (let e of elements) {
        height += e.offsetHeight;
    }

    document.getElementById(collapse_box_id).style.transform = 'translateY(-' + height + 'px)';

    // document.getElementById(collapse_box_id).style.transform = 'translateY(0)';

    // 包裹折叠内容的元素高度小于1则展开
    if (wrapHeight < 1) {
        //设置包裹折叠内容的元素高度为所有折叠内容的样式高度
        document.getElementById(collapse_wrap_id).style.height = height + "px";
        // console.log("通用展开高度", height + "px");
        //等待过渡动画结束将包裹折叠内容的元素高度设为auto

        setTimeout(() => {
            document.getElementById(collapse_box_id).style.transform = 'translateY(0)';
            document.getElementById(collapse_wrap_id).style.height = "auto";
        }, 50);
    } else {
        //设置包裹折叠内容的元素高度为展开高度，因为过渡动画需要一个高度

        document.getElementById(collapse_wrap_id).style.height = height + "px";
        //设置包裹折叠内容的元素高度为0
        document.getElementById(collapse_box_id).style.transform = 'translateY(-' + height + 'px)';
        setTimeout(() => {
            document.getElementById(collapse_wrap_id).style.height = 0 + "px";
        }, 100);
    }
}


export {
    characterListInit,
    getProfession,
    professionDict,
    yearDict,
    scoreListInit,
    rankingListInit,
    collapse,
    filterByCharacterProperty,
    calAPCost
};
