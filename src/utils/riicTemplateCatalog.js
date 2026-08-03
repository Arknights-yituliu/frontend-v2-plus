const ROOM_TYPE_BY_LABEL = Object.freeze({
  "制造站": "manufacture",
  "贸易站": "trading",
  "发电站": "power",
  "控制中枢": "control",
  "会客室": "meeting",
  "办公室": "hire",
});

const PRODUCT_BY_LABEL = Object.freeze({
  "经验书": "experience",
  "赤金": "gold",
  "合成玉": "orundum",
});

const LOCK_BY_LABEL = Object.freeze({
  "核心": "atomicCore",
  "整组": "atomicRoom",
});

const CALCULATION_BY_LABEL = Object.freeze({
  "人工验证": "manualVerified",
});

function normalizeText(value) {
  return String(value || "").trim();
}

function createNameToCharIdMap(operatorTable) {
  const nameToCharId = new Map();

  for (const [charId, operator] of Object.entries(operatorTable || {})) {
    const name = normalizeText(operator?.name);
    if (!name || nameToCharId.has(name)) {
      continue;
    }
    nameToCharId.set(name, charId);
  }

  return nameToCharId;
}

function resolveOperatorNames({
  names,
  nameToCharId,
  templateId,
  fieldName,
  required,
}) {
  if (!Array.isArray(names)) {
    if (required) {
      throw new Error(`${templateId}: ${fieldName} must be an array`);
    }
    return [];
  }

  const normalizedNames = names.map(normalizeText).filter(Boolean);
  if (required && normalizedNames.length === 0) {
    throw new Error(`${templateId}: ${fieldName} must not be empty`);
  }
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new Error(`${templateId}: ${fieldName} contains duplicate names`);
  }

  return normalizedNames.map((name) => {
    const charId = nameToCharId.get(name);
    if (!charId) {
      throw new Error(`${templateId}: unknown operator ${name}`);
    }
    return { charId, name };
  });
}

function normalizeEstimateRange(value, templateId, calculationCoverage) {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    calculationCoverage !== "manualVerified" ||
    !Array.isArray(value) ||
    value.length !== 2
  ) {
    throw new Error(`${templateId}: invalid estimateRange`);
  }

  const range = value.map(Number);
  if (
    range.some((item) => !Number.isFinite(item) || item < 0) ||
    range[0] > range[1]
  ) {
    throw new Error(`${templateId}: invalid estimateRange`);
  }
  return range;
}

function assertFallbackGraphIsAcyclic(templatesById) {
  const visitStates = new Map();
  const visit = (templateId) => {
    const state = visitStates.get(templateId);
    if (state === "visiting") {
      throw new Error(`fallback cycle at ${templateId}`);
    }
    if (state === "visited") {
      return;
    }

    visitStates.set(templateId, "visiting");
    const fallbackId = templatesById.get(templateId)?.fallbackId;
    if (fallbackId) {
      visit(fallbackId);
    }
    visitStates.set(templateId, "visited");
  };

  for (const templateId of templatesById.keys()) {
    visit(templateId);
  }
}

/**
 * Converts the compact, human-maintained catalog into stable ids and runtime
 * metadata. This does not match templates against a user's roster yet.
 */
export function normalizeRiicTemplateCatalog({
  catalogData,
  operatorTable,
}) {
  if (Number(catalogData?.schemaVersion) !== 1) {
    throw new Error("Unsupported RIIC template catalog version");
  }
  if (!Array.isArray(catalogData?.templates)) {
    throw new Error("RIIC template catalog must contain templates");
  }

  const nameToCharId = createNameToCharIdMap(operatorTable);
  const templates = [];
  const templateIds = new Set();

  for (const rawTemplate of catalogData.templates) {
    const id = normalizeText(rawTemplate?.id);
    const name = normalizeText(rawTemplate?.name);
    const roomLabel = normalizeText(rawTemplate?.room);
    const lockLabel = normalizeText(rawTemplate?.lock);
    const roomType = ROOM_TYPE_BY_LABEL[roomLabel];
    const lock = LOCK_BY_LABEL[lockLabel];
    const sortScore = Number(rawTemplate?.sortScore || 0);

    if (
      !id ||
      !name ||
      !roomType ||
      !lock ||
      !Number.isFinite(sortScore)
    ) {
      throw new Error(`Invalid RIIC template ${id || "<unknown>"}`);
    }
    if (templateIds.has(id)) {
      throw new Error(`Duplicate RIIC template id ${id}`);
    }
    templateIds.add(id);

    const productLabel = normalizeText(rawTemplate?.product);
    const product = productLabel ? PRODUCT_BY_LABEL[productLabel] : "all";
    if (!product) {
      throw new Error(`${id}: unsupported product ${productLabel}`);
    }

    const calculationLabel = normalizeText(rawTemplate?.calculation);
    const calculationCoverage =
      CALCULATION_BY_LABEL[calculationLabel] || "complete";
    if (
      calculationLabel &&
      calculationCoverage !== "manualVerified"
    ) {
      throw new Error(`${id}: unsupported calculation ${calculationLabel}`);
    }

    const members = resolveOperatorNames({
      names: rawTemplate.members,
      nameToCharId,
      templateId: id,
      fieldName: "members",
      required: true,
    });
    const oneOf = resolveOperatorNames({
      names: rawTemplate.oneOf,
      nameToCharId,
      templateId: id,
      fieldName: "oneOf",
      required: false,
    });
    const memberIds = new Set(members.map((member) => member.charId));
    if (oneOf.some((member) => memberIds.has(member.charId))) {
      throw new Error(`${id}: oneOf overlaps members`);
    }

    const fallbackId = normalizeText(rawTemplate?.fallback) || null;
    if (fallbackId === id) {
      throw new Error(`${id}: fallback cannot reference itself`);
    }

    templates.push({
      id,
      name,
      roomType,
      product,
      members,
      oneOf,
      lock,
      sortScore,
      candidateTier: lock === "atomicRoom" ? "room" : "core",
      calculationCoverage,
      estimateRange: normalizeEstimateRange(
        rawTemplate?.estimateRange,
        id,
        calculationCoverage,
      ),
      fallbackId,
    });
  }

  const templatesById = new Map(
    templates.map((template) => [template.id, template]),
  );
  for (const template of templates) {
    if (template.fallbackId && !templatesById.has(template.fallbackId)) {
      throw new Error(
        `${template.id}: unknown fallback ${template.fallbackId}`,
      );
    }
  }
  assertFallbackGraphIsAcyclic(templatesById);

  return {
    schemaVersion: 1,
    templates,
    templatesById,
    summary: {
      templateCount: templates.length,
      roomTemplateCount: templates.filter(
        (template) => template.candidateTier === "room",
      ).length,
      manualVerifiedTemplateCount: templates.filter(
        (template) => template.calculationCoverage === "manualVerified",
      ).length,
    },
  };
}
