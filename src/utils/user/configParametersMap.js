// 预设项

/**
 * 合成玉价值
 */
const orundumValueMap = {
    'ORUNDUM_PRICING_ORIGINITE_PRIME': 0.75,  // 碎石途径定价（默认）
    'ORUNDUM_PRICING_ORININUM_FARMING_ORIROCK_CUBE': null,  // 搓玉途径定价（用固源岩搓玉）
    'ORUNDUM_PRICING_ORININUM_FARMING_DEVICE': null,  // 搓玉途径定价（用装置搓玉）
    'ORUNDUM_PRICING_INFINITY': Infinity,  // 仅抽卡
    'ORUNDUM_PRICING_CUSTOM': undefined,  // 自定义
};

/**
 * 至纯源石价值系数
 */
const originitePrimeCoefficientMap = {
    'ORIGINITE_PRIME_PRICING_ORUNDUM': 180,  // 1 至纯源石 = 180 合成玉（默认）
    'ORIGINITE_PRIME_PRICING_INFINITY': Infinity,  // 1 至纯源石 = ∞ 合成玉（源石仅买装扮）
    'ORIGINITE_PRIME_PRICING_CUSTOM': undefined,  // 自定义
};

/**
 * 中坚寻访凭证价值系数
 */
const kernelHeadhuntingPermitCoefficientMap = {
    'KERNEL_HEADHUNTING_PERMIT_PRICING_DISTINCTION_CERTIFICATE': 216 / 258,  // 38 中坚寻访凭证 = 216 高级凭证（默认）
    'KERNEL_HEADHUNTING_PERMIT_PRICING_ZERO': 0,  // 中坚寻访凭证价值为 0
    'KERNEL_HEADHUNTING_PERMIT_PRICING_CUSTOM': undefined,  // 自定义
};

/**
 * 龙门币价值系数
 */
const lmdCoefficientMap = {
    'LMD_PRICING_CE-6': 1,  // 按 CE-6 定价（默认）
    'LMD_PRICING_ZERO': 0,  // 龙门币价值为 0
    'LMD_PRICING_CUSTOM': undefined,  // 自定义
};

/**
 * EXP 价值系数
 */
const expCoefficientMap = {
    // 按 LS-6 定价
    'EXP_PRICING_LS-6': 598 / 625, // 0.9568
    // EXP 价值为 0
    'EXP_PRICING_ZERO': 0,
    // 按无人机定价（默认），3 级贸易站，不使用龙舌兰、但书、裁缝类技能
    'EXP_PRICING_BASE_LVL_3_TRADING_POST': 145 / 229,  // 0.6332
    // 按无人机定价，3 级贸易站，使用精 2 龙舌兰、精 2 但书、不使用裁缝类技能
    'EXP_PRICING_BASE_LVL_3_TRADING_POST_TEQUILA_2_PROVISO_2': 235 / 293,  // 0.8020
    // 按无人机定价，2 级贸易站，使用精 2 但书，不使用龙舌兰、裁缝类技能
    'EXP_PRICING_BASE_LVL_2_TRADING_POST_PROVISO_2': 165 / 203,  // 0.8128
    // 按无人机定价，1 级贸易站，使用精 2 但书，不使用龙舌兰、裁缝类技能
    'EXP_PRICING_BASE_LVL_1_TRADING_POST_PROVISO_2': 5 / 6,  // 0.8333
    // 自定义
    'EXP_PRICING_CUSTOM': undefined,
};

/**
 * 模组数据块价值
 */
const modUnlockTokenValueMap = {
    'MOD_UNLOCK_TOKEN_PRICING_PURCHASE_CERTIFICATE': null,  // 采购凭证区定价（默认）
    'MOD_UNLOCK_TOKEN_PRICING_DISTINCTION_CERTIFICATE': null,  // 高级凭证区定价
    'MOD_UNLOCK_TOKEN_PRICING_CUSTOM': undefined,  // 自定义
};

/**
 * 招聘许可价值
 */
const recruitmentPermitValueMap = {
    'RECRUITMENT_PERMIT_PRICING_3_4': null,  // 5★、6★ 未满潜（默认）
    'RECRUITMENT_PERMIT_PRICING_3_4_5': null,  // 5★ 全满潜，6★ 未满潜
    'RECRUITMENT_PERMIT_PRICING_3_4_5_6': null,  // 全满潜
    'RECRUITMENT_PERMIT_PRICING_CUSTOM': undefined,  // 自定义
};

/**
 * 加急许可价值
 */
const expeditedPlanValueMap = {
    'EXPEDITED_PLAN_PRICING_ZERO': 0,  // 加急许可价值为 0（默认）
    'EXPEDITED_PLAN_PRICING_RECRUITMENT_PERMIT': null,  // 等于招聘许可价值
    'EXPEDITED_PLAN_PRICING_CUSTOM': undefined,  // 自定义
};

/**
 * 家具零件价值
 */
const furniturePartValueMap = {
    'FURNITURE_PART_PRICING_ZERO': 0,  // 家具零件价值为 0（默认）
    'FURNITURE_PART_PRICING_SK-5': null,  // 按 SK-5 定价
    'FURNITURE_PART_PRICING_CUSTOM': undefined,  // 自定义
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
