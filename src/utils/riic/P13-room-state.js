/** Shared room-state settlement for stateful RIIC skills. */
import { isRiicBaselineRuleUnlocked } from "./P05-baseline-skill.js";
import { getRiicSkillTags } from "./riic-operator-tags.js";

const SUPPORTED_MANUFACTURE_ROOM_STATE_FORMULA_TYPES = new Set([
  "roomOperatorStorageCapacityToProduction",
  "operatorStorageCapacityToProductionByThreshold",
  "roomOperatorCountToStorageCapacity",
  "roomSkillCountToStorageCapacity",
  "roomOperatorCountToProductionOverride",
]);

function normalizeId(value) {
  return String(value || "").trim();
}

function getUnlockRank(unlock) {
  return Number(unlock?.phase || 0) * 1000 + Number(unlock?.level || 1);
}

function isProductCompatible(effect, product) {
  return effect?.product === "all" || effect?.product === product;
}

function getActiveSourceSkillIds(operator, ruleData, roomType) {
  const states = (ruleData?.skillStates || []).filter(
    (state) =>
      state?.charId === operator?.charId &&
      state?.roomType === roomType,
  );
  const activeStackSourceIds = new Set();
  const activeReplacementStates = new Map();

  for (const state of states) {
    if (!isRiicBaselineRuleUnlocked(operator, state)) {
      continue;
    }

    if (state?.activation?.mode !== "replace" || !state?.activation?.group) {
      activeStackSourceIds.add(normalizeId(state.id));
      continue;
    }

    const replacementKey = String(state.activation.group);
    const current = activeReplacementStates.get(replacementKey);
    if (
      !current ||
      getUnlockRank(state.unlock) > getUnlockRank(current.unlock) ||
      (getUnlockRank(state.unlock) === getUnlockRank(current.unlock) &&
        String(state.id).localeCompare(String(current.id), "en") < 0)
    ) {
      activeReplacementStates.set(replacementKey, state);
    }
  }

  for (const state of activeReplacementStates.values()) {
    activeStackSourceIds.add(normalizeId(state.id));
  }

  return activeStackSourceIds;
}

function getActiveManufactureSkillStates(operator, ruleData) {
  const states = (ruleData?.skillStates || []).filter(
    (state) =>
      state?.charId === operator?.charId &&
      state?.roomType === "manufacture",
  );
  const activeSourceSkillIds = getActiveSourceSkillIds(
    operator,
    ruleData,
    "manufacture",
  );

  return states.filter((state) =>
    activeSourceSkillIds.has(normalizeId(state.id)),
  );
}

function isActiveStateRule(
  rule,
  operator,
  activeSourceSkillIds,
  ruleData,
) {
  const sourceSkillId = normalizeId(rule?.sourceSkillId || rule?.id);
  if (activeSourceSkillIds.has(sourceSkillId)) {
    return true;
  }

  const hasSourceState = (ruleData?.skillStates || []).some(
    (state) => normalizeId(state?.id) === sourceSkillId,
  );

  return !hasSourceState && isRiicBaselineRuleUnlocked(operator, rule);
}

function collectOperatorStorageContributions({
  roomOperators,
  ruleData,
  product,
} = {}) {
  const rules = Array.isArray(ruleData?.roomStateRules)
    ? ruleData.roomStateRules
    : [];
  const contributorsByOperatorId = new Map();
  let netDelta = 0;

  for (const operator of roomOperators || []) {
    const operatorId = normalizeId(operator?.charId);
    if (!operatorId) {
      continue;
    }

    const activeSourceSkillIds = getActiveSourceSkillIds(
      operator,
      ruleData,
      "manufacture",
    );
    const operatorRules = rules.filter((rule) => {
      if (
        normalizeId(rule?.charId) !== operatorId ||
        rule?.roomType !== "manufacture"
      ) {
        return false;
      }

      const effects = Array.isArray(rule?.effects) ? rule.effects : [];
      if (
        !effects.some(
          (effect) =>
            effect?.metric === "storageCapacity" &&
            isProductCompatible(effect, product),
        )
      ) {
        return false;
      }

      return isActiveStateRule(
        rule,
        operator,
        activeSourceSkillIds,
        ruleData,
      );
    });

    let operatorDelta = 0;
    let operatorIncrease = 0;
    const ruleContributions = [];

    for (const rule of operatorRules) {
      for (const effect of rule.effects || []) {
        if (
          effect?.metric !== "storageCapacity" ||
          !isProductCompatible(effect, product)
        ) {
          continue;
        }

        const amount = Number(effect.amount);
        if (!Number.isFinite(amount) || amount === 0) {
          continue;
        }

        operatorDelta += amount;
        netDelta += amount;
        const increase = Math.max(0, amount);
        operatorIncrease += increase;
        ruleContributions.push({
          ruleId: normalizeId(rule.id),
          sourceSkillId: normalizeId(rule.sourceSkillId || rule.id),
          buffName: String(rule.buffName || ""),
          amount,
          increase,
        });
      }
    }

    if (operatorDelta !== 0 || operatorIncrease !== 0) {
      contributorsByOperatorId.set(operatorId, {
        operatorId,
        name: String(operator?.name || operatorId),
        delta: operatorDelta,
        increase: operatorIncrease,
        rules: ruleContributions,
      });
    }
  }

  return {
    netDelta,
    increase: [...contributorsByOperatorId.values()].reduce(
      (total, contributor) => total + contributor.increase,
      0,
    ),
    contributors: [...contributorsByOperatorId.values()],
  };
}

function getActiveFormulaCandidates({
  roomOperators,
  ruleData,
  product,
} = {}) {
  const formulas = Array.isArray(ruleData?.roomStateFormulas)
    ? ruleData.roomStateFormulas
    : [];

  return (roomOperators || []).flatMap((operator) => {
    const operatorId = normalizeId(operator?.charId);
    if (!operatorId) {
      return [];
    }

    const activeSourceSkillIds = getActiveSourceSkillIds(
      operator,
      ruleData,
      "manufacture",
    );

    return formulas
      .filter((entry) => {
        if (
          normalizeId(entry?.charId) !== operatorId ||
          entry?.roomType !== "manufacture"
        ) {
          return false;
        }

        const formula = entry?.formula || {};
        return (
          SUPPORTED_MANUFACTURE_ROOM_STATE_FORMULA_TYPES.has(formula.type) &&
          isProductCompatible({ product: formula.product || "all" }, product) &&
          isActiveStateRule(
            entry,
            operator,
            activeSourceSkillIds,
            ruleData,
          )
        );
      })
      .map((entry) => ({
        ...entry,
        ownerOperatorId: operatorId,
        ownerName: String(operator?.name || operatorId),
      }));
  });
}

function selectFormulaByPrecedence(formulas) {
  const selectedByGroup = new Map();
  const stackedFormulas = [];

  for (const formula of formulas) {
    if (formula?.precedence?.mode === "stack") {
      stackedFormulas.push(formula);
      continue;
    }

    const group =
      String(formula?.precedence?.group || "").trim() ||
      String(formula?.formula?.type || formula?.id || "");
    const current = selectedByGroup.get(group);
    const priority = Number(formula?.precedence?.priority || 0);
    const currentPriority = Number(current?.precedence?.priority || 0);

    if (
      !current ||
      priority > currentPriority ||
      (priority === currentPriority &&
        String(formula.id).localeCompare(String(current.id), "en") < 0)
    ) {
      selectedByGroup.set(group, formula);
    }
  }

  return [...stackedFormulas, ...selectedByGroup.values()];
}

function createFormulaStorageContribution({
  formula,
  operatorId,
  name,
  amount,
  sourceSkillId = "",
} = {}) {
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    return null;
  }

  return {
    operatorId: `${normalizeId(formula?.id)}|${normalizeId(operatorId)}`,
    name: String(name || operatorId || formula?.ownerName || ""),
    delta: normalizedAmount,
    increase: Math.max(0, normalizedAmount),
    rules: [
      {
        ruleId: normalizeId(formula?.id),
        sourceSkillId:
          normalizeId(sourceSkillId) ||
          normalizeId(formula?.sourceSkillId || formula?.id),
        buffName: String(formula?.buffName || ""),
        amount: normalizedAmount,
        increase: Math.max(0, normalizedAmount),
      },
    ],
  };
}

function getFormulaStorageContributions(formula, roomOperators, ruleData) {
  const config = formula?.formula || {};
  const amountPerOperator = Number(config.amountPerOperator || 0);
  if (
    !Number.isFinite(amountPerOperator) ||
    amountPerOperator === 0
  ) {
    return [];
  }

  if (config.type === "roomOperatorCountToStorageCapacity") {
    return (roomOperators || [])
      .map((operator) =>
        createFormulaStorageContribution({
          formula,
          operatorId: operator?.charId,
          name: `${operator?.name || operator?.charId || ""} (${formula.ownerName})`,
          amount: amountPerOperator,
        }),
      )
      .filter(Boolean);
  }

  if (config.type === "roomSkillCountToStorageCapacity") {
    const skillNamePrefix = String(config.skillNamePrefix || "");
    const skillTag = String(config.skillTag || "").trim();
    return (roomOperators || []).flatMap((operator) =>
      getActiveManufactureSkillStates(operator, ruleData)
        .filter((state) => {
          const skillName = String(state?.id || "").split("|")[2] || "";
          if (skillTag) {
            return getRiicSkillTags(skillName).includes(skillTag);
          }
          return skillNamePrefix && skillName.startsWith(skillNamePrefix);
        })
        .map((state) => {
          const skillName = String(state?.id || "").split("|")[2] || "";
          return createFormulaStorageContribution({
            formula,
            operatorId: operator?.charId,
            name: `${operator?.name || operator?.charId || ""} (${skillName})`,
            amount: amountPerOperator,
            sourceSkillId: state?.id,
          });
        })
        .filter(Boolean),
    );
  }

  return [];
}

function calculateStorageFormula(formula, contributors) {
  const config = formula?.formula || {};
  const positiveContributors = (contributors || []).filter(
    (contributor) => contributor.increase > 0,
  );

  if (config.type === "roomOperatorStorageCapacityToProduction") {
    const percentPerInput = Number(config.percentPerInput || 0);
    return positiveContributors.reduce(
      (total, contributor) =>
        total + contributor.increase * percentPerInput,
      0,
    );
  }

  if (config.type === "operatorStorageCapacityToProductionByThreshold") {
    const threshold = Number(config.threshold);
    const atOrBelowPercentPerInput = Number(
      config.atOrBelowPercentPerInput || 0,
    );
    const abovePercentPerInput = Number(config.abovePercentPerInput || 0);

    if (!Number.isFinite(threshold)) {
      return 0;
    }

    return positiveContributors.reduce((total, contributor) => {
      const percentPerInput =
        contributor.increase <= threshold
          ? atOrBelowPercentPerInput
          : abovePercentPerInput;
      return total + contributor.increase * percentPerInput;
    }, 0);
  }

  return 0;
}

function calculateProductionOverride(formulas, roomOperators) {
  const formula = (formulas || []).find(
    (candidate) =>
      candidate?.formula?.type === "roomOperatorCountToProductionOverride",
  );
  if (!formula) {
    return null;
  }

  const config = formula.formula || {};
  const percentPerOperator = Number(config.percentPerOperator || 0);
  const operatorCount = (roomOperators || []).length;

  return {
    formulaId: formula.id,
    charId: formula.ownerOperatorId,
    name: formula.ownerName,
    buffName: formula.buffName,
    operatorCount,
    percentPerOperator: Number.isFinite(percentPerOperator)
      ? percentPerOperator
      : 0,
    localBonusPercent:
      (Number.isFinite(percentPerOperator) ? percentPerOperator : 0) *
      operatorCount,
    clearTeammateProduction: config.clearTeammateProduction !== false,
    preserveFacilityCountBonuses:
      config.preserveFacilityCountBonuses !== false,
  };
}

export function calculateRiicManufactureRoomState({
  roomOperators = [],
  product = "all",
  ruleData,
  middleDataStorageContributions = [],
} = {}) {
  const storage = collectOperatorStorageContributions({
    roomOperators,
    product,
    ruleData,
  });
  const formulaCandidates = getActiveFormulaCandidates({
    roomOperators,
    product,
    ruleData,
  });
  const appliedFormulas = selectFormulaByPrecedence(formulaCandidates);
  const formulaStorageContributions = appliedFormulas.flatMap((formula) =>
    getFormulaStorageContributions(formula, roomOperators, ruleData),
  );
  const normalizedMiddleDataStorageContributions =
    Array.isArray(middleDataStorageContributions)
      ? middleDataStorageContributions.filter(
          (contributor) =>
            Number.isFinite(Number(contributor?.delta)) &&
            Number.isFinite(Number(contributor?.increase)),
        )
      : [];
  const storageContributors = [
    ...storage.contributors,
    ...formulaStorageContributions,
    ...normalizedMiddleDataStorageContributions,
  ];
  const storageWithFormulas = {
    netDelta:
      storage.netDelta +
      formulaStorageContributions.reduce(
        (total, contributor) => total + contributor.delta,
        0,
      ) +
      normalizedMiddleDataStorageContributions.reduce(
        (total, contributor) => total + contributor.delta,
        0,
      ),
    increase:
      storage.increase +
      formulaStorageContributions.reduce(
        (total, contributor) => total + contributor.increase,
        0,
      ) +
      normalizedMiddleDataStorageContributions.reduce(
        (total, contributor) => total + contributor.increase,
        0,
      ),
    contributors: storageContributors,
  };
  const productionBonusPercent = appliedFormulas.reduce(
    (total, formula) =>
      total + calculateStorageFormula(formula, storageContributors),
    0,
  );
  const productionOverride = calculateProductionOverride(
    appliedFormulas,
    roomOperators,
  );

  return {
    roomState: {
      operatorStorageCapacityDelta: storageWithFormulas.netDelta,
      operatorStorageCapacityIncrease: storageWithFormulas.increase,
      storageCapacityContributors: storageWithFormulas.contributors,
      middleDataStorageCapacityContributors:
        normalizedMiddleDataStorageContributions,
    },
    formulaCandidates: formulaCandidates.map((formula) => ({
      id: formula.id,
      charId: formula.ownerOperatorId,
      name: formula.ownerName,
      buffName: formula.buffName,
      precedence: formula.precedence || {},
    })),
    appliedFormulas: appliedFormulas.map((formula) => ({
      id: formula.id,
      charId: formula.ownerOperatorId,
      name: formula.ownerName,
      buffName: formula.buffName,
      type: formula.formula?.type || "",
      precedence: formula.precedence || {},
      productionBonusPercent: calculateStorageFormula(
        formula,
        storageContributors,
      ),
      storageCapacityDelta: formulaStorageContributions
        .filter((contributor) =>
          contributor.rules.some((rule) => rule.ruleId === formula.id),
        )
        .reduce((total, contributor) => total + contributor.delta, 0),
    })),
    productionBonusPercent,
    productionOverride,
  };
}
