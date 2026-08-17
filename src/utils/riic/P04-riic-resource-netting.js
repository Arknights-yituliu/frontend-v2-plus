const DISPLAY_RESOURCE_META = Object.freeze({
  lmd: Object.freeze({ label: "龙门币", unit: "龙门币/天" }),
  exp: Object.freeze({ label: "经验书", unit: "经验/天" }),
  gold: Object.freeze({ label: "净赤金", unit: "根/天" }),
  originiumShard: Object.freeze({ label: "净源石碎片", unit: "枚/天" }),
  orundum: Object.freeze({ label: "合成玉", unit: "合成玉/天" }),
  recruitmentRefresh: Object.freeze({
    label: "公招净刷新",
    unit: "次/天",
  }),
});

function roundYield(value) {
  return Math.round(Number(value) * 100) / 100;
}

function createEmptyYieldResource(resource) {
  const meta = DISPLAY_RESOURCE_META[resource] || {};
  return {
    resource,
    label: meta.label || resource,
    unit: meta.unit || "",
    roomCount: 0,
    calculatedRoomCount: 0,
    outputPerCycle: 0,
    outputPerDay: 0,
    isCalculated: true,
    detail: "无对应设施",
  };
}

function getDirectYieldResource(resourcesByKey, resource) {
  return resourcesByKey.get(resource) || createEmptyYieldResource(resource);
}

function buildNetGoldResource(resourcesByKey, tradingFlowTotals, cycleHours) {
  const manufacturedGold = getDirectYieldResource(resourcesByKey, "gold");
  const lmd = getDirectYieldResource(resourcesByKey, "lmd");
  const isCalculated =
    manufacturedGold.isCalculated &&
    lmd.isCalculated &&
    tradingFlowTotals.isCalculated;
  const roomCount = manufacturedGold.roomCount + lmd.roomCount;
  const calculatedRoomCount =
    manufacturedGold.calculatedRoomCount + lmd.calculatedRoomCount;

  if (!isCalculated) {
    return {
      ...createEmptyYieldResource("gold"),
      roomCount,
      calculatedRoomCount,
      isCalculated: false,
      outputPerCycle: null,
      outputPerDay: null,
      detail: "赤金制造或龙门币贸易存在未计算房间",
    };
  }

  const manufacturedPerCycle = Number(manufacturedGold.outputPerCycle || 0);
  const manufacturedPerDay = Number(manufacturedGold.outputPerDay || 0);
  const perDayMultiplier = cycleHours > 0 ? 24 / cycleHours : 0;
  const consumedPerCycle = Number(
    tradingFlowTotals.goldConsumptionPerCycle || 0,
  );
  const consumedPerDay = consumedPerCycle * perDayMultiplier;
  const virtualGoldOutputPerCycle = Number(
    tradingFlowTotals.virtualGoldOutputPerCycle || 0,
  );
  const virtualGoldOutputPerDay = virtualGoldOutputPerCycle * perDayMultiplier;
  const grossOutputPerCycle = manufacturedPerCycle + virtualGoldOutputPerCycle;
  const grossOutputPerDay = manufacturedPerDay + virtualGoldOutputPerDay;

  return {
    ...createEmptyYieldResource("gold"),
    roomCount,
    calculatedRoomCount,
    outputPerCycle: roundYield(grossOutputPerCycle - consumedPerCycle),
    outputPerDay: roundYield(grossOutputPerDay - consumedPerDay),
    detail: `制造 ${roundYield(manufacturedPerDay)}；订单等效 ${roundYield(
      virtualGoldOutputPerDay,
    )}；贸易消耗 ${roundYield(consumedPerDay)}`,
    grossOutputPerCycle: roundYield(grossOutputPerCycle),
    grossOutputPerDay: roundYield(grossOutputPerDay),
    tradeConsumptionPerCycle: roundYield(consumedPerCycle),
    tradeConsumptionPerDay: roundYield(consumedPerDay),
    virtualGoldOutputPerCycle: roundYield(virtualGoldOutputPerCycle),
    virtualGoldOutputPerDay: roundYield(virtualGoldOutputPerDay),
  };
}

function buildNetLmdResource(
  resourcesByKey,
  orundumManufactureFlowTotals,
  cycleHours,
) {
  const tradingLmd = getDirectYieldResource(resourcesByKey, "lmd");
  const isCalculated =
    tradingLmd.isCalculated && orundumManufactureFlowTotals.isCalculated;
  const roomCount =
    tradingLmd.roomCount +
    Number(orundumManufactureFlowTotals.roomCount || 0);
  const calculatedRoomCount =
    tradingLmd.calculatedRoomCount +
    Number(orundumManufactureFlowTotals.calculatedRoomCount || 0);

  if (!isCalculated) {
    return {
      ...createEmptyYieldResource("lmd"),
      roomCount,
      calculatedRoomCount,
      isCalculated: false,
      outputPerCycle: null,
      outputPerDay: null,
      detail: "龙门币贸易或源石碎片制造存在未计算班段",
      grossOutputPerCycle: null,
      grossOutputPerDay: null,
      orundumManufactureConsumptionPerCycle: null,
      orundumManufactureConsumptionPerDay: null,
    };
  }

  const grossOutputPerCycle = Number(tradingLmd.outputPerCycle || 0);
  const grossOutputPerDay = Number(tradingLmd.outputPerDay || 0);
  const perDayMultiplier = cycleHours > 0 ? 24 / cycleHours : 0;
  const orundumManufactureConsumptionPerCycle = Number(
    orundumManufactureFlowTotals.lmdConsumptionPerCycle || 0,
  );
  const orundumManufactureConsumptionPerDay =
    orundumManufactureConsumptionPerCycle * perDayMultiplier;

  return {
    ...createEmptyYieldResource("lmd"),
    roomCount,
    calculatedRoomCount,
    outputPerCycle: roundYield(
      grossOutputPerCycle - orundumManufactureConsumptionPerCycle,
    ),
    outputPerDay: roundYield(
      grossOutputPerDay - orundumManufactureConsumptionPerDay,
    ),
    detail: `贸易产出 ${roundYield(grossOutputPerDay)}；源石碎片制造消耗 ${roundYield(
      orundumManufactureConsumptionPerDay,
    )}`,
    grossOutputPerCycle: roundYield(grossOutputPerCycle),
    grossOutputPerDay: roundYield(grossOutputPerDay),
    orundumManufactureConsumptionPerCycle: roundYield(
      orundumManufactureConsumptionPerCycle,
    ),
    orundumManufactureConsumptionPerDay: roundYield(
      orundumManufactureConsumptionPerDay,
    ),
  };
}

function buildNetOriginiumShardResource(
  resourcesByKey,
  orundumTradeFlowTotals,
  cycleHours,
) {
  const manufacturedShards = getDirectYieldResource(
    resourcesByKey,
    "originiumShard",
  );
  const isCalculated =
    manufacturedShards.isCalculated && orundumTradeFlowTotals.isCalculated;
  const roomCount =
    manufacturedShards.roomCount + orundumTradeFlowTotals.roomCount;
  const calculatedRoomCount =
    manufacturedShards.calculatedRoomCount +
    orundumTradeFlowTotals.calculatedRoomCount;

  if (!isCalculated) {
    return {
      ...createEmptyYieldResource("originiumShard"),
      roomCount,
      calculatedRoomCount,
      isCalculated: false,
      outputPerCycle: null,
      outputPerDay: null,
      detail: "源石碎片制造或合成玉贸易存在未计算房间",
      grossOutputPerCycle: null,
      grossOutputPerDay: null,
      tradeConsumptionPerCycle: null,
      tradeConsumptionPerDay: null,
    };
  }

  const manufacturedPerCycle = Number(manufacturedShards.outputPerCycle || 0);
  const manufacturedPerDay = Number(manufacturedShards.outputPerDay || 0);
  const perDayMultiplier = cycleHours > 0 ? 24 / cycleHours : 0;
  const consumedPerCycle = Number(
    orundumTradeFlowTotals.shardConsumptionPerCycle || 0,
  );
  const consumedPerDay = consumedPerCycle * perDayMultiplier;

  return {
    ...createEmptyYieldResource("originiumShard"),
    roomCount,
    calculatedRoomCount,
    outputPerCycle: roundYield(manufacturedPerCycle - consumedPerCycle),
    outputPerDay: roundYield(manufacturedPerDay - consumedPerDay),
    detail: `制造 ${roundYield(manufacturedPerDay)}；合成玉订单消耗 ${roundYield(
      consumedPerDay,
    )}`,
    grossOutputPerCycle: roundYield(manufacturedPerCycle),
    grossOutputPerDay: roundYield(manufacturedPerDay),
    tradeConsumptionPerCycle: roundYield(consumedPerCycle),
    tradeConsumptionPerDay: roundYield(consumedPerDay),
  };
}

export function settleRiicNetResources({
  resourcesByKey,
  tradingFlowTotals,
  orundumTradeFlowTotals,
  orundumManufactureFlowTotals,
  cycleHours,
} = {}) {
  const gold = buildNetGoldResource(
    resourcesByKey,
    tradingFlowTotals,
    cycleHours,
  );
  const lmd = buildNetLmdResource(
    resourcesByKey,
    orundumManufactureFlowTotals,
    cycleHours,
  );
  const originiumShard = buildNetOriginiumShardResource(
    resourcesByKey,
    orundumTradeFlowTotals,
    cycleHours,
  );

  return {
    gold,
    lmd,
    originiumShard,
  };
}
