
import RIIC_TERMS from "/src/vendor/riic-efficiency/data/terms.json";

const termMembers = (termId) => RIIC_TERMS.terms[termId]?.members || [];
const termMemberSet = (...termIds) =>
    new Set(termIds.flatMap((termId) => termMembers(termId)));

const SuiMembers = termMemberSet("cc.g.sui");
const DurinMembers = termMemberSet("cc.tag.durin");
const KnightMembers = termMemberSet("cc.tag.knight");
const AutomationSkillNames = new Set(
    ["cc.m.pow1", "cc.m.pow2", "cc.m.pow3"]
        .map((termId) => RIIC_TERMS.terms[termId]?.name)
        .filter(Boolean),
);
const AutomationMembers = new Set(["Lancet-2", "清流", "冬时", "承曦格雷伊"]);
const RhineTechSkills = termMemberSet("cc.sk.manu2");
const SEESMembers = termMemberSet("cc.tag.sees");

//势力组合：术语成员 + 术语表未收录的异格 + 技能描述中引用该势力的干员（如八幡海铃引用叙拉古）
const factionCondition = ({label, termIds = [], members = [], keywords = []}) => {
    const memberSet = new Set([...termMemberSet(...termIds), ...members]);
    return {
        label,
        func: (operator) => memberSet.has(operator.name) ||
            keywords.some((keyword) => operator.description.includes(keyword) || operator.buffName.includes(keyword)),
    };
};

//干员基建技能筛选表，筛选类型：{name：筛选类型名称,color:筛选类型名称字体颜色,conditions:[{label:筛选条件描述,func:筛选函数,传入干员信息进行筛选}]}
const operatorFilterConditionTable = {
    room: {
        name: "buildSkillFilter.RoomType",
        display: true,
        color:'inherit',
        buttonColor:'blue',
        conditions: [
            {
                label: "buildSkillFilter.Trading",
                roomType: 'trading',
                func: (operator) => {
                    return operator.roomType === 'trading'
                }
            },
            {
                label: "buildSkillFilter.Factory",
                roomType: 'manufacture',    
                func: (operator) => {
                    return operator.roomType === 'manufacture'
                }
            },
            {
                label: "buildSkillFilter.Office",
                roomType: 'hire',    
                func: (operator) => {
                    return operator.roomType === 'hire'
                }
            },
            {
                label: "buildSkillFilter.Workshop",
                roomType: 'workshop',    
                func: (operator) => {
                    return operator.roomType === 'workshop'
                }
            },
            {
                label: "buildSkillFilter.Dormitory",
                roomType: 'dormitory',    
                func: (operator) => {
                    return operator.roomType === 'dormitory'
                }
            },
            {
                label: "buildSkillFilter.Control",
                roomType: 'control',    
                func: (operator) => {
                    return operator.roomType === 'control'
                }
            },
            {
                label: "buildSkillFilter.Power",
                roomType: 'power',    
                func: (operator) => {
                    return operator.roomType === 'power'
                }
            },
            {
                label: "buildSkillFilter.Reception",
                func: (operator) => {
                    return operator.roomType === 'meeting'
                }
            },  
            {
                label: "buildSkillFilter.Training",
                roomType: 'training',    
                func: (operator) => {
                    return operator.roomType === 'training'
                }
            },
            {
                label: "buildSkillFilter.Recycle",
                roomType: 'recycle',
                func: (operator) => {
                    return operator.roomType === 'recycle'
                }
            },
        ]
    },
    manufacture: {
        name: "buildSkillFilter.Factory",
        color:'#ff641e',
        display: true,
        buttonColor:'orange',
        conditions: [
            {
                label: "buildSkillFilter.GeneralWokers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('生产力') > -1 &&
                         operator.description.indexOf('配方') < 0
                }
            },
            {
                label: "buildSkillFilter.GoldWorkers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('贵金属') > -1
                }
            },
            {
                label: "buildSkillFilter.EXPWorkersRecord",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('作战记录') > -1
                }
            },
            {
                label: "buildSkillFilter.OrundumWorkers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('源石') > -1
                }
            },
            {
                label: "buildSkillFilter.CAPLimitWokers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('仓库容量上限') > -1
                }
            },
            {
                label: "buildSkillFilter.StandardizationTeam",
                func: (operator) => {
                    return operator.roomType === 'manufacture' &&
                        (operator.buffName.indexOf('标准化') > -1 || operator.description.indexOf('标准化') > -1)
                }
            },
            {
                label: "buildSkillFilter.RhineTechTeam",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.buffName.indexOf('莱茵科技') > -1
                }
            }
        ]
    },
    trading: {
        name: "buildSkillFilter.Trading",
        color:'#00a9f6',
        display: true,
        buttonColor:'blue',
        conditions: [
            {
                label: "buildSkillFilter.OrderAcquisitionEfficiency",
                func: (operator) => {
                    return operator.roomType === 'trading'  &&
                        operator.description.indexOf('效率') > -1
                }
            },
            {
                label: "buildSkillFilter.OrderLimit",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('订单上限') > -1
                }
            },
            {
                label: "buildSkillFilter.BetterOrders",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('高品质') > -1
                }
            }
        ]
    },
    control: {
        name: "buildSkillFilter.Control",
        color:'#007e1d',
        display: true,
        buttonColor:'green',
        conditions: [
            {
                label: "buildSkillFilter.OrderAcquisitionEfficiency",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('订单') > -1 &&
                        operator.description.indexOf('效率') > -1
                }
            },
            {
                label: "buildSkillFilter.ProductionEfficiency",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('生产力') > -1
                }
            },
            {
                label: "buildSkillFilter.MoraleDrain/Restore",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('心情') > -1
                }
            },
            {
                label: "buildSkillFilter.TeamRainbowTeam",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.buffName.indexOf('彩虹小队') > -1
                }
            }
        ]
    },
    faction: {
        name: "buildSkillFilter.Faction",
        color:'#b476ff',
        display: true,
        buttonColor:'purple',
        conditions: [
            factionCondition({
                label: "buildSkillFilter.SiracusaTeam",
                termIds: ["cc.g.siracusa"],
                keywords: ["叙拉古"],
            }),
            factionCondition({
                label: "buildSkillFilter.GlasgowTeam",
                termIds: ["cc.g.glasgow"],
                members: ["戴菲恩"],
                keywords: ["格拉斯哥帮"],
            }),
            factionCondition({
                label: "buildSkillFilter.RhineLabTeam",
                termIds: ["cc.g.rh"],
                members: ["淬羽赫默", "溯光星源"],
                keywords: ["莱茵生命"],
            }),
            factionCondition({
                label: "buildSkillFilter.AbyssalHuntersTeam",
                termIds: ["cc.g.abyssal"],
                members: ["归溟幽灵鲨"],
                keywords: ["深海猎人"],
            }),
            factionCondition({
                label: "buildSkillFilter.BlacksteelTeam",
                termIds: ["cc.g.bs"],
                members: ["涤火杰西卡"],
                keywords: ["黑钢国际"],
            }),
            factionCondition({
                label: "buildSkillFilter.EliteOperators",
                termIds: ["cc.g.elite"],
                keywords: ["精英干员"],
            }),
        ]
    },
    system: {
        name: "buildSkillFilter.System",
        color:'#b476ff',
        display: true,
        buttonColor:'purple',
        conditions: [
            {
                label: "buildSkillFilter.PerceptionInformation",
                func: (operator) => {
                    return operator.description.indexOf('感知信息') > -1 || operator.description.indexOf('无声共鸣') > -1 ||
                        RosmontisUniverse.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.WorldlyPlight",
                func: (operator) => {
                    return operator.description.indexOf('人间烟火') > -1 ||
                        SuiMembers.has(operator.name) || operator.name === '琴柳'
                }
            },
            {
                label: "buildSkillFilter.GoldProductionLine",
                func: (operator) => {
                    return operator.description.indexOf('赤金生产线') > -1 || DurinMembers.has(operator.name)
                }
            },
            {
                label: "buildSkillFilter.AutomationTeam",
                func: (operator) => {
                    return AutomationSkillNames.has(operator.buffName) || AutomationMembers.has(operator.name)
                }
            },
            {
                label: "buildSkillFilter.RhineTechTeam",
                func: (operator) => {
                    return RhineTechSkills.has(operator.buffName)
                }
            },
            {
                label: "buildSkillFilter.KnightsTeam",
                func: (operator) => {
                    return KnightMembers.has(operator.name)
                }
            },
            {
                label: "buildSkillFilter.SEESTeam",
                func: (operator) => {
                    return SEESMembers.has(operator.name)
                }
            }
        ]
    },
}

// Official english name is "Rosmontis"
const RosmontisUniverse = ['琴柳']

// selectedConditions 元素为 {groupKey, condition}，用 label 比较避免响应式代理导致的引用比较失效
const isConditionSelected = (selectedConditions, groupKey, condition) =>
    selectedConditions.some(item =>
        item.groupKey === groupKey && item.condition.label === condition.label);

//多选交集：干员必须为每个条件各命中至少一条技能，返回命中技能的并集（保持原行顺序）
const filterSkillsByConditions = (skills, conditions, keywordPredicate) => {
    const candidates = keywordPredicate ? skills.filter(keywordPredicate) : skills;

    if (conditions.length === 0) {
        return candidates;
    }

    const matchedSkills = new Set();
    for (const condition of conditions) {
        let conditionMatched = false
        for (const skill of candidates) {
            if (condition.func(skill)) {
                matchedSkills.add(skill)
                conditionMatched = true
            }
        }
        if (!conditionMatched) {
            return []
        }
    }

    return skills.filter(skill => matchedSkills.has(skill))
}

export {operatorFilterConditionTable, isConditionSelected, filterSkillsByConditions}
