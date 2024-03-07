/**
 * 获得关卡效率条，每个格子的值为0.2
 * @param singleStageEff  主产物效率
 * @param stageEff  关卡效率
 * @param rank 主产物最高等级
 * @return {*[]}
 */
function getEfficiencyBar(singleStageEff, stageEff, rank) {
    //将主产物效率分/0.2,分割为整数个格子个数和不完整格子个数
    const singleStageEffSplit = (singleStageEff / 0.2).toString().split('.')
    //完整格子个数
    let singleStageEffInteger = parseInt(singleStageEffSplit[0])
    //不完整格子的渐变比例
    let singleStageEffDecimal = parseFloat(`0.${singleStageEffSplit[1]}`)

    let backgroundGrey = 'var(--c-material-grey)'
    let backgroundDarkgrey = '#ffa600'

    //根据主产物最高等级赋予颜色
    let barColor = {
        integer: 'var(--c-material-grey)',
        decimal: 'var(--c-material-grey)'
    }
    if (rank === 4) {
        barColor = {
            integer: '#e600ff',
            decimal: '#8065ea'
        }
    } else if (rank === 3) {
        barColor = {
            integer: '#0084ff',
            decimal: '#459bf5'
        }
    } else if (rank === 2) {
        barColor = {
            integer: '#10b650',
            decimal: '#82dcb8'
        }
    }

    let styleList = []


    //根据主产物效率的整数拼接完整的效率条格子
    for (let i = 0; i < singleStageEffInteger; i++) {
        styleList.push(`background: ${barColor.integer}`)
    }


    //判断关卡效率/0.2得到的值和主产物效率的不完整格子的渐变比例是否小于0，小于则超出一个格子，即关卡效率加主产物效率/0.2的小数部分x0.2>0.2，此时渐变格子为(主产物效率比例，关卡效率比例）
    if ((1 - singleStageEffDecimal - stageEff / 0.2) < 0) {
        //根据主产物效率的不完整格子的渐变比例设置渐变格子为(主产物效率比例，关卡效率比例），,因为可能有计算误差，判断是否大于0.01
        if (singleStageEffDecimal > 0.01) {
            styleList.push(`background: linear-gradient(to right ,${barColor.integer} ${singleStageEffDecimal * 100}% ,${backgroundDarkgrey} ${(1 - singleStageEffDecimal) * 100}%)`)
        }
        //扣除在上个渐变格子中使用过的关卡效率的值 （1-不完整格子的渐变比例）x 单个格子的效率值0.2
        const usedStageEff = singleStageEffDecimal > 0 ? (1 - singleStageEffDecimal) * 0.2 : 0
        //关卡效率减去主产物效率和使用过的关卡效率的值，计算还能设置几个完整格子和不完整格子的渐变比例
        const stageEffSplit = ((stageEff - singleStageEff - usedStageEff) / 0.2).toString().split('.')
        //关卡效率完整格子个数
        let stageEffInteger = parseInt(stageEffSplit[0])
        //关卡效率不完整格子的渐变比例
        let stageEffDecimal = parseFloat(`0.${stageEffSplit[1]}`)

        //根据关卡效率完整格子的个数设置完整格子
        for (let i = 0; i < stageEffInteger; i++) {
            styleList.push(`background: ${backgroundDarkgrey}`)
        }

        //根据关卡效率的不完整格子的渐变比例设置一个渐变格子为(关卡效率比例，浪费的体力效率比例）,因为可能有计算误差，判断是否大于0.01，
        if (stageEffDecimal > 0.01) {
            styleList.push(`background: linear-gradient(to right ,${backgroundDarkgrey} ${stageEffDecimal * 100}%,${backgroundGrey} ${(1 - stageEffDecimal) * 100}%)`)
        }
    } else {
        //判断关卡效率/0.2得到的值和主产物效率的不完整格子的渐变比例是否小于0，即关卡效率加主产物效率/0.2的小数部分x0.2<0.2，此时渐变格子为(主产物效率比例，关卡效率比例，浪费的体力效率比例）
        const stageEffDecimalRatio = (stageEff - singleStageEff) / 0.2
        const wasteRatio = 1 - singleStageEffDecimal - stageEffDecimalRatio
        if (wasteRatio < 0.5) {
            styleList.push(`background: linear-gradient(to right , ${barColor.decimal} ${singleStageEffDecimal * 100}% ,${backgroundDarkgrey} ${(stageEffDecimalRatio) * 100}% ,${backgroundGrey} ${(wasteRatio) * 100}%)`)
        }
    }

    //如果不足5个格子，则额外插入格子
    for (let i = styleList.length; i < 5; i++) {
        styleList.push(`background: ${backgroundGrey}`)
    }

    return styleList
}


function getLineBarLength(T2eff, T3eff, T4eff, stageEff) {
    // 暂时是单层的，所以代码看起来可能比较乱
    let T2Color = "#00a2a2 ";
    let T3Color = "#168afa ";
    let T4Color = "#7446ff ";
    let T5Color = "#e85d06";
    if (T2eff > 0.1) {
        T4Color = T2Color;
        T4eff = T2eff;
    }
    if (T3eff > 0.1) {
        T4Color = T3Color;
        T4eff = T3eff;
    }
    let stageEffColor = "rgba(0, 0, 0, 0.3) ";
    let standardColor = "rgba(0, 0, 0, 0.1) ";
    // Tx效率层
    let T4Layer = "linear-gradient(to right ,";
    if (T4eff < 0.2) {
        T4Layer = T4Layer + T4Color + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
    } else {
        T4Layer = T4Layer + T4Color + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ,"
        if (T4eff < 0.4) {
            T4Layer = T4Layer + T4Color + 0.2 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
        } else {
            T4Layer = T4Layer + T4Color + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ,"
            if (T4eff < 0.6) {
                T4Layer = T4Layer + T4Color + 0.4 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
            } else {
                T4Layer = T4Layer + T4Color + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ,"
                if (T4eff < 0.8) {
                    T4Layer = T4Layer + T4Color + 0.6 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
                } else {
                    T4Layer = T4Layer + T4Color + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ,"
                    if (T4eff < 1) {
                        T4Layer = T4Layer + T4Color + 0.8 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
                    } else {
                        T4Layer = T4Layer + T4Color + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 1 * 83.33 + "% ,"
                        T4Layer = T4Layer + T5Color + 1 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
                    }
                }
            }
        }
    }
    // Tx效率层
    let stageLayer = "linear-gradient(to right ,";
    if (stageEff < 0.2) {
        stageLayer = stageLayer + stageEffColor + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
    } else {
        stageLayer = stageLayer + stageEffColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ,"
        if (stageEff < 0.4) {
            stageLayer = stageLayer + stageEffColor + 0.2 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
        } else {
            stageLayer = stageLayer + stageEffColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ,"
            if (stageEff < 0.6) {
                stageLayer = stageLayer + stageEffColor + 0.4 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
            } else {
                stageLayer = stageLayer + stageEffColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ,"
                if (stageEff < 0.8) {
                    stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
                } else {
                    stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ,"
                    if (stageEff < 1) {
                        stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
                    } else {
                        stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 1 * 83.33 + "% ,"
                        stageLayer = stageLayer + stageEffColor + 1 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
                    }
                }
            }
        }
    }
    // 关卡效率层
    // let stageLayer = "linear-gradient(to right ," + stageEffColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + stageEffColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + stageEffColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ,";
    // if (stageEff < 0.8) {
    //   stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
    // } else {
    //   stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ,"
    //   if (stageEff < 1) {
    //     stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
    //   } else {
    //     stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 1 * 83.33 + "% ,"
    //     stageLayer = stageLayer + stageEffColor + 1 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
    //   }
    // }


    // 默认显示5个格子
    // let standardLayer = "linear-gradient(to right ," + standardColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + standardColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + standardColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ," + standardColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ," + standardColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 83.33 + "% ," + standardColor + 83.33 + "% 101%)";
    let standardLayer = "linear-gradient(to right ," + standardColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + standardColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + standardColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ," + standardColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ," + standardColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 83.33 + "% 101%)";
    return "background:" + T4Layer + "," + stageLayer + "," + standardLayer + ";";
}