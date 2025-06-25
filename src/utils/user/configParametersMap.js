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
const kernelHeadhuntingPermitCoefficientMap = {
    'KERNEL_HEADHUNTING_PERMIT_PRICING_DISTINCTION_CERTIFICATE': 216 / 258,
    'KERNEL_HEADHUNTING_PERMIT_PRICING_ZERO': 0,
    'KERNEL_HEADHUNTING_PERMIT_PRICING_CUSTOM': undefined,
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


export {
    orundumValueMap,
    originitePrimeCoefficientMap,
    kernelHeadhuntingPermitCoefficientMap,
    lmdCoefficientMap,
    expCoefficientMap,
    modUnlockTokenValueMap,
    recruitmentPermitValueMap,
    expeditedPlanValueMap,
    furniturePartValueMap
};
