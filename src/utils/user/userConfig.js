import { getUid } from "@/utils/user/userInfo.js";
import { ref } from "vue";


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
    stageWhitelist: [],  // 作战白名单，该配置暂未实现


    // 自定义其他物品价值
    orundumPricingStrategy: "ORUNDUM_PRICING_ORIGINITE_PRIME",  // 合成玉定价策略
    orundumValue: 3 / 4,  // 合成玉价值

    originitePrimePricingStrategy: "ORIGINITE_PRIME_PRICING_ORUNDUM",  // 至纯源石定价策略
    originitePrimeCoefficient: 180,  // 至纯源石价值系数

    kernelHeadhuntingPermitPricingStrategy: "KERNEL_HEADHUNTING_PERMIT_PRICING_DISTINCTION_CERTIFICATE",  // 中坚寻访凭证定价策略
    kernelHeadhuntingPermitCoefficient: 216 / 258,  // 中坚寻访凭证价值系数

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
            itemId: "30073",  // 扭转醇
            itemValue: 1.8,
        },
        {
            itemId: "30083",  // 轻锰矿
            itemValue: 2.16,
        },
    ],

    // 加工站策略
    workshopStrategy: {
        eliteMaterialT1toT2: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 1,
        },
        eliteMaterialT2toT3: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 1,
        },
        eliteMaterialT3toT4: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 1,
        },
        eliteMaterialT4toT5: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 1,
        },
        skillSummary1to2: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 0.8,
        },
        skillSummary2to3: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 0.8,
        },
        baseMaterial: {
            strategy: "WORKSHOP_STRATEGY_NCDEER_OBTAIN",
            byproductRateIncrease: null,
        },
        chip: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 0.8,
        },
        chipPack: {
            strategy: "WORKSHOP_STRATEGY_COMMON",
            byproductRateIncrease: 0.8,
        },
    },

    // 芯片加工策略
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

// 冒充一下 deepCopy
let stageConfig = ref(parseConfig(stringifyConfig(defaultConfig)));

/**
 * 获取关卡配置
 * @returns {Object} 用户配置
*/
function getStageConfig() {
    const cacheStageConfig = localStorage.getItem("StageConfig");
    if (cacheStageConfig) {
        // let config = parseConfig(cacheStageConfig);
        // if (!config.customItem) {
        //     config.customItem = [];
        // }
        //
        // for (const key in config) {
        //     stageConfig.value[key] = config[key];
        // }

        return stageConfig.value;
    } else {
        return defaultConfig;
    }
}


export {
    defaultConfig,
    stageConfig,
    getStageConfig,
    parseConfig,
    stringifyConfig,
};
