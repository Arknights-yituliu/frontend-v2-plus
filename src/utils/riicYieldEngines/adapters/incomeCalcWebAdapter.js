import "../vendors/income-calc-web/income_calc_web.js";
import incomeCalcData from "../vendors/income-calc-web/ark_building_full.json";
import { normalizeMaaRiicSchedule } from "../../riicYield/maaScheduleNormalizer.js";

const ENGINE_ID = "income-calc-web";
const SUPPORTED_MANUFACTURE_PRODUCTS = new Set([
  "Battle Record",
  "Pure Gold",
]);
const PRODUCTIVE_FACILITIES = new Set(["manufacture", "trading"]);

let initialized = false;

function getCalculator() {
  const calculator = globalThis.IncomeCalcWeb;
  if (!calculator || typeof calculator.planIncome !== "function") {
    throw new Error("基础收益模型未能初始化");
  }

  if (!initialized) {
    calculator.setData(incomeCalcData?.skills || []);
    initialized = true;
  }

  return calculator;
}

function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

const KNOWN_OPERATOR_NAMES = new Set(
  (incomeCalcData?.skills || [])
    .map((skill) => toText(skill?.干员))
    .filter(Boolean),
);

function createMessage(level, text) {
  return {
    level,
    text,
  };
}

function normalizeIssueMessages(issues) {
  return (Array.isArray(issues) ? issues : [])
    .filter((issue) => issue?.severity !== "error")
    .map((issue) =>
      createMessage(
        ["info", "warning"].includes(issue?.severity)
          ? issue.severity
          : "info",
        [toText(issue?.jsonPath), toText(issue?.message)]
          .filter(Boolean)
          .join(": "),
      ),
    )
    .filter((message) => message.text);
}

function getPlanRoomCount(plan, facility) {
  return plan.rooms.reduce(
    (count, room) => count + (room.facility === facility ? 1 : 0),
    0,
  );
}

function getUnsupportedReason(schedule) {
  for (const plan of schedule.plans) {
    if (
      getPlanRoomCount(plan, "trading") !== 2 ||
      getPlanRoomCount(plan, "manufacture") !== 4 ||
      getPlanRoomCount(plan, "power") !== 3
    ) {
      return "该模型当前仅支持完整 243 布局（2 贸易、4 制造、3 发电）";
    }

    const assignedRoomByOperator = new Map();
    for (const room of plan.rooms) {
      if (room.mode === "fixed") {
        const seenInRoom = new Set();
        for (const operator of room.operators) {
          if (seenInRoom.has(operator)) {
            return `${room.jsonPath} 重复安排了干员 ${operator}`;
          }
          seenInRoom.add(operator);

          const firstRoomPath = assignedRoomByOperator.get(operator);
          if (firstRoomPath) {
            return `${room.jsonPath} 与 ${firstRoomPath} 重复安排了干员 ${operator}`;
          }
          assignedRoomByOperator.set(operator, room.jsonPath);
        }
      }

      if (!PRODUCTIVE_FACILITIES.has(room.facility)) {
        continue;
      }
      if (room.mode === "skipped") {
        return `${room.jsonPath} 标记为跳过，无法确认其实际运行状态`;
      }
      if (room.mode !== "fixed") {
        return `${room.jsonPath} 使用自动填充、候选或分组，无法确认稳定在岗人员`;
      }
      if (room.operators.length > 3) {
        return `${room.jsonPath} 的人员数量超过完整 243 设施容量`;
      }
      if (!room.product) {
        return `${room.jsonPath} 未指定生产或贸易产品`;
      }
      if (
        room.facility === "manufacture" &&
        !SUPPORTED_MANUFACTURE_PRODUCTS.has(room.sourceProduct)
      ) {
        return "该模型暂不支持源石碎片等制造产品";
      }
      if (room.facility === "trading" && room.sourceProduct !== "LMD") {
        return "该模型暂不支持源石碎片或合成玉贸易";
      }
      for (const operator of room.operators) {
        if (!KNOWN_OPERATOR_NAMES.has(operator)) {
          return `${room.jsonPath} 中的干员 ${operator} 不在当前技能数据中`;
        }
      }
    }
  }

  return "";
}

function inspectMaaSchedule(maaSchedule) {
  const normalized = normalizeMaaRiicSchedule(maaSchedule);
  const errors = normalized.issues.filter((issue) => issue.severity === "error");
  if (!normalized.schedule || errors.length) {
    const firstIssue = errors[0];
    return {
      schedule: null,
      messages: [
        ...normalizeIssueMessages(normalized.issues),
        createMessage(
          "info",
          firstIssue
            ? [toText(firstIssue.jsonPath), toText(firstIssue.message)]
                .filter(Boolean)
                .join(": ")
            : "MAA 排班中未找到可计算的完整日循环",
        ),
      ],
    };
  }

  const unsupportedReason = getUnsupportedReason(normalized.schedule);
  if (unsupportedReason) {
    return {
      schedule: null,
      messages: [
        ...normalizeIssueMessages(normalized.issues),
        createMessage("info", unsupportedReason),
      ],
    };
  }

  return {
    schedule: normalized.schedule,
    messages: normalizeIssueMessages(normalized.issues),
  };
}

function calculateTimeWeightedIncome(calculator, maaSchedule, schedule) {
  const totalMinutes = schedule.timeline.cycleMinutes;
  const perPlan = schedule.plans.map((plan, index) => {
    const raw = calculator.planIncome(maaSchedule.plans[index], false);
    const weight = plan.durationMinutes / totalMinutes;

    return {
      index,
      name: plan.name,
      durationMinutes: plan.durationMinutes,
      weight,
      lmd: Number(raw?.lmd || 0),
      exp: Number(raw?.exp || 0),
      gold: Number(raw?.gold || 0),
      steps: Array.isArray(raw?.steps) ? raw.steps : [],
    };
  });

  return {
    perPlan,
    lmd: perPlan.reduce((total, plan) => total + plan.lmd * plan.weight, 0),
    exp: perPlan.reduce((total, plan) => total + plan.exp * plan.weight, 0),
    gold: perPlan.reduce((total, plan) => total + plan.gold * plan.weight, 0),
  };
}

function createPlanSections(perPlan) {
  return [
    {
      key: "by-shift",
      label: "各班原模型结果",
      metrics: perPlan.flatMap((plan) => [
        {
          key: `shift.${plan.index + 1}.lmd`,
          label: `${plan.name} 龙门币`,
          value: plan.lmd,
          unit: "LMD / 日等效",
        },
        {
          key: `shift.${plan.index + 1}.experience`,
          label: `${plan.name} 经验`,
          value: plan.exp,
          unit: "EXP / 日等效",
        },
        {
          key: `shift.${plan.index + 1}.gold`,
          label: `${plan.name} 赤金`,
          value: plan.gold,
          unit: "赤金 / 日等效",
        },
      ]),
    },
  ];
}

function createModelBoundaryMessages(schedule) {
  const messages = [
    createMessage(
      "warning",
      "龙门币为贸易站毛产能；赤金消耗、订单缓存和长期供需平衡未在该模型中结算",
    ),
    createMessage(
      "warning",
      "MAA JSON 不含精英阶段、初始心情和宿舍实际入住状态；涉及这些状态的技能按内置数据近似，不能视为实战精确值",
    ),
  ];

  if (schedule.plans.some((plan) => plan.dronesEnabled)) {
    messages.push(
      createMessage(
        "warning",
        "已检测到无人机设置，但未提供每日可用无人机数量，未计入无人机加速收益",
      ),
    );
  }
  if (schedule.plans.some((plan) => plan.fiammettaEnabled)) {
    messages.push(
      createMessage(
        "warning",
        "已检测到菲亚梅塔调度设置，未计入随时间变化的心情和轮换影响",
      ),
    );
  }

  return messages;
}

const engine = {
  id: ENGINE_ID,

  async calculate(maaSchedule) {
    const inspection = inspectMaaSchedule(maaSchedule);
    if (!inspection.schedule) {
      return {
        status: "unsupported",
        metrics: [],
        sections: [],
        messages: inspection.messages,
        trace: [],
      };
    }

    const calculator = getCalculator();
    const result = calculateTimeWeightedIncome(
      calculator,
      maaSchedule,
      inspection.schedule,
    );
    const trace = result.perPlan.flatMap((plan) => [
      `===== ${plan.name}（权重 ${(plan.weight * 100).toFixed(1)}%，${plan.durationMinutes} 分钟）=====`,
      ...plan.steps,
    ]);

    return {
      status: "success",
      metrics: [
        {
          key: "income.lmd",
          label: "龙门币",
          value: result.lmd,
          unit: "LMD / 日",
          primary: true,
        },
        {
          key: "income.experience",
          label: "经验",
          value: result.exp,
          unit: "EXP / 日",
          primary: true,
        },
        {
          key: "income.gold",
          label: "赤金",
          value: result.gold,
          unit: "赤金 / 日",
          primary: true,
        },
      ],
      sections: createPlanSections(result.perPlan),
      messages: [
        ...inspection.messages,
        ...createModelBoundaryMessages(inspection.schedule),
      ],
      trace,
    };
  },
};

export default engine;
