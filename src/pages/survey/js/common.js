import characterBasicInfo from "/src/static/json/survey/character_table_simple.json";


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
    {label: "先锋", value: "PIONEER"},
    {label: "近卫", value: "WARRIOR"},
    {label: "重装", value: "TANK"},
    {label: "狙击", value: "SNIPER"},
    {label: "术师", value: "CASTER"},
    {label: "医疗", value: "MEDIC"},
    {label: "辅助", value: "SUPPORT"},
    {label: "特种", value: "SPECIAL"},
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
            property === 'itemObtainApproach') {
            const flag = determineProperty(filterCondition, characterInfo, property);
            show = show && flag
        }
        if(property === 'equip'){
            const flag = determineHasProperty(filterCondition, characterInfo, property);
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

function determineHasProperty(filterCondition, characterInfo, property) {
    if (filterCondition[property].length === 0) return true;
    for (let condition of filterCondition[property]) {

        if (((characterInfo[property] === void 0) === condition)) {
            return false;
        }
    }
    return true;
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

        let default_show = false;

        if (baseData.rarity === 6) {
            default_show = true
        }

        let character = {
            charId: charId,
            name: baseData.name,
            own: false,
            level: -1,
            modX: -1,
            modY: -1,
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
            equip:baseData.equip,
            show: default_show
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
            skill: baseInfo.skill,
            show: true,
        };

        if (rankInfo.rarity < 6) {
            // console.log(rankInfo)
            rankInfo.skill3 = {rank3: void 0}
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
    filterByCharacterProperty
};
