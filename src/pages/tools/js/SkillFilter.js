
//干员基建技能筛选表，筛选类型：{name：筛选类型名称,color:筛选类型名称字体颜色,conditions:[{label:筛选条件描述,func:筛选函数,传入干员信息进行筛选}]}
const operatorFilterConditionTable = {
    room: {
        name: "工作场所",
        display: true,
        color:'inherit',
        conditions: [
            {
                label: "贸易站",
                func: (operator) => {
                    return operator.roomType === 'trading'
                }
            },
            {
                label: "制造站",
                func: (operator) => {
                    return operator.roomType === 'manufacture'
                }
            },
            {
                label: "办公室",
                func: (operator) => {
                    return operator.roomType === 'hire'
                }
            },
            {
                label: "加工站",
                func: (operator) => {
                    return operator.roomType === 'workshop'
                }
            },
            {
                label: "宿舍",
                func: (operator) => {
                    return operator.roomType === 'dormitory'
                }
            },
            {
                label: "控制中枢",
                func: (operator) => {
                    return operator.roomType === 'control'
                }
            },
            {
                label: "发电站",
                func: (operator) => {
                    return operator.roomType === 'power'
                }
            },
            {
                label: "会客室",
                func: (operator) => {
                    return operator.roomType === 'meeting'
                }
            },
            {
                label: "训练室",
                func: (operator) => {
                    return operator.roomType === 'training'
                }
            },
        ]
    },
    manufacture: {
        name: "制造站",
        color:'#ff641e',
        display: true,
        conditions: [
            {
                label: "生产力",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('生产力') > -1 &&
                         operator.description.indexOf('配方') < 0
                }
            },
            {
                label: "贵金属",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('贵金属') > -1
                }
            },
            {
                label: "作战记录",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('作战记录') > -1
                }
            },
            {
                label: "源石",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('源石') > -1
                }
            },
            {
                label: "仓库容量上限",
                func: (operator) => {
                    return operator.roomType === 'manufacture' && operator.description.indexOf('仓库容量上限') > -1
                }
            }
        ]
    },
    trading: {
        name: "贸易站",
        color:'#00a9f6',
        display: true,
        conditions: [
            {
                label: "订单获取效率",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('订单') > -1 && operator.description.indexOf('效率') > -1
                }
            },
            {
                label: "订单上限",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('订单上限') > -1
                }
            },
            {
                label: "高品质",
                func: (operator) => {
                    return operator.roomType === 'trading' && operator.description.indexOf('高品质') > -1
                }
            }
        ]
    },
    control: {
        name: "控制中枢",
        color:'#007e1d',
        display: true,
        conditions: [
            {
                label: "订单获取效率",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('订单') > -1 && operator.description.indexOf('效率') > -1
                }
            },
            {
                label: "生产力",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('生产力') > -1
                }
            },
            {
                label: "心情消耗/恢复",
                func: (operator) => {
                    return operator.roomType === 'control' && operator.description.indexOf('心情') > -1
                }
            }
        ]
    },
    combo: {
        name: "可联动技能",
        color:'#ff761d',
        display: true,
        conditions: [
            {
                label: "感知信息",
                func: (operator) => {
                    return operator.description.indexOf('感知信息') > -1||operator.description.indexOf('无声共鸣') > -1||RosemaryUniverse.includes(operator.name)
                }
            },
            {
                label: "人间烟火",
                func: (operator) => {
                    return operator.description.indexOf('人间烟火') > -1
                }
            },
            {
                label: "赤金生产线",
                func: (operator) => {
                    return operator.description.indexOf('生产线') > -1 || GoldProductionLine.includes(operator.name)
                }
            },
            {
                label: "红松骑士团",
                func: (operator) => {
                    return operator.buffName.indexOf('红松') > -1 || Knight.includes(operator.name)
                }
            },
            {
                label: "自动化",
                func: (operator) => {
                    return (operator.description.indexOf('发电站') > -1 && operator.description.indexOf('归零') > -1) || Automation.includes(operator.name)
                }
            },
            {
                label: "莱茵科技",
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