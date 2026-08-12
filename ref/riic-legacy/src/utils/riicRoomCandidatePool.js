import { generateRiicRoomGroupCandidates } from "./riicRoomCandidateGenerator.js";
import {
  createRiicGenericStrategy,
  createRiicTemplateStrategy,
  mergeRiicCalculationStatuses,
} from "./riicCandidateStrategy.js";
import { matchRiicRoomTemplates } from "./riicTemplateMatcher.js";

const DEFAULT_TEMPLATE_CANDIDATE_LIMIT = 4;

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function toTemplateSource(templateCandidate) {
  return {
    templateId: templateCandidate.templateId,
    templateName: templateCandidate.templateName,
    candidateTier: templateCandidate.candidateTier,
    lock: templateCandidate.lock,
    mechanics: templateCandidate.mechanics,
    fallbackChain: templateCandidate.fallbackChain,
    upgradeRequirements: templateCandidate.upgradeRequirements,
    estimateStatus: templateCandidate.estimate.status,
    strategy: createRiicTemplateStrategy({
      templateId: templateCandidate.templateId,
      templateName: templateCandidate.templateName,
      candidateTier: templateCandidate.candidateTier,
      estimateStatus: templateCandidate.estimate.status,
    }),
  };
}

function finalizeCandidateStrategy(candidate, profile) {
  const templateStrategies = (candidate.sources?.templates || [])
    .map((template) => template.strategy)
    .filter(Boolean);
  const strategies =
    templateStrategies.length > 0
      ? templateStrategies
      : [
          createRiicGenericStrategy({
            roomType: profile.roomType,
            product: profile.product,
          }),
        ];

  return {
    ...candidate,
    strategySources: strategies,
    calculationStatus: mergeRiicCalculationStatuses(
      (candidate.sources?.templates || []).map(
        (template) => template.estimateStatus,
      ),
    ),
    sources: {
      ...candidate.sources,
      strategies,
    },
  };
}

function mergeCandidates(genericCandidates, templateCandidateSets, profile) {
  const candidatesByKey = new Map();

  for (const candidate of genericCandidates) {
    candidatesByKey.set(candidate.key, {
      ...candidate,
      sources: {
        generic: true,
        templates: [],
      },
      retainForGlobalComparison: false,
    });
  }

  for (const templateCandidateSet of templateCandidateSets) {
    const source = toTemplateSource(templateCandidateSet.template);
    for (const candidate of templateCandidateSet.candidates) {
      const current = candidatesByKey.get(candidate.key);
      if (current) {
        const currentHasRoomTemplate = current.sources.templates.some(
          (template) => template.candidateTier === "room",
        );
        if (source.candidateTier === "room") {
          current.sources.templates = [source];
          current.retainForGlobalComparison = true;
          continue;
        }
        if (currentHasRoomTemplate) {
          continue;
        }
        current.sources.templates.push(source);
        current.retainForGlobalComparison = true;
        continue;
      }

      candidatesByKey.set(candidate.key, {
        ...candidate,
        sources: {
          generic: false,
          templates: [source],
        },
        retainForGlobalComparison: true,
      });
    }
  }

  return [...candidatesByKey.values()].map((candidate) => {
    const normalizedCandidate = {
      ...candidate,
      sources: {
        ...candidate.sources,
        templates: [...candidate.sources.templates].sort((left, right) =>
          left.templateId.localeCompare(right.templateId, "en"),
        ),
      },
    };

    return finalizeCandidateStrategy(normalizedCandidate, profile);
  });
}

function selectTemplateCandidates(candidateSet, template, limit) {
  if (template.candidateTier !== "room") {
    return candidateSet.candidates.slice(0, limit);
  }

  return candidateSet.candidates
    .filter(
      (candidate) =>
        candidate.operatorIds.length === template.operatorIds.length &&
        candidate.fallback.count === 0,
    )
    .slice(0, 1);
}

/**
 * Creates a bounded candidate pool for one room. Hard templates are matched
 * first, then expanded with generic fillers. The caller decides how protected
 * candidates are retained when several stations are combined.
 */
export function generateRiicRoomCandidatePool({
  templateCatalog,
  resolvedSkills,
  currentResolvedSkills = null,
  trainingMode = "current",
  profile,
  expectedSlots,
  calculateRoomEfficiency,
  templateCandidateLimit = DEFAULT_TEMPLATE_CANDIDATE_LIMIT,
}) {
  if (!profile) {
    throw new Error("A room candidate profile is required");
  }

  const genericResult = generateRiicRoomGroupCandidates({
    resolvedSkills,
    profile,
    expectedSlots,
    calculateRoomEfficiency,
  });
  const templateMatches = matchRiicRoomTemplates({
    templateCatalog,
    resolvedSkills,
    currentResolvedSkills,
    roomType: profile.roomType,
    product: profile.product,
    expectedSlots,
    trainingMode,
  });
  const normalizedTemplateCandidateLimit = toPositiveInteger(
    templateCandidateLimit,
    DEFAULT_TEMPLATE_CANDIDATE_LIMIT,
  );
  const templateCandidateSets = templateMatches.candidates
    .map((template) => ({
      template,
      ...generateRiicRoomGroupCandidates({
        resolvedSkills,
        profile,
        expectedSlots,
        calculateRoomEfficiency,
        requiredOperatorIds: template.operatorIds,
        retainRequiredCandidates: true,
      }),
    }))
    .map((candidateSet) => ({
      ...candidateSet,
      candidates: selectTemplateCandidates(
        candidateSet,
        candidateSet.template,
        normalizedTemplateCandidateLimit,
      ),
    }));
  const estimatedTemplates = templateMatches.candidates.filter(
    (template) => template.estimate.status !== "calculated",
  );
  const candidates = mergeCandidates(
    genericResult.candidates,
    templateCandidateSets,
    profile,
  );

  return {
    profileId: profile.id,
    roomType: profile.roomType,
    product: profile.product,
    expectedSlots,
    fallback: genericResult.fallback,
    candidates,
    genericResult,
    templateMatches,
    templateCandidateSets,
    estimatedTemplates,
    summary: {
      genericCandidateCount: genericResult.candidates.length,
      protectedCandidateCount: candidates.filter(
        (candidate) => candidate.retainForGlobalComparison,
      ).length,
      mergedCandidateCount: candidates.length,
      templateCandidateSetCount: templateCandidateSets.length,
      estimatedTemplateCount: estimatedTemplates.length,
      unavailableTemplateCount:
        templateMatches.summary.unavailableTemplateCount,
    },
  };
}
