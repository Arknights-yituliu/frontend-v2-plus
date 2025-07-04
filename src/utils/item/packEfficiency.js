/**
 * 根据传入的礼包算出性价比
 * @param packInfoVO 礼包基本信息
 * @param itemValueMap 材料价值表
 * @param displayPackEfficiency
 * @param displayKernel
 * @returns {{packEfficiency:number,drawEfficiencyKernel:number}}  礼包各种性价比
 * @private
 */
function calculatePackEfficiency(packInfoVO, itemValueMap, displayPackEfficiency, displayKernel) {
    // 综合性价比基准
    const packEfficiencyBenchmark = 648 / 185.0;
    // 抽卡性价比基准
    const drawEfficiencyBenchmark = 648.0 / 185 / 0.3;

    const pack648APCount = 185 * itemValueMap.get("4002")


    let draws = 0.0; // 抽数
    let drawPrice = 0.0; // 每一抽价格
    let packedOriginiumPrice = 0.0; // 每源石（折算物资后）价格
    let drawEfficiency = 0.0; // 仅抽卡性价比
    let packEfficiency = 0.0; // 综合性价比
    let packedOriginium = 0.0; // 礼包总价值折合成源石

    let drawsKernel = 0.0; // 抽数（含蓝抽）
    // let drawPriceKernel = 0.0; // 每一抽价格（含蓝抽）
    // let packedOriginiumPriceKernel = 0.0; // 每源石（折算物资后）价格（含蓝抽）
    // let drawEfficiencyKernel = 0.0; // 仅抽卡性价比（含蓝抽）
    // let packEfficiencyKernel = 0.0; // 综合性价比（含蓝抽）
    // let packedOriginiumKernel = 0.0; // 礼包总价值折合成源石（含蓝抽）
    let originiumUnitPrice = 0.0;

    let apCount = 0.0; // 总价值（理智）
    let apCountKernel = 0.0; // 总价值（理智，含蓝抽）

    // 礼包内的物品的集合
    const packContentVOList = packInfoVO.packContent || [];
    // 直接计算抽数
    const gachaItemList = [
        {
            itemId: "4003",
            itemName: "合成玉",
            draw: (packInfoVO.orundum || 0) / 600,
            quantity: packInfoVO.orundum || 0
        },
        {
            itemId: "4002",
            itemName: "至纯源石",
            draw: (packInfoVO.originium || 0) * 0.3,
            quantity: packInfoVO.originium || 0
        },
        {
            itemId: "7003",
            itemName: "寻访凭证",
            draw: (packInfoVO.gachaTicket || 0),
            quantity: packInfoVO.gachaTicket || 0
        },
        {
            itemId: "7004",
            itemName: "十连寻访凭证",
            draw: (packInfoVO.tenGachaTicket || 0) * 10,
            quantity: packInfoVO.tenGachaTicket || 0
        }
    ]


    for (const item of gachaItemList) {
        draws += item.draw
        apCount += itemValueMap.get(item.itemId) * item.quantity
    }

    // draws = (packInfoVO.orundum || 0) / 600 + (packInfoVO.originium || 0) * 0.3 + (packInfoVO.gachaTicket || 0) + (packInfoVO.tenGachaTicket || 0) * 10;
    // apCount += draws * 450;
    // drawsKernel = 0;
    // apCountKernel = 0;


    if (packContentVOList.length > 0) {
        for (let i = 0; i < packContentVOList.length; i++) {
            const item = packContentVOList[i];
            // 判断是否有不存在物品表中的物品
            if (itemValueMap.has(item.itemId)) {
                const itemValue = itemValueMap.get(item.itemId);
                // 蓝抽单独计算
                if (item.itemId === "classic_gacha") {
                    drawsKernel += item.quantity;
                    apCountKernel += itemValue * item.quantity;
                } else if (item.itemId === "classic_gacha_10") {
                    drawsKernel += item.quantity * 10;
                    apCountKernel += itemValue * item.quantity;
                } else {
                    apCount += itemValue * item.quantity;
                }
            }
        }
    }

    if (displayKernel) {
        draws += drawsKernel
        apCount += apCountKernel
    }


    // 总价值计算
    packedOriginium = apCount / 135; // 总源石
    // packedOriginiumKernel += apCountKernel / 135; // 总源石（含蓝抽）

    if (packInfoVO.originium > 0) {
        originiumUnitPrice = packInfoVO.price / packInfoVO.originium
    }


    let packContentVO = []


    for (const item of gachaItemList) {
        const itemValue = itemValueMap.get(item.itemId);
        packContentVO.push(_getPackContentItemVO(item, itemValue))
    }


    for (let i = 0; i < packContentVOList.length; i++) {
        const item = packContentVOList[i];
        if (itemValueMap.has(item.itemId)) {
            const itemValue = itemValueMap.get(item.itemId);
            let vo = _getPackContentItemVO(item, itemValue)
            if (!displayPackEfficiency) {
                vo.apValue = 0
                vo.itemRatio = 0
            }
            //
            if (["classic_gacha", "classic_gacha_10"].includes(item.itemId) ) {
                if (displayKernel) {
                    vo.apValue = itemValue * item.quantity
                    if ("classic_gacha" === item.itemId) {
                        vo.itemRatio = drawEfficiencyBenchmark / (packInfoVO.price / item.quantity)
                    }
                    if ("classic_gacha_10" === item.itemId) {
                        vo.itemRatio = drawEfficiencyBenchmark / (packInfoVO.price / (item.quantity * 10))
                    }

                } else {
                    vo.apValue = 0
                    vo.itemRatio = 0
                }

            }


            packContentVO.push(vo)
        }
    }


    /**
     *
     * @param item
     * @param itemValue
     * @param apCount
     * @private
     */
    function _getPackContentItemVO(item, itemValue, apCount) {

        const apValue = itemValue * item.quantity

        return {
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity,
            apValue: apValue,
            itemRatio: packEfficiencyBenchmark / packInfoVO.price * (apValue / 135)
        }
    }


    // 每源石花费计算
    packedOriginiumPrice = packedOriginium > 0 ? packInfoVO.price / packedOriginium : 0;
    // packedOriginiumPriceKernel = packedOriginiumKernel > 0 ? packInfoVO.price / packedOriginiumKernel : 0;

    // 综合性价比计算
    packEfficiency = packedOriginiumPrice > 0 ? packEfficiencyBenchmark / packedOriginiumPrice : 0;
    // packEfficiencyKernel = packedOriginiumPriceKernel > 0 ? packEfficiencyBenchmark / packedOriginiumPriceKernel : 0;

    // 抽卡性价比计算
    drawPrice = draws > 0 ? packInfoVO.price / draws : 0;
    drawEfficiency = drawPrice > 0 ? drawEfficiencyBenchmark / drawPrice : 0;

    // 抽卡性价比计算(含蓝抽)
    // drawPriceKernel = drawsKernel > 0 ? packInfoVO.price / drawsKernel : 0;
    // drawEfficiencyKernel = drawPriceKernel > 0 ? drawEfficiencyBenchmark / drawPriceKernel : 0;

    // 设置返回值
    packInfoVO.draws = draws;
    packInfoVO.drawPrice = drawPrice;
    packInfoVO.packedOriginiumPrice = packedOriginiumPrice;
    packInfoVO.drawEfficiency = drawEfficiency;
    packInfoVO.packedOriginium = packedOriginium;
    packInfoVO.packEfficiency = packEfficiency;

    packInfoVO.packContentVO = packContentVO

    // packInfoVO.drawsKernel = drawsKernel;
    // packInfoVO.drawPriceKernel = drawPriceKernel;
    // packInfoVO.packedOriginiumPriceKernel = packedOriginiumPriceKernel;
    // packInfoVO.drawEfficiencyKernel = drawEfficiencyKernel;
    // packInfoVO.packedOriginiumKernel = packedOriginiumKernel;
    // packInfoVO.packEfficiencyKernel = packEfficiencyKernel;
    packInfoVO.originiumUnitPrice = originiumUnitPrice;

    return packInfoVO
}


export {
    calculatePackEfficiency
}