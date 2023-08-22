import characterBasicInfo from "@/static/json/survey/character_table_simple.json";
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


/**
 * 控制折叠栏的通用方法
 * @param collapse_item_class  传入所有折叠内容的样式名称  比如在id为collapse的元素中有10个样式为collapse_item的元素，折叠或展开的高度即为10个collapse_item的高度
 * @param collapse_id  传入包裹折叠内容的元素id
 */
function collapse(collapse_item_class, collapse_id) {
    // 包裹折叠内容的元素高度
    const wrapHeight = document.getElementById(collapse_id).offsetHeight;
    //获取所有折叠内容的样式高度
    let elements = document.getElementsByClassName(collapse_item_class);
    let height = 0;
    for (let e of elements) {
        height += e.offsetHeight;
    }

    //包裹折叠内容的元素高度小于1则展开
    if (wrapHeight < 1) {
        //设置包裹折叠内容的元素高度为所有折叠内容的样式高度
        document.getElementById(collapse_id).style.height = height + "px";
        // console.log("通用展开高度", height + "px");
        //等待过渡动画结束将包裹折叠内容的元素高度设为auto
        setTimeout(() => {
            document.getElementById(collapse_id).style.height = "auto";
        }, 300);
    } else {
        //设置包裹折叠内容的元素高度为展开高度，因为过渡动画需要一个高度
        document.getElementById(collapse_id).style.height = height + "px";
        //设置包裹折叠内容的元素高度为0
        setTimeout(() => {
            document.getElementById(collapse_id).style.height = 0 + "px";
        }, 100);
    }
}

function filterByCharacterProperty(filterCondition, character) {
    let show = true;
    for (const property in filterCondition) {

        if (property === 'rarity' || property === 'profession' || property === 'own' ||
            property === 'mod' || property === 'itemObtainApproach') {
            const flag = determineProperty(filterCondition, character, property);
            show = show && flag
        }
        if (property === 'year') {
            const flag = determineYear(filterCondition,character);
            show = show && flag
        }
    }

    return show;
}


//是否有这个属性
function determineProperty(filterCondition, character, property) {
    if (filterCondition[property].length === 0) return true;
    for (let value of filterCondition[property]) {
        if (character[property] === value) {
            return true;
        }
    }
    return false;
}

//是否在这个年份
function determineYear(filterCondition, character) {
    if (filterCondition.year.length === 0) return true;
    for (let value of filterCondition.year) {
        // console.log(filterRules.value.year[r])
        let year = yearDict[value];
        // console.log(character.date, ">=", year.start, character.date, "<=", year.end);
        if (character.date >= year.start && character.date <= year.end) {
            return true;
        }
    }
    return false;
}

let characterList = [];

//干员基础数据
function characterListInit() {
    for (let charId in characterBasicInfo) {
        const baseInfo = characterBasicInfo[charId];
        // if (baseInfo.rarity < 5) continue;
        let modXOwn = false;
        let modYOwn = false;

        if (baseInfo.mod !== undefined) {
            if (baseInfo.mod.modX) {
                modXOwn = true;
            }
            if (baseInfo.mod.modY) {
                modYOwn = true;
            }
        }
        let character = {
            charId: charId,
            name: baseInfo.name,
            own: false,
            level: -1,
            modX: -1,
            modXOwn: modXOwn,
            modY: -1,
            modYOwn: modYOwn,
            elite: -1,
            potential: -1,
            rarity: baseInfo.rarity,
            skill1: -1,
            skill2: -1,
            skill3: -1,
            skill: baseInfo.skill,
            date: baseInfo.date,
            itemObtainApproach: baseInfo.itemObtainApproach,
            profession: baseInfo.profession,
            mod: baseInfo.mod !== undefined,
            show: true,
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
            countermeasures: -1,
            date: baseInfo.date,
            profession: baseInfo.profession,
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

function rankingListinit() {
    for (let charId in characterBasicInfo) {
        const baseInfo = characterBasicInfo[charId];
        let score = {
            charId: charId,
            name: baseInfo.name,
            rarity: baseInfo.rarity,
            own: 0,
            elite: {},
            skill1: {},
            skill2: {},
            skill3: {},
            modX: {},
            modY: {},
            mod: baseInfo.mod !== undefined,
            skill: baseInfo.skill,
            show: true,
        };
        rankingList.push(score);
    }

    rankingList.sort((a, b) => {
        return b.rarity - a.rarity;
    });
    return rankingList;
}

export {characterListInit, getProfession, professionDict, yearDict, scoreListInit, rankingListinit, collapse, filterByCharacterProperty};
