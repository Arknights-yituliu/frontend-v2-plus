import {operatorTable} from "/src/utils/gameData.js";


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
    {
        label: "2024",
        start: 1704038400000,
        end: 1735660799000
    }
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



export {
    getProfession,
    professionDict,
    yearDict
};
