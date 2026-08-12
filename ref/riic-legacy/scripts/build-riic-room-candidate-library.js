import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  calculateRiicRoomEfficiency,
  resolveRiicBaselineSkills,
} from "../src/utils/riicBaselineSkillResolver.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_SCHEDULE_DIR =
  process.env.RIIC_RAW_SCHEDULE_DIR ||
  "D:\\AK\\2026\\A202608\\schedule_export";
const BASE_CATALOG_PATH =
  "src/static/json/tools/riic_room_group_candidates.json";
const RULE_PATH = "src/static/json/tools/riic_baseline_skill_rules.json";
const PROFILE_PATH =
  "src/static/json/tools/riic_room_candidate_profiles.json";
const MANUAL_CANDIDATE_PATHS = [
  "src/static/json/tools/riic_manual_room_candidates.json",
  "src/static/json/tools/riic_manual_meeting_candidates.json",
];
const OPERATOR_PATH =
  "src/static/json/operator/character_table_simple.v2.json";
const OUTPUT_DIR = "src/static/json/tools/riic-candidates";
const LEGACY_FALLBACK_OPERATOR_PATH =
  "src/static/json/tools/riic-fallback-operators.json";
const PRIVATE_AUDIT_DIR =
  process.env.RIIC_PRIVATE_AUDIT_DIR ||
  path.join(RAW_SCHEDULE_DIR, "riic-candidate-audit");

const SUPPORTED_ROOM_TYPES = new Set([
  "manufacture",
  "trading",
  "power",
  "control",
  "meeting",
  "hire",
]);
const PERCENT_FIELD_BY_ROOM_TYPE = Object.freeze({
  trading: "tradingPercent",
  manufacture: "manufacturePercent",
  meeting: "meetingPercent",
  hire: "officePercent",
  power: "powerPercent",
});
const PERCENT_FIELDS = Object.freeze([
  "tradingPercent",
  "manufacturePercent",
  "meetingPercent",
  "officePercent",
  "powerPercent",
]);

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(absolute(relativePath), "utf8"));
}

const outputDirectory = absolute(OUTPUT_DIR);
const outputRelativePath = path.relative(ROOT, outputDirectory);
if (
  !outputRelativePath ||
  outputRelativePath.startsWith("..") ||
  path.isAbsolute(outputRelativePath)
) {
  throw new Error(`Unsafe RIIC candidate output directory: ${outputDirectory}`);
}
try {
  const existingIndex = JSON.parse(
    await fs.readFile(path.join(outputDirectory, "index.json"), "utf8"),
  );
  if (Number(existingIndex?.schemaVersion) >= 6) {
    throw new Error(
      `Refusing to replace the Schema ${existingIndex.schemaVersion} RIIC runtime catalog with the legacy Schema 5 generator`,
    );
  }
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), "en");
}

function roomProductKey(roomType, product) {
  return `${roomType}:${product}`;
}

function catalogKey(roomType, product, stationLevel, slotCount) {
  return `${roomProductKey(roomType, product)}:${stationLevel}:${slotCount}`;
}

function getCatalogFilePath({ roomType, product, stationLevel }, suffix = "") {
  const directory =
    product === "all" ? roomType : path.join(roomType, product);
  return path.join(directory, `${stationLevel}${suffix}.json`);
}

function getProduct(roomType, product) {
  if (roomType === "manufacture") {
    if (product === "Battle Record") {
      return "experience";
    }
    if (product === "Pure Gold") {
      return "gold";
    }
    if (product === "Originium Shard") {
      return "orundum";
    }
    return null;
  }

  if (roomType === "trading") {
    if (product === "Pure Gold") {
      return "lmd";
    }
    if (product === "Originium Shard") {
      return "orundum";
    }
  }

  return "all";
}

function getProfileStations(profile) {
  const configuredStations = Array.isArray(profile?.stations)
    ? profile.stations
    : (profile?.allowedSlots || []).map((slotCount) => ({
        stationLevel: slotCount,
        slotCount,
      }));

  return configuredStations
    .map((station) => ({
      stationLevel: Number(station?.stationLevel),
      slotCount: Number(station?.slotCount),
    }))
    .filter(
      (station) =>
        Number.isInteger(station.stationLevel) &&
        station.stationLevel > 0 &&
        Number.isInteger(station.slotCount) &&
        station.slotCount > 0,
    );
}

function getUnlockRank(unlock) {
  return Number(unlock?.phase ?? unlock?.elite ?? 0) * 1000 +
    Number(unlock?.level || 1);
}

function getHigherUnlock(left, right) {
  return getUnlockRank(left) >= getUnlockRank(right) ? left : right;
}

function shortHash(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

function normalizePercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) {
    return 0;
  }
  return Number.isInteger(percent) ? percent : Number(percent.toFixed(2));
}

function getPercentField(roomType) {
  return PERCENT_FIELD_BY_ROOM_TYPE[roomType] || null;
}

function getCandidatePercentFields(candidate) {
  const values = Object.fromEntries(
    PERCENT_FIELDS.map((field) => [field, Number(candidate?.[field])]),
  );

  return PERCENT_FIELDS.every((field) => Number.isFinite(values[field]))
    ? values
    : null;
}

function createCandidatePercentFields({
  roomType,
  localBonusPercent,
}) {
  const values = Object.fromEntries(PERCENT_FIELDS.map((field) => [field, 0]));
  const localField = getPercentField(roomType);
  if (localField) {
    values[localField] = normalizePercent(localBonusPercent);
  }

  return values;
}

function normalizeCandidatePercentFields(percentFields) {
  return Object.fromEntries(
    PERCENT_FIELDS.map((field) => [
      field,
      normalizePercent(percentFields[field]),
    ]),
  );
}

function buildProfiles(profileData) {
  const profiles = new Map();

  for (const profile of profileData?.profiles || []) {
    const roomType = String(profile?.roomType || "").trim();
    const product = String(profile?.product || "").trim();
    const percent = Number(profile?.fallback?.percent || 0);
    const coreMinimumPercent = Number(profile?.coreMinimumPercent);
    const label =
      String(profile?.fallback?.label || "基础补位").trim() || "基础补位";

    if (!roomType || !product || !Number.isFinite(percent)) {
      continue;
    }

    for (const station of getProfileStations(profile)) {
      const value = {
        roomType,
        product,
        stationLevel: station.stationLevel,
        slotCount: station.slotCount,
        fallback: {
          percent: normalizePercent(percent),
          label,
          poolKey: roomProductKey(roomType, product),
        },
        ...(Number.isFinite(coreMinimumPercent)
          ? { coreMinimumPercent: normalizePercent(coreMinimumPercent) }
          : {}),
      };
      profiles.set(
        catalogKey(
          value.roomType,
          value.product,
          value.stationLevel,
          value.slotCount,
        ),
        value,
      );
    }
  }

  return profiles;
}

function buildRuleMap(ruleData) {
  const rulesById = new Map();

  for (const rule of [
    ...(ruleData?.rules || []),
    ...(ruleData?.sameRoomRules || []),
  ]) {
    if (rule?.id) {
      rulesById.set(rule.id, rule);
    }
  }

  return rulesById;
}

function getProductSpecificOperatorsByRoom(rulesById) {
  const operatorsByRoom = new Map();

  for (const rule of rulesById.values()) {
    const roomType = String(rule?.roomType || "").trim();
    const charId = String(rule?.charId || "").trim();
    if (!roomType || !charId || rule?.effect?.product === "all") {
      continue;
    }

    if (!operatorsByRoom.has(roomType)) {
      operatorsByRoom.set(roomType, new Set());
    }
    operatorsByRoom.get(roomType).add(charId);
  }

  return operatorsByRoom;
}

function getRequirements({ operatorIds, appliedRules, rulesById }) {
  const unlockByCharId = new Map();

  for (const appliedRule of appliedRules || []) {
    const charId = String(appliedRule?.ownerCharId || "").trim();
    const sourceRule = rulesById.get(appliedRule?.id);
    if (!charId || !sourceRule?.unlock) {
      continue;
    }

    const candidateUnlock = {
      phase: Number(sourceRule.unlock.phase || 0),
      level: Number(sourceRule.unlock.level || 1),
    };
    unlockByCharId.set(
      charId,
      unlockByCharId.has(charId)
        ? getHigherUnlock(unlockByCharId.get(charId), candidateUnlock)
        : candidateUnlock,
    );
  }

  return operatorIds.map((charId) => {
    const unlock = unlockByCharId.get(charId) || { phase: 0, level: 1 };
    return {
      charId,
      elite: Number(unlock.phase || 0),
      level: Number(unlock.level || 1),
    };
  });
}

function createRawCandidate({
  roomType,
  product,
  stationLevel,
  operatorIds,
  score,
  usageCount,
  sampleScheduleIds,
}) {
  return {
    roomType,
    product,
    stationLevel,
    slotCount: operatorIds.length,
    operatorIds,
    quality: (score.appliedRules || []).some(
      (rule) => rule.coverage === "baseOnly",
    )
      ? "baseOnly"
      : "complete",
    calculationStatus: (score.appliedRules || []).some(
      (rule) => rule.coverage === "baseOnly",
    )
      ? "estimated"
      : "calculated",
    source: {
      kind: "rawMaaSchedule",
      usageCount,
      sampleScheduleIds,
    },
  };
}

function getCandidateOperatorIds(candidate) {
  return (candidate?.operatorIds ||
    candidate?.members?.map((member) => member?.charId) ||
    [])
    .map((charId) => String(charId || "").trim())
    .filter(Boolean);
}

function toInternalCandidate(candidate) {
  const operatorIds = getCandidateOperatorIds(candidate);
  const roomType = String(candidate?.roomType || "").trim();
  const product = String(candidate?.product || "").trim();
  const slotCount = Number(candidate?.slotCount || 0);
  const stationLevel = Number(candidate?.stationLevel || slotCount);

  if (
    !roomType ||
    !product ||
    !Number.isInteger(stationLevel) ||
    stationLevel < 1 ||
    !Number.isInteger(slotCount) ||
    slotCount < 1 ||
    operatorIds.length === 0 ||
    operatorIds.length > slotCount
  ) {
    return null;
  }

  return {
    roomType,
    product,
    stationLevel,
    slotCount,
    operatorIds,
    sortScore: Number.isFinite(Number(candidate?.sortScore))
      ? normalizePercent(candidate.sortScore)
      : 0,
    quality: candidate?.quality === "baseOnly" ? "baseOnly" : "complete",
    calculationStatus: String(candidate?.calculationStatus || "calculated"),
    source: candidate?.source || {},
  };
}

const VALID_CALCULATION_STATUSES = new Set([
  "calculated",
  "estimated",
  "estimatePending",
]);

function toOptionalNonNegativeInteger(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function normalizeManualCandidate({
  candidate,
  profiles,
  nameToCharId,
}) {
  const id = String(candidate?.id || "").trim();
  const variantGroupId = String(candidate?.variantGroupId || "").trim();
  const name = String(candidate?.name || "").trim();
  const roomType = String(candidate?.roomType || "").trim();
  const product = String(candidate?.product || "").trim();
  const stationLevel = Number(candidate?.stationLevel);
  const slotCount = Number(candidate?.slotCount);
  const percentFields = getCandidatePercentFields(candidate);
  const localPercentField = getPercentField(roomType);
  const sortScore = Number(candidate?.sortScore);
  const calculationStatus = String(
    candidate?.calculationStatus || "",
  ).trim();
  const hasPowerPlantCount = Object.hasOwn(candidate || {}, "powerPlantCount");
  const powerPlantCount = toOptionalNonNegativeInteger(
    candidate?.powerPlantCount,
  );
  const hasTradingStationCount = Object.hasOwn(
    candidate || {},
    "tradingStationCount",
  );
  const tradingStationCount = toOptionalNonNegativeInteger(
    candidate?.tradingStationCount,
  );
  const hasGoldManufactureStationCount = Object.hasOwn(
    candidate || {},
    "goldManufactureStationCount",
  );
  const goldManufactureStationCount = toOptionalNonNegativeInteger(
    candidate?.goldManufactureStationCount,
  );
  const hasVirtualGoldPerHour = Object.hasOwn(
    candidate || {},
    "virtualGoldPerHour",
  );
  const virtualGoldPerHour = Number(candidate?.virtualGoldPerHour);
  const profile = profiles.get(
    catalogKey(roomType, product, stationLevel, slotCount),
  );

  if (
    !id ||
    !variantGroupId ||
    !name ||
    !profile ||
    !percentFields ||
    !localPercentField ||
    !Number.isFinite(sortScore) ||
    !VALID_CALCULATION_STATUSES.has(calculationStatus) ||
    (hasPowerPlantCount &&
      (powerPlantCount === null || powerPlantCount < 1)) ||
    (hasTradingStationCount &&
      (tradingStationCount === null || tradingStationCount < 1)) ||
    (hasGoldManufactureStationCount &&
      (goldManufactureStationCount === null ||
        goldManufactureStationCount < 1)) ||
    (hasVirtualGoldPerHour &&
      (!Number.isFinite(virtualGoldPerHour) || virtualGoldPerHour < 0))
  ) {
    throw new Error(`Invalid manual RIIC candidate: ${id || "(missing id)"}`);
  }

  const seenNames = new Set();
  const members = (candidate?.members || []).map((member) => {
    const memberName = String(member?.name || "").trim();
    const elite = toOptionalNonNegativeInteger(member?.elite, 0);
    const level = toOptionalNonNegativeInteger(member?.level, 1);
    const hasMaxElite = Object.hasOwn(member || {}, "maxElite");
    const maxElite = toOptionalNonNegativeInteger(member?.maxElite);

    if (
      !memberName ||
      !nameToCharId.has(memberName) ||
      seenNames.has(memberName) ||
      elite === null ||
      level === null ||
      level < 1 ||
      (hasMaxElite && (maxElite === null || maxElite < elite))
    ) {
      throw new Error(`Invalid manual RIIC member in ${id}: ${memberName}`);
    }

    seenNames.add(memberName);
    return {
      name: memberName,
      ...(elite > 0 ? { elite } : {}),
      ...(level > 1 ? { level } : {}),
      ...(hasMaxElite ? { maxElite } : {}),
    };
  });

  if (members.length === 0 || members.length > profile.slotCount) {
    throw new Error(`Invalid manual RIIC member count for ${id}`);
  }

  return {
    id,
    variantGroupId,
    name,
    roomType,
    product,
    stationLevel,
    slotCount,
    members,
    ...normalizeCandidatePercentFields(percentFields),
    sortScore: normalizePercent(sortScore),
    ...(candidate?.selectionMode === "individual"
      ? { selectionMode: "individual" }
      : {}),
    ...(candidate?.quality === "baseOnly" ? { quality: "baseOnly" } : {}),
    ...(hasPowerPlantCount ? { powerPlantCount } : {}),
    ...(hasTradingStationCount ? { tradingStationCount } : {}),
    ...(hasGoldManufactureStationCount ? { goldManufactureStationCount } : {}),
    ...(hasVirtualGoldPerHour
      ? { virtualGoldPerHour: Number(virtualGoldPerHour.toFixed(6)) }
      : {}),
    calculationStatus,
  };
}

function normalizeManualCandidates({
  manualCandidateData,
  profiles,
  nameToCharId,
}) {
  if (Number(manualCandidateData?.schemaVersion) !== 2) {
    throw new Error("Invalid manual RIIC candidate source schema");
  }

  const ids = new Set();
  return (manualCandidateData?.candidates || []).map((candidate) => {
    const normalized = normalizeManualCandidate({
      candidate,
      profiles,
      nameToCharId,
    });
    if (ids.has(normalized.id)) {
      throw new Error(`Duplicate manual RIIC candidate id: ${normalized.id}`);
    }
    ids.add(normalized.id);
    return normalized;
  });
}

function buildTemplateNameMap(baseCatalog) {
  const templateNameByMemberSet = new Map();

  for (const candidate of baseCatalog?.candidates || []) {
    const templateName = String(candidate?.source?.templateName || "").trim();
    const operatorIds = getCandidateOperatorIds(candidate);
    if (!templateName || operatorIds.length === 0) {
      continue;
    }

    const key = [
      candidate.roomType,
      candidate.product,
      candidate.stationLevel || candidate.slotCount,
      [...operatorIds].sort(compareText).join("|"),
    ].join(":");
    if (!templateNameByMemberSet.has(key)) {
      templateNameByMemberSet.set(key, templateName);
    }
  }

  return templateNameByMemberSet;
}

async function collectRawGroups({ nameToCharId, profiles }) {
  const files = (await fs.readdir(RAW_SCHEDULE_DIR))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort(compareText);
  const groups = new Map();
  const unknownNames = new Map();
  const summary = {
    fileCount: files.length,
    scheduleCount: 0,
    planCount: 0,
    scannedRoomCount: 0,
    skippedRoomCount: 0,
    unresolvedRoomCount: 0,
  };

  for (const fileName of files) {
    const entries = JSON.parse(
      await fs.readFile(path.join(RAW_SCHEDULE_DIR, fileName), "utf8"),
    );

    for (const entry of entries) {
      summary.scheduleCount += 1;
      let schedule;
      try {
        schedule = JSON.parse(entry?.schedule || "");
      } catch {
        continue;
      }

      for (const plan of schedule?.plans || []) {
        summary.planCount += 1;
        for (const [roomType, stations] of Object.entries(plan?.rooms || {})) {
          if (!SUPPORTED_ROOM_TYPES.has(roomType)) {
            continue;
          }

          for (const station of stations || []) {
            if (
              station?.skip ||
              station?.autofill ||
              !Array.isArray(station?.operators) ||
              station.operators.length === 0
            ) {
              summary.skippedRoomCount += 1;
              continue;
            }

            const product = getProduct(roomType, station.product);
            const names = station.operators
              .map((name) => String(name || "").trim())
              .filter(Boolean);
            const stationLevel = names.length;
            const profile = profiles.get(
              catalogKey(roomType, product, stationLevel, names.length),
            );
            if (!product || !profile || names.length !== profile.slotCount) {
              summary.skippedRoomCount += 1;
              continue;
            }

            summary.scannedRoomCount += 1;
            const unknown = names.filter((name) => !nameToCharId.has(name));
            if (unknown.length > 0) {
              summary.unresolvedRoomCount += 1;
              for (const name of unknown) {
                unknownNames.set(name, (unknownNames.get(name) || 0) + 1);
              }
              continue;
            }

            const operatorIds = names.map((name) => nameToCharId.get(name));
            const memberSetKey = [...operatorIds].sort(compareText).join("|");
            const key = `${roomType}:${product}:${stationLevel}:${memberSetKey}`;
            const operatorOrderKey = operatorIds.join("|");
            const current = groups.get(key) || {
              roomType,
              product,
              stationLevel,
              operatorIds,
              usageCount: 0,
              sampleScheduleIds: [],
              operatorOrderUsage: new Map(),
            };
            current.usageCount += 1;
            const nextOrderUsage =
              (current.operatorOrderUsage.get(operatorOrderKey) || 0) + 1;
            current.operatorOrderUsage.set(operatorOrderKey, nextOrderUsage);
            const currentOrderKey = current.operatorIds.join("|");
            const currentOrderUsage =
              current.operatorOrderUsage.get(currentOrderKey) || 0;
            if (
              nextOrderUsage > currentOrderUsage ||
              (nextOrderUsage === currentOrderUsage &&
                compareText(operatorOrderKey, currentOrderKey) < 0)
            ) {
              current.operatorIds = operatorIds;
            }
            if (
              entry?.scheduleId &&
              current.sampleScheduleIds.length < 3 &&
              !current.sampleScheduleIds.includes(entry.scheduleId)
            ) {
              current.sampleScheduleIds.push(entry.scheduleId);
            }
            groups.set(key, current);
          }
        }
      }
    }
  }

  return {
    groups: [...groups.values()],
    summary,
    unknownNames: [...unknownNames.entries()]
      .map(([name, usageCount]) => ({ name, usageCount }))
      .sort(
        (left, right) =>
          right.usageCount - left.usageCount ||
          left.name.localeCompare(right.name, "zh-CN"),
      ),
  };
}

function getActiveSameRoomMemberIds(score, rulesById) {
  const protectedIds = new Set();

  for (const appliedRule of score?.appliedRules || []) {
    if (appliedRule?.kind !== "sameRoom") {
      continue;
    }

    const sourceRule = rulesById.get(appliedRule.id);
    if (!sourceRule?.condition?.charIds) {
      continue;
    }

    const ownerCharId = String(appliedRule.ownerCharId || "").trim();
    if (ownerCharId) {
      protectedIds.add(ownerCharId);
    }
    for (const charId of sourceRule.condition.charIds) {
      const normalized = String(charId || "").trim();
      if (normalized) {
        protectedIds.add(normalized);
      }
    }
  }

  return protectedIds;
}

function getDirectPercent({
  allIdealSkills,
  roomType,
  product,
  charId,
  cache,
}) {
  const key = `${roomType}:${product}:${charId}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const score = calculateRiicRoomEfficiency({
    resolvedSkills: allIdealSkills,
    roomType,
    product,
    operatorIds: [charId],
    expectedSlots: 1,
  });
  const percent = score.valid
    ? normalizePercent(Number(score.totalPercent || 100) - 100)
    : 0;
  cache.set(key, percent);
  return percent;
}

function shouldKeepCandidateMemberAsCore({ directPercent, profile }) {
  const configuredMinimum = Number(profile?.coreMinimumPercent);
  if (Number.isFinite(configuredMinimum)) {
    return directPercent >= configuredMinimum;
  }

  return directPercent > Number(profile?.fallback?.percent || 0);
}

function getMemberSetKey(roomType, product, stationLevel, operatorIds) {
  return [
    roomType,
    product,
    stationLevel,
    [...operatorIds].sort(compareText).join("|"),
  ].join(":");
}

function toPublicMember({ charId, requirement, namesById }) {
  const member = {
    name: namesById.get(charId) || charId,
  };
  if (Number(requirement?.elite || 0) > 0) {
    member.elite = Number(requirement.elite);
  }
  if (Number(requirement?.level || 1) > 1) {
    member.level = Number(requirement.level);
  }
  return member;
}

function getCandidateName({
  roomType,
  product,
  stationLevel,
  operatorIds,
  namesById,
  fallbackCount,
  source,
  templateNameByMemberSet,
}) {
  const templateName =
    String(source?.templateName || "").trim() ||
    templateNameByMemberSet.get(
      getMemberSetKey(roomType, product, stationLevel, operatorIds),
    ) ||
    "";
  const coreName =
    templateName ||
    operatorIds
      .map((charId) => namesById.get(charId) || charId)
      .join(" + ");

  return fallbackCount > 0
    ? `${coreName} + ${fallbackCount}位任意补位`
    : coreName;
}

function normalizePublicCandidate({
  candidate,
  profile,
  allIdealSkills,
  rulesById,
  namesById,
  directPercentCache,
  templateNameByMemberSet,
}) {
  const fullScore = calculateRiicRoomEfficiency({
    resolvedSkills: allIdealSkills,
    roomType: candidate.roomType,
    product: candidate.product,
    operatorIds: candidate.operatorIds,
    expectedSlots: candidate.operatorIds.length,
  });
  if (!fullScore.valid) {
    return null;
  }

  const protectedIds = getActiveSameRoomMemberIds(fullScore, rulesById);
  const isAtomicTemplateCore =
    candidate.source?.kind === "template" &&
    candidate.source?.lock === "atomicCore";
  const coreOperatorIds = candidate.operatorIds.filter((charId) => {
    if (isAtomicTemplateCore || protectedIds.has(charId)) {
      return true;
    }
    return shouldKeepCandidateMemberAsCore({
      directPercent: getDirectPercent({
        allIdealSkills,
        roomType: candidate.roomType,
        product: candidate.product,
        charId,
        cache: directPercentCache,
      }),
      profile,
    });
  });
  const fallbackCount = profile.slotCount - coreOperatorIds.length;

  if (coreOperatorIds.length === 0 || fallbackCount < 0) {
    return null;
  }

  const coreScore = calculateRiicRoomEfficiency({
    resolvedSkills: allIdealSkills,
    roomType: candidate.roomType,
    product: candidate.product,
    operatorIds: coreOperatorIds,
    expectedSlots: coreOperatorIds.length,
  });
  if (!coreScore.valid) {
    return null;
  }

  const requirements = getRequirements({
    operatorIds: coreOperatorIds,
    appliedRules: coreScore.appliedRules,
    rulesById,
  });
  const members = coreOperatorIds.map((charId, index) =>
    toPublicMember({
      charId,
      requirement: requirements[index],
      namesById,
    }),
  );
  const percentFields = createCandidatePercentFields({
    roomType: candidate.roomType,
    localBonusPercent: coreScore.localBonusPercent,
  });
  const sortScore = normalizePercent(candidate.sortScore || 0);
  const stableIdentityPercent = normalizePercent(coreScore.localBonusPercent);
  const quality =
    candidate.quality === "baseOnly" ||
    (coreScore.appliedRules || []).some(
      (rule) => rule.coverage === "baseOnly",
    )
      ? "baseOnly"
      : "complete";
  const calculationStatus =
    candidate.calculationStatus !== "calculated"
      ? candidate.calculationStatus
      : quality === "baseOnly"
      ? "estimated"
      : "calculated";
  const family = {
    roomType: candidate.roomType,
    product: candidate.product,
    stationLevel: profile.stationLevel,
    slotCount: profile.slotCount,
    fallbackCount,
    members: [...members]
      .map((member) => member.name)
      .sort(compareText),
  };
  const identity = {
    ...family,
    members: [...members].sort((left, right) =>
      compareText(left.name, right.name),
    ),
    stableIdentityPercent,
  };

  return {
    id: `candidate-${shortHash(identity)}`,
    variantGroupId: `family-${shortHash(family)}`,
    name: getCandidateName({
      roomType: candidate.roomType,
      product: candidate.product,
      stationLevel: profile.stationLevel,
      operatorIds: coreOperatorIds,
      namesById,
      fallbackCount,
      source: candidate.source,
      templateNameByMemberSet,
    }),
    roomType: candidate.roomType,
    members,
    ...percentFields,
    sortScore,
    ...(quality === "baseOnly" ? { quality } : {}),
    ...(calculationStatus !== "calculated" ? { calculationStatus } : {}),
  };
}

function comparePublicCandidates(left, right) {
  const localPercentField = getPercentField(left.roomType);
  const leftLocalPercent = Number(left[localPercentField] || 0);
  const rightLocalPercent = Number(right[localPercentField] || 0);
  const leftRankingPercent = leftLocalPercent + Number(left.sortScore || 0);
  const rightRankingPercent =
    rightLocalPercent + Number(right.sortScore || 0);
  if (leftRankingPercent !== rightRankingPercent) {
    return rightRankingPercent - leftRankingPercent;
  }
  if ((left.quality || "complete") !== (right.quality || "complete")) {
    return left.quality === "complete" ? -1 : 1;
  }
  if (
    (left.calculationStatus || "calculated") !==
    (right.calculationStatus || "calculated")
  ) {
    return String(left.calculationStatus || "calculated").localeCompare(
      String(right.calculationStatus || "calculated"),
      "en",
    );
  }
  return compareText(left.name, right.name) || compareText(left.id, right.id);
}

function deduplicatePublicCandidates(candidates) {
  const byId = new Map();

  for (const candidate of candidates) {
    const existing = byId.get(candidate.id);
    if (!existing || comparePublicCandidates(candidate, existing) < 0) {
      byId.set(candidate.id, candidate);
    }
  }

  return [...byId.values()].sort(comparePublicCandidates);
}

function hasProductSpecificContribution({ candidate, allIdealSkills, rulesById }) {
  if (candidate.product === "all") {
    return false;
  }
  if (
    candidate.source?.kind === "template" &&
    candidate.source?.templateProduct === candidate.product
  ) {
    return true;
  }

  const score = calculateRiicRoomEfficiency({
    resolvedSkills: allIdealSkills,
    roomType: candidate.roomType,
    product: candidate.product,
    operatorIds: candidate.operatorIds,
    expectedSlots: candidate.operatorIds.length,
  });
  return (score.appliedRules || []).some(
    (rule) => rulesById.get(rule.id)?.effect?.product === candidate.product,
  );
}

function getFallbackCurrentRate(rates, unlock) {
  let current = 0;
  const entries = [
    ...(rates instanceof Map ? rates.values() : rates || []),
  ].sort((left, right) => getUnlockRank(left) - getUnlockRank(right));
  for (const rate of entries) {
    if (getUnlockRank(unlock) >= getUnlockRank(rate)) {
      current = Number(rate.percent || 0);
    }
  }
  return current;
}

function buildFallbackRates({ ruleData, profiles, operatorTable }) {
  const namesById = new Map(
    Object.entries(operatorTable).map(([charId, operator]) => [
      charId,
      String(operator?.name || "").trim(),
    ]),
  );
  const contexts = [
    ...new Map(
      [...profiles.values()].map((profile) => [
        roomProductKey(profile.roomType, profile.product),
        {
          roomType: profile.roomType,
          product: profile.product,
        },
      ]),
    )
      .values(),
  ]
    .filter((context) => context.roomType !== "meeting");
  const ratesByContext = new Map(
    contexts.map((context) => [
      roomProductKey(context.roomType, context.product),
      new Map(),
    ]),
  );

  for (const state of ruleData?.skillStates || []) {
    const charId = String(state?.charId || "").trim();
    const roomType = String(state?.roomType || "").trim();
    const name = namesById.get(charId);
    const unlock = state?.unlock;
    if (!charId || !roomType || !name || !unlock) {
      continue;
    }

    const resolvedSkills = resolveRiicBaselineSkills(
      [
        {
          charId,
          name,
          elite: Number(unlock.phase || 0),
          level: Number(unlock.level || 1),
        },
      ],
      ruleData,
    );
    for (const context of contexts) {
      if (context.roomType !== roomType) {
        continue;
      }

      const score = calculateRiicRoomEfficiency({
        resolvedSkills,
        roomType,
        product: context.product,
        operatorIds: [charId],
        expectedSlots: 1,
      });
      if (!score.valid) {
        continue;
      }

      const contextRates = ratesByContext.get(
        roomProductKey(context.roomType, context.product),
      );
      if (!contextRates.has(name)) {
        contextRates.set(name, new Map());
      }
      const rateKey = `${Number(unlock.phase || 0)}:${Number(
        unlock.level || 1,
      )}`;
      contextRates.get(name).set(rateKey, {
        elite: Number(unlock.phase || 0),
        level: Number(unlock.level || 1),
        percent: normalizePercent(Number(score.totalPercent || 100) - 100),
      });
    }
  }

  return ratesByContext;
}

function toFallbackRateEntries(ratesByUnlock) {
  return [...ratesByUnlock.values()]
    .sort((left, right) => {
      const unlockDifference = getUnlockRank(left) - getUnlockRank(right);
      return unlockDifference || left.percent - right.percent;
    })
    .map((rate) => ({
      ...(rate.elite > 0 ? { elite: rate.elite } : {}),
      ...(rate.level > 1 ? { level: rate.level } : {}),
      percent: rate.percent,
    }));
}

function buildFallbackFile({ profile, ratesByContext }) {
  const ratesByName =
    ratesByContext.get(roomProductKey(profile.roomType, profile.product)) ||
    new Map();
  const genericRatesByName =
    profile.product === "all"
      ? null
      : ratesByContext.get(roomProductKey(profile.roomType, "all")) ||
        new Map();
  const operators = [...ratesByName.entries()]
    .flatMap(([name, ratesByUnlock]) => {
      const genericRates = genericRatesByName?.get(name);
      const rates = genericRates
        ? toFallbackRateEntries(ratesByUnlock).filter(
            (rate) =>
              Number(rate.percent) !==
              getFallbackCurrentRate(genericRates, rate),
          )
        : toFallbackRateEntries(ratesByUnlock);
      return rates.length > 0 ? [{ name, rates }] : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));

  return {
    schemaVersion: 1,
    scope: {
      roomType: profile.roomType,
      product: profile.product,
      stationLevel: profile.stationLevel,
      slotCount: profile.slotCount,
    },
    defaultPercent: 0,
    operators,
  };
}

function getPublicCandidateSignature(candidate) {
  const memberSignature = (candidate?.members || [])
    .map(
      (member) =>
        `${member?.name || ""}:${Number(member?.elite || 0)}:${Number(
          member?.level || 1,
        )}:${member?.maxElite === undefined ? "" : Number(member.maxElite)}`,
    )
    .sort(compareText)
    .join("|");
  const layoutSignature = [
    "powerPlantCount",
    "tradingStationCount",
    "goldManufactureStationCount",
  ]
    .map((field) =>
      Object.hasOwn(candidate || {}, field)
        ? `${field}:${Number(candidate[field])}`
        : `${field}:*`,
    )
    .join("|");

  return `${memberSignature}::${layoutSignature}`;
}

function assertNoParentChildCollisions({ profiles, candidatesByCatalogKey }) {
  for (const profile of profiles.values()) {
    if (profile.product === "all") {
      continue;
    }

    const genericKey = catalogKey(
      profile.roomType,
      "all",
      profile.stationLevel,
      profile.slotCount,
    );
    const genericCandidatesBySignature = new Map(
      (candidatesByCatalogKey.get(genericKey) || []).map((candidate) => [
        getPublicCandidateSignature(candidate),
        candidate,
      ]),
    );
    const duplicate = (candidatesByCatalogKey.get(
      catalogKey(
        profile.roomType,
        profile.product,
        profile.stationLevel,
        profile.slotCount,
      ),
    ) || []).find((candidate) => {
      const genericCandidate = genericCandidatesBySignature.get(
        getPublicCandidateSignature(candidate),
      );
      return (
        genericCandidate &&
        genericCandidate.variantGroupId !== candidate.variantGroupId
      );
    });
    if (duplicate) {
      throw new Error(
        `RIIC generic/product candidate collision at ${profile.roomType}:${profile.product}:L${profile.stationLevel}: ${duplicate.name}`,
      );
    }
  }
}

const [
  baseCatalog,
  ruleData,
  profileData,
  manualCandidateData,
  manualMeetingCandidateData,
  operatorTable,
] = await Promise.all([
  readJson(BASE_CATALOG_PATH),
  readJson(RULE_PATH),
  readJson(PROFILE_PATH),
  readJson(MANUAL_CANDIDATE_PATHS[0]),
  readJson(MANUAL_CANDIDATE_PATHS[1]),
  readJson(OPERATOR_PATH),
]);
const profiles = buildProfiles(profileData);
const rulesById = buildRuleMap(ruleData);
const productSpecificOperatorsByRoom =
  getProductSpecificOperatorsByRoom(rulesById);
const namesById = new Map(
  Object.entries(operatorTable).map(([charId, operator]) => [
    charId,
    operator?.name || charId,
  ]),
);
const nameToCharId = new Map(
  [...namesById.entries()].map(([charId, name]) => [name, charId]),
);
const manualCandidates = [
  ...normalizeManualCandidates({
    manualCandidateData,
    profiles,
    nameToCharId,
  }),
  ...normalizeManualCandidates({
    manualCandidateData: manualMeetingCandidateData,
    profiles,
    nameToCharId,
  }),
];
const manualCandidateIds = new Set();
for (const candidate of manualCandidates) {
  if (manualCandidateIds.has(candidate.id)) {
    throw new Error(`Duplicate manual RIIC candidate id: ${candidate.id}`);
  }
  manualCandidateIds.add(candidate.id);
}
const allIdealOperators = Object.entries(operatorTable).map(
  ([charId, operator]) => ({
    charId,
    name: operator?.name || charId,
    elite: 2,
    level: 90,
  }),
);
const allIdealSkills = resolveRiicBaselineSkills(allIdealOperators, ruleData);
const templateNameByMemberSet = buildTemplateNameMap(baseCatalog);
const collected = await collectRawGroups({
  nameToCharId,
  profiles,
});
const directPercentCache = new Map();
const candidatesByCatalogKey = new Map();

function addCandidate(candidate) {
  const internal = toInternalCandidate(candidate);
  if (!internal || internal.roomType === "meeting") {
    return;
  }

  const productSpecificOperators =
    productSpecificOperatorsByRoom.get(internal.roomType) || new Set();
  if (
    internal.product === "all" &&
    internal.operatorIds.some((charId) => productSpecificOperators.has(charId))
  ) {
    return;
  }

  let outputProduct = hasProductSpecificContribution({
    candidate: internal,
    allIdealSkills,
    rulesById,
  })
    ? internal.product
    : "all";
  let profile = profiles.get(
    catalogKey(
      internal.roomType,
      outputProduct,
      internal.stationLevel,
      internal.slotCount,
    ),
  );
  if (!profile) {
    return;
  }

  let normalized = normalizePublicCandidate({
    candidate: {
      ...internal,
      product: outputProduct,
    },
    profile,
    allIdealSkills,
    rulesById,
    namesById,
    directPercentCache,
    templateNameByMemberSet,
  });
  if (!normalized) {
    return;
  }

  if (outputProduct !== "all") {
    const normalizedOperatorIds = normalized.members
      .map((member) => nameToCharId.get(member.name))
      .filter(Boolean);
    const retainedSpecificContribution =
      normalizedOperatorIds.length > 0 &&
      hasProductSpecificContribution({
        candidate: {
          ...internal,
          product: outputProduct,
          operatorIds: normalizedOperatorIds,
        },
        allIdealSkills,
        rulesById,
      });
    if (!retainedSpecificContribution) {
      outputProduct = "all";
      profile = profiles.get(
        catalogKey(
          internal.roomType,
          outputProduct,
          internal.stationLevel,
          internal.slotCount,
        ),
      );
      if (!profile) {
        return;
      }
      normalized = normalizePublicCandidate({
        candidate: {
          ...internal,
          product: outputProduct,
        },
        profile,
        allIdealSkills,
        rulesById,
        namesById,
        directPercentCache,
        templateNameByMemberSet,
      });
      if (!normalized) {
        return;
      }
    }
  }

  const key = catalogKey(
    profile.roomType,
    profile.product,
    profile.stationLevel,
    profile.slotCount,
  );
  if (!candidatesByCatalogKey.has(key)) {
    candidatesByCatalogKey.set(key, []);
  }
  candidatesByCatalogKey.get(key).push(normalized);
}

function addManualCandidate(candidate) {
  const profile = profiles.get(
    catalogKey(
      candidate.roomType,
      candidate.product,
      candidate.stationLevel,
      candidate.slotCount,
    ),
  );
  if (!profile) {
    throw new Error(`Missing manual RIIC candidate profile: ${candidate.id}`);
  }

  const key = catalogKey(
    profile.roomType,
    profile.product,
    profile.stationLevel,
    profile.slotCount,
  );
  if (!candidatesByCatalogKey.has(key)) {
    candidatesByCatalogKey.set(key, []);
  }
  candidatesByCatalogKey.get(key).push(candidate);
}

for (const candidate of baseCatalog?.candidates || []) {
  addCandidate(candidate);
}

for (const candidate of manualCandidates) {
  addManualCandidate(candidate);
}

let acceptedRawCandidateCount = 0;
for (const group of collected.groups) {
  const profile = profiles.get(
    catalogKey(
      group.roomType,
      group.product,
      group.stationLevel,
      group.operatorIds.length,
    ),
  );
  if (!profile || group.roomType === "meeting") {
    continue;
  }

  const score = calculateRiicRoomEfficiency({
    resolvedSkills: allIdealSkills,
    roomType: group.roomType,
    product: group.product,
    operatorIds: group.operatorIds,
    expectedSlots: group.operatorIds.length,
  });
  const fallbackTotalPercent =
    100 + group.operatorIds.length * profile.fallback.percent;
  if (!score.valid || score.totalPercent <= fallbackTotalPercent) {
    continue;
  }

  addCandidate(
    createRawCandidate({
      ...group,
      score,
    }),
  );
  acceptedRawCandidateCount += 1;
}

await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });

const fallbackRatesByContext = buildFallbackRates({
  ruleData,
  profiles,
  operatorTable,
});
const indexEntries = [];
const sortedProfiles = [...profiles.values()].sort((left, right) =>
  compareText(
    catalogKey(
      left.roomType,
      left.product,
      left.stationLevel,
      left.slotCount,
    ),
    catalogKey(
      right.roomType,
      right.product,
      right.stationLevel,
      right.slotCount,
    ),
  ),
);

for (const profile of sortedProfiles) {
  const key = catalogKey(
    profile.roomType,
    profile.product,
    profile.stationLevel,
    profile.slotCount,
  );
  candidatesByCatalogKey.set(
    key,
    deduplicatePublicCandidates(candidatesByCatalogKey.get(key) || []),
  );
}
assertNoParentChildCollisions({
  profiles,
  candidatesByCatalogKey,
});

for (const profile of sortedProfiles) {
  const key = catalogKey(
    profile.roomType,
    profile.product,
    profile.stationLevel,
    profile.slotCount,
  );
  const candidates = candidatesByCatalogKey.get(key) || [];
  const file = getCatalogFilePath(profile);
  const fallbackFile = getCatalogFilePath(profile, ".fallback");
  const output = {
    schemaVersion: 5,
    scope: {
      roomType: profile.roomType,
      product: profile.product,
      stationLevel: profile.stationLevel,
      slotCount: profile.slotCount,
    },
    fallback: profile.fallback,
    candidates,
  };

  await fs.mkdir(path.dirname(absolute(path.join(OUTPUT_DIR, file))), {
    recursive: true,
  });
  await fs.writeFile(
    absolute(path.join(OUTPUT_DIR, file)),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    absolute(path.join(OUTPUT_DIR, fallbackFile)),
    `${JSON.stringify(
      buildFallbackFile({
        profile,
        ratesByContext: fallbackRatesByContext,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );
  indexEntries.push({
    key,
    file: file.replaceAll(path.sep, "/"),
    fallbackFile: fallbackFile.replaceAll(path.sep, "/"),
    candidateCount: candidates.length,
  });
}

await fs.rm(absolute(LEGACY_FALLBACK_OPERATOR_PATH), { force: true });

const index = {
  schemaVersion: 5,
  files: indexEntries,
};
await fs.writeFile(
  absolute(path.join(OUTPUT_DIR, "index.json")),
  `${JSON.stringify(index, null, 2)}\n`,
  "utf8",
);
await fs.mkdir(PRIVATE_AUDIT_DIR, { recursive: true });
await fs.writeFile(
  path.join(PRIVATE_AUDIT_DIR, "unresolved-operator-names.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      note: "These MAA names could not be mapped to the local operator table and were not added to matchable candidates.",
      names: collected.unknownNames,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Built ${indexEntries.reduce(
    (total, entry) => total + entry.candidateCount,
    0,
  )} public static candidates from ${acceptedRawCandidateCount} raw MAA groups into ${indexEntries.length} level-specific catalogs.`,
);
