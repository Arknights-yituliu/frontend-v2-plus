import { getUid } from "@/utils/user/userInfo.js";
import { ref } from "vue";

// 预设项

/**
 * 合成玉价值
 */
const orundumValueMap = {
    'ORUNDUM_PRICING_ORIGINITE_PRIME': 0.75,
    'ORUNDUM_PRICING_ORININUM_FARMING_ORIROCK_CUBE': null,
    'ORUNDUM_PRICING_ORININUM_FARMING_DEVICE': null,
    'ORUNDUM_PRICING_INFINITY': Infinity,
    'ORUNDUM_PRICING_CUSTOM': undefined,
};

/**
 * 至纯源石价值系数
 */
const originitePrimeCoefficientMap = {
    'ORIGINITE_PRIME_PRICING_ORUNDUM': 180,
    'ORIGINITE_PRIME_PRICING_INFINITY': Infinity,
    'ORIGINITE_PRIME_PRICING_CUSTOM': undefined,
};

/**
 * 中坚寻访凭证价值系数
 */
const kernalHeadhuntingPermitCoefficientMap = {
    'KERNAL_HEADHUNTING_PERMIT_PRICING_DISTINCTION_CERTIFICATE': 216 / 258,
    'KERNAL_HEADHUNTING_PERMIT_PRICING_ZERO': 0,
    'KERNAL_HEADHUNTING_PERMIT_PRICING_CUSTOM': undefined,
};

/**
 * 龙门币价值系数
 */
const lmdCoefficientMap = {
    'LMD_PRICING_CE-6': 1,
    'LMD_PRICING_ZERO': 0,
    'LMD_PRICING_CUSTOM': undefined,
};

/**
 * EXP 价值系数
 */
const expCoefficientMap = {
    'EXP_PRICING_LS-6': 598 / 625, // 0.9568
    'EXP_PRICING_ZERO': 0,
    'EXP_PRICING_BASE_LVL_3_TP': 145 / 229,  // 0.6332
    'EXP_PRICING_BASE_LVL_3_TP_TEQUILA_2_PROVISO_2': 235 / 293,  // 0.8020
    'EXP_PRICING_BASE_LVL_2_TP_PROVISO_2': 165 / 203,  // 0.8128
    'EXP_PRICING_BASE_LVL_1_TP_PROVISO_2': 5 / 6,  // 0.8333
    'EXP_PRICING_CUSTOM': undefined,
};

/**
 * 模组数据块价值
 */
const modUnlockTokenValueMap = {
    'MOD_UNLOCK_TOKEN_PRICING_PURCHASE_CERTIFICATE': null,
    'MOD_UNLOCK_TOKEN_PRICING_DISTINCTION_CERTIFICATE': null,
    'MOD_UNLOCK_TOKEN_PRICING_CUSTOM': undefined,
};

/**
 * 招聘许可价值
 */
const recruitmentPermitValueMap = {
    'RECRUITMENT_PERMIT_PRICING_3_4': null,
    'RECRUITMENT_PERMIT_PRICING_3_4_5': null,
    'RECRUITMENT_PERMIT_PRICING_3_4_5_6': null,
    'RECRUITMENT_PERMIT_PRICING_CUSTOM': undefined,
};

/**
 * 加急许可价值
 */
const expeditedPlanValueMap = {
    'EXPEDITED_PLAN_PRICING_ZERO': 0,
    'EXPEDITED_PLAN_PRICING_RECRUITMENT_PERMIT': null,
    'EXPEDITED_PLAN_PRICING_CUSTOM': undefined,
};

/**
 * 家具零件价值
 */
const furniturePartValueMap = {
    'FURNITURE_PART_PRICING_ZERO': 0,
    'FURNITURE_PART_PRICING_SK-5': null,
    'FURNITURE_PART_PRICING_CUSTOM': undefined,
};

/**
 * 默认用户配置
 */
const defaultConfig = {
    source: 'penguin',

    // 定价作战集
    useActivityStage: false,
    useActivityAverageStage: false,
    sampleSize: 300,
    stageBlacklist: [],
    stageWhitelist: [],  // 关卡白名单，该配置暂未实现


    // 自定义其他物品价值
    orundumPricingStrategy: "ORUNDUM_PRICING_ORIGINITE_PRIME",  // 合成玉定价策略
    orundumValue: 3 / 4,  // 合成玉价值

    originitePrimePricingStrategy: "ORIGINITE_PRIME_PRICING_ORUNDUM",  // 至纯源石定价策略
    originitePrimeCoefficient: 180,  // 至纯源石价值系数

    kernalHeadhuntingPermitPricingStrategy: "KERNAL_HEADHUNTING_PERMIT_PRICING_DISTINCTION_CERTIFICATE",  // 中坚寻访凭证定价策略
    kernalHeadhuntingPermitCoefficient: 216 / 258,  // 中坚寻访凭证价值系数

    lmdPricingStrategy: "LMD_PRICING_CE-6",  // 龙门币定价策略
    lmdCoefficient: 1,  // 龙门币价值系数

    expPricingStrategy: "EXP_PRICING_BASE_LVL_3_TP",  // EXP 定价策略
    expCoefficient: 145 / 229,  // EXP 价值系数

    modUnlockTokenPricingStrategy: "MOD_UNLOCK_TOKEN_PRICING_PURCHASE_CERTIFICATE",  // 模组数据块定价策略
    modUnlockTokenValue: 120 * 30 / 21,  // 模组数据块价值

    recruitmentPermitPricingStrategy: "RECRUITMENT_PERMIT_PRICING_3_4",  // 招聘许可定价策略
    recruitmentPermitValue: null,  // 招聘许可价值

    expeditedPlanPricingStrategy: "EXPEDITED_PLAN_PRICING_ZERO",  // 加急许可定价策略
    expeditedPlanValue: 0,  // 加急许可价值

    furniturePartPricingStrategy: "FURNITURE_PART_PRICING_ZERO",  // 家具零件定价策略
    furniturePartValue: 0,  // 家具零件价值

    // 自定义精英材料价值
    customItem: [
        {
            itemId: "30073",  // 轻锰矿
            itemValue: 1.8,
        },
        {
            itemId: "30083",  // 扭转醇
            itemValue: 2.16,
        },
    ],

    workshopEliteMaterialByProductRate: 0.2,  // 待弃用的配置项
    workshopSkillSummaryByProductRate: 0.18,  // 待弃用的配置项

    // TODO: 加工站副产品策略，该配置暂未实现
    workshopStrategy: {
        eliteMaterialT1toT2: {
            strategy: "WORKSHOP_STRATEGY_NCDEER",
            byproductRateIncreasement: null,
        },
        eliteMaterialT2toT3: {
            strategy: "WORKSHOP_STRATEGY_NCDEER",
            byproductRateIncreasement: null,
        },
        eliteMaterialT3toT4: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncreasement: 1,
        },
        eliteMaterialT4toT5: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncreasement: 1,
        },
        skillSummary1to2: {
            strategy: "WORKSHOP_STRATEGY_NCDEER",
            byproductRateIncreasement: null,
        },
        skillSummary2to3: {
            strategy: "WORKSHOP_STRATEGY_NCDEER",
            byproductRateIncreasement: null,
        },
        // TODO: 芯片策略暂未实现（因为芯片组用九色鹿是赚的，还需要思考细节）
        // chipStrategy: {
        //     strategy: "WORKSHOP_STRATEGY_NCDEER",
        //     byproductRateIncreasement: null,
        // },
        // chipPackStrategy: {
        //     strategy: "WORKSHOP_STRATEGY_NCDEER",
        //     byproductRateIncreasement: null,
        // },
        baseMaterial: {
            strategy: "WORKSHOP_STRATEGY_NCDEER",
            byproductRateIncreasement: null,
        },
    },

    chipPreference: {
        TANK_MEDIC: "BALANCED",
        SNIPER_CASTER: "BALANCED",
        PIONEER_SUPPORT: "BALANCED",
        WARRIOR_SPECIAL: "BALANCED",
    },
};


/**
 * 反序列化配置
 * 解析时会将字符串 `"Infinity"`、`"-Infinity"` 和 `"NaN"` 转换为对应的数值。
 * @param {string} configString
 * @returns {Object} 解析后的配置对象
 */
function parseConfig(configString) {
    return JSON.parse(
        configString,
        (key, value) => {
            // 如果是字符串，尝试转换为数字
            switch (value) {
                case "Infinity":
                    return Infinity;
                case "-Infinity":
                    return -Infinity;
                case "NaN":
                    return NaN;
                default:
                    return value;
            }
        },
    );
}

/**
 * 序列化配置
 * 序列化时会将 `Infinity`、`-Infinity` 和 `NaN` 转换为对应的字符串。
 * @param {Object} config
 * @returns {string} 序列化后的配置
 */
function stringifyConfig(config) {
    return JSON.stringify(
        config,
        (key, value) => {
            switch (value) {
                case Infinity:
                    return "Infinity"; // 将 Infinity 转换为字符串
                case -Infinity:
                    return "-Infinity"; // 将 -Infinity 转换为字符串
                case NaN:
                    return "NaN"; // 将 NaN 转换为字符串
                default:
                    return value; // 其他值保持不变
            }
        },
        2,
    );
}

// 冒充一下 deepcopy
let stageConfig = ref(parseConfig(stringifyConfig(defaultConfig)));

/**
 * 获取关卡配置
 * @returns {Object} 用户配置
*/
function getStageConfig() {
    const cacheStageConfig = localStorage.getItem("StageConfig");
    if (cacheStageConfig) {
        let config = parseConfig(cacheStageConfig);
        if (!config.customItem) {
            config.customItem = [];
        }

        for (const key in config) {
            stageConfig.value[key] = config[key];
        }

        return stageConfig.value;
    } else {
        return defaultConfig;
    }
}


// let customItemMap = new Map()
//
// for(const item of config.customItem){
//     item.itemValue = stringToNumber( item.itemValue)
//     customItemMap.set(item.itemId, item)
// }
//
// for(const itemId in actStoreUnlimitedExchangeItem){
//     if(!customItemMap.has(itemId)){
//         customItemMap.set(itemId,{
//             itemId:itemId,
//             itemValue:actStoreUnlimitedExchangeItem[itemId],
//         })
//     }
// }
//
// let list = []
// for(const [key,value] of customItemMap){
//     list.push(value)
// }
// config.customItem = list

export {
    defaultConfig,
    stageConfig,
    getStageConfig,
    parseConfig,
    stringifyConfig,
    orundumValueMap,
    originitePrimeCoefficientMap,
    kernalHeadhuntingPermitCoefficientMap,
    lmdCoefficientMap,
    expCoefficientMap,
    modUnlockTokenValueMap,
    recruitmentPermitValueMap,
    expeditedPlanValueMap,
    furniturePartValueMap
};
