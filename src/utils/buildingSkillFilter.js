
//干员基建技能筛选表，筛选类型：{name：筛选类型名称,color:筛选类型名称字体颜色,conditions:[{label:筛选条件描述,func:筛选函数,传入干员信息进行筛选}]}
const operatorFilterConditionTable = {
    room: {
        name: "buildSkillFilter.RoomType",
        display: true,
        color:'inherit',
        conditions: [
            {
                label: "buildSkillFilter.Trading",
                func: (operator) => {
                    return operator.roomType === 'trading'
                }
            },
            {
                label: "buildSkillFilter.Factory",
                func: (operator) => {
                    return operator.roomType === 'manufacture'
                }
            },
            {
                label: "buildSkillFilter.Office",
                func: (operator) => {
                    return operator.roomType === 'hire'
                }
            },
            {
                label: "buildSkillFilter.Workshop",
                func: (operator) => {
                    return operator.roomType === 'workshop'
                }
            },
            {
                label: "buildSkillFilter.Dormitory",
                func: (operator) => {
                    return operator.roomType === 'dormitory'
                }
            },
            {
                label: "buildSkillFilter.Control",
                func: (operator) => {
                    return operator.roomType === 'control'
                }
            },
            {
                label: "buildSkillFilter.Power",
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
                func: (operator) => {
                    return operator.roomType === 'training'
                }
            },
        ]
    },
    manufacture: {
        name: "buildSkillFilter.Factory",
        color:'#ff641e',
        display: true,
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
            }
        ]
    },
    trading: {
        name: "buildSkillFilter.Trading",
        color:'#00a9f6',
        display: true,
        conditions: [
            {
                label: "buildSkillFilter.OrderAcquisitionEfficiency",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('订单') > -1 && operator.description.indexOf('效率') > -1
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
        conditions: [
            {
                label: "buildSkillFilter.OrderAcquisitionEfficiency",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('订单') > -1 && operator.description.indexOf('效率') > -1
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
            }
        ]
    },
    combo: {
        name: "buildSkillFilter.Special",
        color:'#b476ff',
        display: true,
        conditions: [
            {
                label: "buildSkillFilter.PerceptionInformation",
                func: (operator) => {
                    return operator.description.indexOf('感知信息') > -1||operator.description.indexOf('无声共鸣') > -1||RosmontisUniverse.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.WordlyPlight",
                func: (operator) => {
                    return operator.description.indexOf('人间烟火') > -1
                }
            },
            {
                label: "buildSkillFilter.GoldProductionLine",
                func: (operator) => {
                    return operator.description.indexOf('生产线') > -1 || GoldProductionLine.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.PinusSylvestrisKnightsTeam",
                func: (operator) => {
                    return operator.buffName.indexOf('红松') > -1 || Knight.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.AutomationTeam",
                func: (operator) => {
                    return (operator.description.indexOf('发电站') > -1 && operator.description.indexOf('归零') > -1) || Automation.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.RhineTechTeam",
                func: (operator) => {
                    return Rhine.includes(operator.name)
                }
            }
        ]
    },
}

// Official english name is "Rosmontis"
const RosmontisUniverse = ['琴柳']
const GoldProductionLine = ['桃金娘','杜林','褐果','至简']
const Knight = ['砾','薇薇安娜']
const Automation = ['清流','Lancet-2']
const Rhine = ['缪尔赛思','淬羽赫默','多萝西','星源','赫默','白面鸮']

export {operatorFilterConditionTable}