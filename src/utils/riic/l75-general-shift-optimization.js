import { evaluateRiicSelectedRoomTeams, getRiicWorkPattern } from "./l72-fallback-shift-optimization.js";
import { buildRiicMaaScheduleFromPreview } from "../riicScheduleExport.js";
import { getRiicSchedulePreviewOperatorSignature } from "../riicSchedulePreview.js";
import { buildRiicEfficiencySchedule, calculateRiicEfficiency } from "./riic-efficiency-adapter.js";

const EPSILON = 1e-9;
const MAX_SINGLE_TRIALS = 96;
const MAX_COMBINED_TRIALS = 192;
const MAX_COMBINED_SWAPS = 3;

function getOperatorId(operator) {
  return String(operator?.charId || "").trim();
}

async function getPreviewEvaluation(preview, ownedOperators, options) {
  const states = preview?.states || [];
  const controlState = {
    status: "ready",
    segments: states.map((state) => ({
      durationHours: Number(state.durationHours || 0),
      operatorIds: (state.rooms || []).filter((room) => room.facility === "control")
        .flatMap((room) => (room.operators || []).map(getOperatorId)).filter(Boolean),
    })),
  };
  const teams = states.flatMap((state, index) => (state.rooms || [])
    .filter((room) => room.facility !== "control")
    .map((room) => ({
      groupId: room.groupId || room.key,
      facility: room.facility,
      product: room.product || "all",
      stationLevel: room.stationLevel,
      stationIndexByStateIndex: { [index]: Number(room.stationIndex || 0) },
      activeStateIndexes: [index],
      operatorIds: (room.operators || []).map(getOperatorId).filter(Boolean),
    })));
  const result = evaluateRiicSelectedRoomTeams({ teams, controlState, ownedOperators,
    orundumCraftMaterial: options.orundumCraftMaterial, includeDroneOutput: true });
  if (!result) return null;
  const schedule = buildRiicMaaScheduleFromPreview({
    preview, durationSource: "preview", includeRiicRoomLevels: true, forceSkipFalse: true,
  }).schedule;
  const packageSchedule = buildRiicEfficiencySchedule(schedule, {
    operatorProfiles: ownedOperators,
    operatorTable: Object.fromEntries(ownedOperators.map((operator) => [operator.charId, operator])),
    orundumCraftMaterial: options.orundumCraftMaterial,
    efficiencySettings: options.efficiencySettings,
    treatSkillsAsUnlocked: options.treatSkillsAsUnlocked === true,
  });
  const packageResult = await calculateRiicEfficiency(packageSchedule);
  if (!Array.isArray(packageResult?.dailyOutputs)) return null;
  const production = packageResult.dailyOutputs.filter((item) => item.kind === "production");
  if (production.some((item) => item.amountPerDay === null || !Number.isFinite(Number(item.amountPerDay)))) return null;
  result.packageResources = new Map(production.map((item) => [item.product, Number(item.amountPerDay)]));
  return result;
}

function isConservativeImprovement(before, after) {
  if (!before || !after || [...after.issues].some((issue) => !before.issues.has(issue))) return false;
  let improved = false;
  for (const field of ["grossResources", "packageResources"]) {
    const left = before[field];
    const right = after[field];
    for (const key of new Set([...left.keys(), ...right.keys()])) {
      const difference = Number(right.get(key) || 0) - Number(left.get(key) || 0);
      if (difference < -EPSILON) return false;
      if (difference > EPSILON) improved = true;
    }
  }
  const droneDifference = after.droneOutputPerCycle - before.droneOutputPerCycle;
  if (droneDifference < -EPSILON) return false;
  if (droneDifference > EPSILON) improved = true;
  return improved;
}

function getWorkPatterns(preview, { includeStatic = true } = {}) {
  const states = preview.states || [];
  const segments = states.map((state) => ({ durationHours: state.durationHours }));
  const activeStatesById = new Map();
  for (const [index, state] of states.entries()) {
    const seen = new Set();
    for (const room of state.rooms || []) {
      if (!includeStatic && room.isStatic) continue;
      for (const operator of room.operators || []) {
        const id = getOperatorId(operator);
        if (!id) return null;
        if (seen.has(id)) return null;
        seen.add(id);
        if (!activeStatesById.has(id)) activeStatesById.set(id, []);
        activeStatesById.get(id).push(index);
      }
    }
  }
  return new Map([...activeStatesById].map(([id, activeStateIndexes]) => [
    id, JSON.stringify(getRiicWorkPattern({ activeStateIndexes }, segments)),
  ]));
}

export async function validateRiicPreviewShiftOptimization({ preview, finalizedPreview, ownedOperators = [],
  orundumCraftMaterial = "orirock", efficiencySettings, treatSkillsAsUnlocked = false } = {}) {
  if (!getWorkPatterns(preview) || !getWorkPatterns(finalizedPreview)) return false;
  const beforePatterns = getWorkPatterns(preview, { includeStatic: false });
  const afterPatterns = getWorkPatterns(finalizedPreview, { includeStatic: false });
  if (beforePatterns.size !== afterPatterns.size ||
    [...beforePatterns].some(([id, pattern]) => afterPatterns.get(id) !== pattern)) return false;
  const options = { orundumCraftMaterial, efficiencySettings, treatSkillsAsUnlocked };
  const before = await getPreviewEvaluation(preview, ownedOperators, options);
  const after = await getPreviewEvaluation(finalizedPreview, ownedOperators, options);
  return isConservativeImprovement(before, after);
}

function getSlots(preview, eligibleGroupIds, lockedIds) {
  return (preview.states || []).flatMap((state, stateIndex) => (state.rooms || [])
    .filter((room) => eligibleGroupIds.has(room.groupId) && !room.isStatic && !room.manuallyEdited && room.facility !== "control")
    .flatMap((room) => {
      const operators = room.operators || [];
      const count = Math.max(operators.length, Number(room.expectedSlots || 0));
      return Array.from({ length: count }, (_, operatorIndex) => ({
        stateIndex, roomKey: room.key, room, operatorIndex,
        operator: operators[operatorIndex] || null,
      })).filter((slot) => !lockedIds.has(getOperatorId(slot.operator)));
    }));
}

function applySwaps(preview, swaps) {
  const states = (preview.states || []).map((state) => ({
    ...state,
    rooms: (state.rooms || []).map((room) => ({ ...room, operators: [...(room.operators || [])] })),
  }));
  for (const [left, right] of swaps) {
    const leftRoom = states[left.stateIndex].rooms.find((room) => room.key === left.roomKey);
    const rightRoom = states[right.stateIndex].rooms.find((room) => room.key === right.roomKey);
    leftRoom.operators[left.operatorIndex] = right.operator;
    rightRoom.operators[right.operatorIndex] = left.operator;
  }
  for (const state of states) {
    for (const room of state.rooms) room.operators = room.operators.filter(Boolean);
  }
  return { ...preview, states };
}

function slotKey(slot) {
  return `${slot.stateIndex}:${slot.roomKey}:${slot.operatorIndex}`;
}

export async function searchRiicCombinedShiftSwaps({ orderedSwaps, getBestSelection, evaluate }) {
  let guidedCount = 0;
  for (const swap of orderedSwaps) {
    const selection = getBestSelection();
    if (!selection.length || selection.length >= MAX_COMBINED_SWAPS || guidedCount >= MAX_SINGLE_TRIALS) break;
    const next = [...selection, swap];
    const keys = next.flat().map(slotKey);
    if (new Set(keys).size !== keys.length) continue;
    guidedCount += 1;
    await evaluate(next);
  }

  function* combinations(first) {
    for (let second = first + 1; second < orderedSwaps.length; second += 1) {
      yield [orderedSwaps[first], orderedSwaps[second]];
      if (MAX_COMBINED_SWAPS >= 3) {
        for (let third = second + 1; third < orderedSwaps.length; third += 1) {
          yield [orderedSwaps[first], orderedSwaps[second], orderedSwaps[third]];
        }
      }
    }
  }
  const iterators = orderedSwaps.map((_, index) => combinations(index));
  let combinedCount = 0;
  while (combinedCount < MAX_COMBINED_TRIALS && iterators.length) {
    for (let index = 0; index < iterators.length && combinedCount < MAX_COMBINED_TRIALS;) {
      const next = iterators[index].next();
      if (next.done) {
        iterators.splice(index, 1);
        continue;
      }
      index += 1;
      const keys = next.value.flat().map(slotKey);
      if (new Set(keys).size !== keys.length) continue;
      combinedCount += 1;
      await evaluate(next.value);
    }
  }
}

export async function optimizeRiicPreviewShifts({ preview, ownedOperators = [], eligibleGroupIds = [], lockedOperatorIds = [],
  orundumCraftMaterial = "orirock", efficiencySettings, treatSkillsAsUnlocked = false } = {}) {
  if (!preview?.states?.length) return { overrides: {}, trialCount: 0 };
  const initialPatterns = getWorkPatterns(preview);
  if (!initialPatterns) return { overrides: {}, trialCount: 0 };
  const options = { orundumCraftMaterial, efficiencySettings, treatSkillsAsUnlocked };
  const baseline = await getPreviewEvaluation(preview, ownedOperators, options);
  if (!baseline) return { overrides: {}, trialCount: 0 };
  const slots = getSlots(preview, new Set(eligibleGroupIds), new Set(lockedOperatorIds));
  const swaps = [];
  for (let leftIndex = 0; leftIndex < slots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < slots.length; rightIndex += 1) {
      const left = slots[leftIndex];
      const right = slots[rightIndex];
      if (left.stateIndex === right.stateIndex || left.room.facility !== right.room.facility ||
        left.room.stationLevel !== right.room.stationLevel || left.room.product !== right.room.product ||
        Number(preview.states[left.stateIndex].durationHours) !== Number(preview.states[right.stateIndex].durationHours) ||
        (!left.operator && !right.operator) || getOperatorId(left.operator) === getOperatorId(right.operator)) continue;
      swaps.push([left, right]);
    }
  }
  const swapsByGroup = new Map();
  for (const swap of swaps) {
    const key = [swap[0].room.facility, ...[swap[0].room.groupId, swap[1].room.groupId].sort()].join(":");
    if (!swapsByGroup.has(key)) swapsByGroup.set(key, []);
    swapsByGroup.get(key).push(swap);
  }
  const orderedSwaps = [];
  while (orderedSwaps.length < MAX_SINGLE_TRIALS) {
    let added = false;
    for (const group of swapsByGroup.values()) {
      if (group.length && orderedSwaps.length < MAX_SINGLE_TRIALS) {
        orderedSwaps.push(group.shift());
        added = true;
      }
    }
    if (!added) break;
  }
  let best = baseline;
  let bestPreview = preview;
  let bestSelection = [];
  let trialCount = 0;
  const evaluate = async (selection) => {
    const candidate = applySwaps(preview, selection);
    const patterns = getWorkPatterns(candidate);
    if (!patterns || patterns.size !== initialPatterns.size ||
      [...initialPatterns].some(([id, pattern]) => patterns.get(id) !== pattern)) return;
    trialCount += 1;
    let result;
    try {
      result = await getPreviewEvaluation(candidate, ownedOperators, options);
    } catch {
      return;
    }
    if (isConservativeImprovement(best, result)) {
      best = result;
      bestPreview = candidate;
      bestSelection = selection;
    }
  };
  for (const swap of orderedSwaps) await evaluate([swap]);

  await searchRiicCombinedShiftSwaps({ orderedSwaps, getBestSelection: () => bestSelection, evaluate });

  const overrides = {};
  for (const [index, state] of bestPreview.states.entries()) {
    for (const room of state.rooms || []) {
      const original = preview.states[index].rooms.find((item) => item.key === room.key);
      if (JSON.stringify((room.operators || []).map(getOperatorId)) !== JSON.stringify((original?.operators || []).map(getOperatorId))) {
        overrides[`${index}:${room.key}`] = room.operators;
      }
    }
  }
  return { overrides, trialCount, expectedSignature: getRiicSchedulePreviewOperatorSignature(bestPreview) };
}
