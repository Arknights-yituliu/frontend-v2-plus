const operatorFilterConditionTable = {
    room: {
        name: "工作场所",
        display: true,
        color:'#595959',
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
        color:'#ffb500',
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
        color:'#00b605',
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
        name: "联动技能",
        color:'#ff761d',
        display: true,
        conditions: [
            {
                label: "感知信息",
                func: (operator) => {
                    return operator.description.indexOf('感知信息') > -1
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
                    return operator.description.indexOf('生产线') > -1
                }
            },
            {
                label: "红松骑士团",
                func: (operator) => {
                    return operator.buffName.indexOf('红松') > -1
                }
            },
            {
                label: "自动化",
                func: (operator) => {
                    return (operator.description.indexOf('发电站') > -1 && operator.description.indexOf('归零') > -1)
                }
            },
            {
                label: "莱茵科技",
                func: (operator) => {
                    return operator.buffName.indexOf('莱茵科技') > -1
                }
            }
        ]
    },
}



export {operatorFilterConditionTable}