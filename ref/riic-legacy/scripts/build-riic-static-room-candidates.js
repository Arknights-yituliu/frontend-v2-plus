import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateRiicRoomEfficiency,
  resolveRiicBaselineSkills,
} from "../src/utils/riicBaselineSkillResolver.js";
import { normalizeRiicTemplateCatalog } from "../src/utils/riicTemplateCatalog.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUTS = {
  rules: "src/static/json/tools/riic_baseline_skill_rules.json",
  profiles: "src/static/json/tools/riic_room_candidate_profiles.json",
  templates: "src/static/json/tools/riic_template_catalog.json",
  operators: "src/static/json/operator/character_table_simple.v2.json",
};
const OUTPUT_PATH = "src/static/json/tools/riic_room_group_candidates.json";

function toAbsolutePath(relativePath) {
  return path.join(ROOT, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(toAbsolutePath(relativePath), "utf8"));
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), "en");
}

function isProductCompatible(candidateProduct, requestedProduct) {
  return (
    candidateProduct === "all" ||
    requestedProduct === "all" ||
    candidateProduct === requestedProduct
  );
}

function getUnlockRank(unlock) {
  return Number(unlock?.phase || 0) * 1000 + Number(unlock?.level || 0);
}

function getHigherUnlock(left, right) {
  return getUnlockRank(left) >= getUnlockRank(right) ? left : right;
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

function buildProfiles(profileData) {
  const seen = new Set();
  const profiles = [];

  for (const profile of profileData?.profiles || []) {
    const roomType = String(profile?.roomType || "").trim();
    const product = String(profile?.product || "").trim();
    const fallbackPercent = Number(profile?.fallback?.percent || 0);

    for (const station of getProfileStations(profile)) {
      const { stationLevel, slotCount } = station;
      if (
        !roomType ||
        !product ||
        !Number.isFinite(fallbackPercent)
      ) {
        continue;
      }

      const key = `${roomType}:${product}:${stationLevel}:${slotCount}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      profiles.push({
        key,
        roomType,
        product,
        stationLevel,
        slotCount,
        fallback: {
          count: slotCount,
          percent: fallbackPercent,
          label: String(profile?.fallback?.label || "基础补位").trim() ||
            "基础补位",
        },
      });
    }
  }

  return profiles.sort((left, right) => compareText(left.key, right.key));
}

function getRuleMaps(ruleData) {
  const rulesById = new Map();
  const statesByCharId = new Map();

  for (const rule of [
    ...(ruleData?.rules || []),
    ...(ruleData?.sameRoomRules || []),
  ]) {
    if (rule?.id) {
      rulesById.set(rule.id, rule);
    }
  }

  for (const state of ruleData?.skillStates || []) {
    const charId = String(state?.charId || "").trim();
    const roomType = String(state?.roomType || "").trim();
    if (!charId || !roomType || !state?.unlock) {
      continue;
    }

    const key = `${roomType}:${state.unlock.phase || 0}:${state.unlock.level || 1}`;
    if (!statesByCharId.has(charId)) {
      statesByCharId.set(charId, new Map());
    }
    statesByCharId.get(charId).set(key, {
      charId,
      roomType,
      unlock: {
        phase: Number(state.unlock.phase || 0),
        level: Number(state.unlock.level || 1),
      },
    });
  }

  return {
    rulesById,
    statesByCharId,
  };
}

function getCandidateRequirements({ operatorIds, namesById, appliedRules, rulesById }) {
  const unlockByCharId = new Map();

  for (const rule of appliedRules || []) {
    const charId = String(rule?.ownerCharId || "").trim();
    const sourceRule = rulesById.get(rule?.id);
    if (!charId || !sourceRule?.unlock) {
      continue;
    }

    const current = unlockByCharId.get(charId);
    unlockByCharId.set(
      charId,
      current
        ? getHigherUnlock(current, sourceRule.unlock)
        : {
            phase: Number(sourceRule.unlock.phase || 0),
            level: Number(sourceRule.unlock.level || 1),
          },
    );
  }

  return [...new Set(operatorIds || [])]
    .map((charId) => {
      const unlock = unlockByCharId.get(charId) || { phase: 0, level: 1 };
      return {
        charId,
        name: namesById.get(charId) || charId,
        elite: unlock.phase,
        level: unlock.level,
      };
    })
    .sort((left, right) => compareText(left.charId, right.charId));
}

function createStaticCandidate({
  id,
  variantGroupId,
  profile,
  members,
  score,
  requirements,
  source,
  sortScore = 0,
  calculationStatus = "calculated",
}) {
  return {
    id,
    variantGroupId,
    roomType: profile.roomType,
    product: profile.product,
    stationLevel: profile.stationLevel,
    slotCount: profile.slotCount,
    members,
    requirements,
    sortScore,
    fallback: {
      count: profile.slotCount - members.length,
      percent: profile.fallback.percent,
      label: profile.fallback.label,
    },
    efficiency: {
      totalPercent: Number(score.totalPercent),
      bonusPercent: Number(score.bonusPercent),
      localTotalPercent: Number(score.localTotalPercent),
      localBonusPercent: Number(score.localBonusPercent),
      downstreamBonusPercentByRoom: score.downstreamBonusPercentByRoom || {},
    },
    quality: (score.appliedRules || []).some(
      (rule) => rule.coverage === "baseOnly",
    )
      ? "baseOnly"
      : "complete",
    calculationStatus,
    appliedRuleIds: (score.appliedRules || [])
      .map((rule) => rule.id)
      .filter((ruleId) => ruleId && ruleId !== "fallback")
      .sort(compareText),
    source,
  };
}

function buildBaselineCandidates({
  ruleData,
  profiles,
  operatorTable,
  rulesById,
  statesByCharId,
}) {
  const namesById = new Map(
    Object.entries(operatorTable).map(([charId, operator]) => [
      charId,
      operator?.name || charId,
    ]),
  );
  const candidates = [];

  for (const [charId, states] of statesByCharId.entries()) {
    const name = namesById.get(charId);
    if (!name) {
      continue;
    }

    for (const state of states.values()) {
      const resolvedSkills = resolveRiicBaselineSkills(
        [
          {
            charId,
            name,
            elite: state.unlock.phase,
            level: state.unlock.level,
          },
        ],
        ruleData,
      );
      const roomCandidate = (resolvedSkills.candidatesByRoom[state.roomType] || [])
        .find((candidate) => candidate.charId === charId);
      if (!roomCandidate?.effects?.length) {
        continue;
      }

      for (const profile of profiles) {
        if (profile.roomType !== state.roomType) {
          continue;
        }
        if (
          !roomCandidate.effects.some((rule) =>
            isProductCompatible(rule.effect?.product, profile.product),
          )
        ) {
          continue;
        }

        const score = calculateRiicRoomEfficiency({
          resolvedSkills,
          roomType: profile.roomType,
          product: profile.product,
          operatorIds: [charId],
          expectedSlots: profile.slotCount,
          fallbackSlotCount: profile.slotCount - 1,
          fallbackPercent: profile.fallback.percent,
        });
        const fallbackTotalPercent =
          100 + profile.slotCount * profile.fallback.percent;
        if (!score.valid || score.totalPercent <= fallbackTotalPercent) {
          continue;
        }

        const requirements = getCandidateRequirements({
          operatorIds: [charId],
          namesById,
          appliedRules: score.appliedRules,
          rulesById,
        });
        const suffix = `${state.unlock.phase}-${state.unlock.level}`;
        candidates.push(
          createStaticCandidate({
            id: `baseline:${profile.key}:${charId}:${suffix}`,
            variantGroupId: `baseline:${profile.key}:${charId}`,
            profile,
            members: [{ charId, name }],
            score,
            requirements,
            calculationStatus:
              score.appliedRules.some(
                (rule) => rule.coverage === "baseOnly",
              )
                ? "estimated"
                : "calculated",
            source: {
              kind: "baselineRule",
              ruleIds: score.appliedRules
                .map((rule) => rule.id)
                .filter((ruleId) => ruleId && ruleId !== "fallback")
                .sort(compareText),
            },
          }),
        );
      }
    }
  }

  return candidates;
}

function getTemplateVariants(template) {
  return template.oneOf?.length
    ? template.oneOf.map((member) => ({
        members: [...template.members, member],
        suffix: member.charId,
      }))
    : [{ members: template.members, suffix: "default" }];
}

function buildTemplateCandidates({
  ruleData,
  profiles,
  templateCatalog,
  rulesById,
  operatorTable,
}) {
  const namesById = new Map(
    Object.entries(operatorTable).map(([charId, operator]) => [
      charId,
      operator?.name || charId,
    ]),
  );
  const candidates = [];

  for (const template of templateCatalog.templates) {
    for (const variant of getTemplateVariants(template)) {
      const members = variant.members.map((member) => ({
        charId: member.charId,
        name: member.name,
      }));
      const resolvedSkills = resolveRiicBaselineSkills(
        members.map((member) => ({
          ...member,
          elite: 2,
          level: 90,
        })),
        ruleData,
      );

      for (const profile of profiles) {
        if (
          profile.roomType !== template.roomType ||
          !isProductCompatible(template.product, profile.product) ||
          members.length > profile.slotCount
        ) {
          continue;
        }

        const score = calculateRiicRoomEfficiency({
          resolvedSkills,
          roomType: profile.roomType,
          product: profile.product,
          operatorIds: members.map((member) => member.charId),
          expectedSlots: profile.slotCount,
          fallbackSlotCount: profile.slotCount - members.length,
          fallbackPercent: profile.fallback.percent,
        });
        const fallbackTotalPercent =
          100 + profile.slotCount * profile.fallback.percent;
        if (!score.valid || score.totalPercent <= fallbackTotalPercent) {
          continue;
        }

        candidates.push(
          createStaticCandidate({
            id: `template:${template.id}:${profile.key}:${variant.suffix}`,
            variantGroupId: `template:${template.id}:${profile.key}`,
            profile,
            members,
            score,
            requirements: getCandidateRequirements({
              operatorIds: members.map((member) => member.charId),
              namesById,
              appliedRules: score.appliedRules,
              rulesById,
            }),
            sortScore: template.sortScore,
            calculationStatus:
              template.calculationCoverage === "manualVerified"
                ? "estimated"
                : "calculated",
            source: {
              kind: "template",
              templateId: template.id,
              templateName: template.name,
              templateProduct: template.product,
              lock: template.lock,
              calculationCoverage: template.calculationCoverage,
            },
          }),
        );
      }
    }
  }

  return candidates;
}

function deduplicateCandidates(candidates) {
  const candidatesById = new Map();

  for (const candidate of candidates) {
    if (!candidatesById.has(candidate.id)) {
      candidatesById.set(candidate.id, candidate);
    }
  }

  return [...candidatesById.values()].sort((left, right) => {
    if (left.roomType !== right.roomType) {
      return compareText(left.roomType, right.roomType);
    }
    if (left.product !== right.product) {
      return compareText(left.product, right.product);
    }
    if (left.slotCount !== right.slotCount) {
      return left.slotCount - right.slotCount;
    }
    if (left.stationLevel !== right.stationLevel) {
      return left.stationLevel - right.stationLevel;
    }
    if (left.efficiency.totalPercent !== right.efficiency.totalPercent) {
      return right.efficiency.totalPercent - left.efficiency.totalPercent;
    }
    return compareText(left.id, right.id);
  });
}

function buildFallbacks(profiles) {
  return profiles.map((profile) => ({
    id: `fallback:${profile.key}`,
    roomType: profile.roomType,
    product: profile.product,
    stationLevel: profile.stationLevel,
    slotCount: profile.slotCount,
    members: [],
    requirements: [],
    fallback: profile.fallback,
    efficiency: {
      totalPercent: 100 + profile.slotCount * profile.fallback.percent,
      bonusPercent: profile.slotCount * profile.fallback.percent,
      localTotalPercent: 100 + profile.slotCount * profile.fallback.percent,
      localBonusPercent: profile.slotCount * profile.fallback.percent,
      downstreamBonusPercentByRoom: {},
    },
    quality: "complete",
    calculationStatus: "calculated",
    appliedRuleIds: [],
    source: {
      kind: "fallbackPreset",
    },
  }));
}

const [ruleData, profileData, templateData, operatorTable] = await Promise.all(
  Object.values(INPUTS).map(readJson),
);
const profiles = buildProfiles(profileData);
const { rulesById, statesByCharId } = getRuleMaps(ruleData);
const templateCatalog = normalizeRiicTemplateCatalog({
  catalogData: templateData,
  operatorTable,
});
const candidates = deduplicateCandidates([
  ...buildBaselineCandidates({
    ruleData,
    profiles,
    operatorTable,
    rulesById,
    statesByCharId,
  }),
  ...buildTemplateCandidates({
    ruleData,
    profiles,
    templateCatalog,
    rulesById,
    operatorTable,
  }),
]);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  generation: {
    command: "node scripts/build-riic-static-room-candidates.js",
    sources: [
      INPUTS.rules,
      INPUTS.profiles,
      INPUTS.templates,
    ],
    note: "This file is a precomputed candidate catalog. The web page only matches it and never enumerates room-team combinations.",
  },
  fallbacks: buildFallbacks(profiles),
  candidates,
};

await fs.writeFile(
  toAbsolutePath(OUTPUT_PATH),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(
  `Built ${candidates.length} RIIC static candidates and ${output.fallbacks.length} fallback presets.`,
);
