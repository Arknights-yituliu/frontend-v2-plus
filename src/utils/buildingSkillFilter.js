
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
                    return operator.roomType === 'trading' && operator.description.indexOf('订单') > -1 &&
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
    combo: {
        name: "buildSkillFilter.Special",
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
                    return operator.description.indexOf('人间烟火') > -1
                }
            },
            {
                label: "buildSkillFilter.GoldProductionLine",
                func: (operator) => {
                    return operator.description.indexOf('赤金生产线') > -1 || GoldProductionLine.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.KnightsTeam",
                func: (operator) => {
                    return operator.buffName.indexOf('红松') > -1 || Knight.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.AutomationTeam",
                func: (operator) => {
                    return (operator.description.indexOf('发电站') > -1 && operator.description.indexOf('归零') > -1) ||
                        Automation.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.RhineLabTeam",
                func: (operator) => {
                    return RhineLab.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.AbyssalHuntersTeam",
                func: (operator) => {
                    return AbyssalHunters.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.BlacksteelTeam",
                func: (operator) => {
                    return Blacksteel.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.GlasgowTeam",
                func: (operator) => {
                    return Glasgow.includes(operator.name)
                }
            },
            {
                label: "buildSkillFilter.KarianTradeTeam",
                func: (operator) => {
                    return KarianTrade.includes(operator.name)
                }
            }
        ]
    },
}

// Official english name is "Rosmontis"
const RosmontisUniverse = ['琴柳']
const GoldProductionLine = ['至简','桃金娘','褐果','杜林','特克诺']
const Knight = ['砾','薇薇安娜','正义骑士号']
const Automation = ['清流','承曦格雷伊','Lancet-2']
const RhineLab = ['赫默','伊芙利特','塞雷娅','白面鸮','梅尔','麦哲伦','多萝西','星源','缪尔赛思']
const AbyssalHunters = ['歌蕾蒂娅','斯卡蒂','幽灵鲨','安哲拉','乌尔比安']
const Blacksteel = ['雷蛇','芙兰卡','杰西卡','香草','杏仁','涤火杰西卡']
const Glasgow = ['推进之王','摩根','达格达','因陀罗','戴菲恩']
const KarianTrade = ['银灰','灵知','初雪','崖心','角峰','讯使','耶拉','极光','锏']

export {operatorFilterConditionTable}
