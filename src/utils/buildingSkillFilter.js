
//干员基建技能筛选表，筛选类型：{name：筛选类型名称,color:筛选类型名称字体颜色,conditions:[{label:筛选条件描述,func:筛选函数,传入干员信息进行筛选}]}
const operatorFilterConditionTable = {
    room: {
        name: "Room Type",
        display: true,
        color:'inherit',
        conditions: [
            {
                label: "Trading",
                func: (operator) => {
                    return operator.roomType === 'trading'
                }
            },
            {
                label: "Factory",
                func: (operator) => {
                    return operator.roomType === 'manufacture'
                }
            },
            {
                label: "Office",
                func: (operator) => {
                    return operator.roomType === 'hire'
                }
            },
            {
                label: "Workshop",
                func: (operator) => {
                    return operator.roomType === 'workshop'
                }
            },
            {
                label: "Dormitory",
                func: (operator) => {
                    return operator.roomType === 'dormitory'
                }
            },
            {
                label: "Control",
                func: (operator) => {
                    return operator.roomType === 'control'
                }
            },
            {
                label: "Power",
                func: (operator) => {
                    return operator.roomType === 'power'
                }
            },
            {
                label: "Reception",
                func: (operator) => {
                    return operator.roomType === 'meeting'
                }
            },
            {
                label: "Training",
                func: (operator) => {
                    return operator.roomType === 'training'
                }
            },
        ]
    },
    manufacture: {
        name: "Factory",
        color:'#ff641e',
        display: true,
        conditions: [
            {
                label: "General Wokers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('生产力') > -1 &&
                         operator.description.indexOf('配方') < 0
                }
            },
            {
                label: "Gold Workers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('贵金属') > -1
                }
            },
            {
                label: "EXP Workers Record",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('作战记录') > -1
                }
            },
            {
                label: "Orundum Workers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('源石') > -1
                }
            },
            {
                label: "CAP Limit Wokers",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('仓库容量上限') > -1
                }
            }
        ]
    },
    trading: {
        name: "Trading",
        color:'#00a9f6',
        display: true,
        conditions: [
            {
                label: "Order Acquisition Efficiency",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('订单') > -1 && operator.description.indexOf('效率') > -1
                }
            },
            {
                label: "Order Limit",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('订单上限') > -1
                }
            },
            {
                label: "Better Orders",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('高品质') > -1
                }
            }
        ]
    },
    control: {
        name: "Control",
        color:'#007e1d',
        display: true,
        conditions: [
            {
                label: "Order Acquisition Efficiency",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('订单') > -1 && operator.description.indexOf('效率') > -1
                }
            },
            {
                label: "Production Efficiency",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('生产力') > -1
                }
            },
            {
                label: "Morale Drain/Restore",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('心情') > -1
                }
            }
        ]
    },
    combo: {
        name: "Special",
        color:'#b476ff',
        display: true,
        conditions: [
            {
                label: "Perception Information",
                func: (operator) => {
                    return operator.description.indexOf('感知信息') > -1||operator.description.indexOf('无声共鸣') > -1||RosemaryUniverse.includes(operator.name)
                }
            },
            {
                label: "Wordly Plight",
                func: (operator) => {
                    return operator.description.indexOf('人间烟火') > -1
                }
            },
            {
                label: "Gold Production Line",
                func: (operator) => {
                    return operator.description.indexOf('生产线') > -1 || GoldProductionLine.includes(operator.name)
                }
            },
            {
                label: "Pinus Sylvestris Knights Team",
                func: (operator) => {
                    return operator.buffName.indexOf('红松') > -1 || Knight.includes(operator.name)
                }
            },
            {
                label: "Automation Team",
                func: (operator) => {
                    return (operator.description.indexOf('发电站') > -1 && operator.description.indexOf('归零') > -1) || Automation.includes(operator.name)
                }
            },
            {
                label: "Rhine Tech Team",
                func: (operator) => {
                    return Rhine.includes(operator.name)
                }
            }
        ]
    },
}

const RosemaryUniverse = ['琴柳']
const GoldProductionLine = ['桃金娘','杜林','褐果','至简']
const Knight = ['砾','薇薇安娜']
const Automation = ['清流','Lancet-2']
const Rhine = ['缪尔赛思','淬羽赫默','多萝西','星源','赫默','白面鸮']

export {operatorFilterConditionTable}