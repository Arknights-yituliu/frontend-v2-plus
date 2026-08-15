import RIIC_RUNTIME_INDEX from "/src/static/json/tools/riic-candidates/index.json";

const CATALOG_LOADERS = import.meta.glob([
  "/src/static/json/tools/riic-candidates/**/*.json",
  "!/src/static/json/tools/riic-candidates/index.json",
  "!/src/static/json/tools/riic-candidates/R30-rules.json",
  "!/src/static/json/tools/riic-candidates/R50-control.json",
  "!/src/static/json/tools/riic-candidates/R65-roster.json",
  "!/src/static/json/tools/riic-candidates/R71-idle-fill.json",
]);
function normalizeProduct(roomType, product) {
  return roomType === "manufacture" || roomType === "trading"
    ? product
    : "all";
}

function normalizeCatalogStationLevel(roomType, stationLevel) {
  return ["hire", "power"].includes(roomType) ? 1 : stationLevel;
}

function isLayeredProduct(roomType, product) {
  return (
    product !== "all" &&
    (roomType === "manufacture" || roomType === "trading")
  );
}

function getCatalogScopeKey(scope) {
  return [
    scope.roomType,
    scope.product,
    scope.stationLevel,
    scope.slotCount,
  ].join(":");
}

function getIndexedCatalogEntry(scope) {
  return (RIIC_RUNTIME_INDEX?.files || []).find(
    (entry) => String(entry?.key || "") === getCatalogScopeKey(scope),
  );
}

function getCatalogFilePath(file) {
  const relativePath = String(file || "").trim();
  return relativePath
    ? `/src/static/json/tools/riic-candidates/${relativePath}`
    : null;
}

function getCatalogRequest(
  { roomType, product, stationLevel, slotCount },
) {
  const normalizedRoomType = String(roomType || "").trim();
  const normalizedProduct = normalizeProduct(
    normalizedRoomType,
    String(product || "").trim(),
  );
  const normalizedStationLevel = normalizeCatalogStationLevel(
    normalizedRoomType,
    Number(stationLevel),
  );
  const normalizedSlotCount = Number(slotCount);
  if (
    !normalizedRoomType ||
    !normalizedProduct ||
    !Number.isInteger(normalizedStationLevel) ||
    normalizedStationLevel < 1 ||
    !Number.isInteger(normalizedSlotCount) ||
    normalizedSlotCount < 1
  ) {
    return null;
  }

  const genericScope = {
    roomType: normalizedRoomType,
    product: "all",
    stationLevel: normalizedStationLevel,
    slotCount: normalizedSlotCount,
  };
  const productScope = {
    ...genericScope,
    product: normalizedProduct,
  };
  const layered = isLayeredProduct(normalizedRoomType, normalizedProduct);
  const key = `${normalizedRoomType}:${normalizedProduct}:${normalizedStationLevel}:${normalizedSlotCount}`;
  const genericEntry = getIndexedCatalogEntry(genericScope);
  const productEntry = layered
    ? getIndexedCatalogEntry(productScope)
    : null;
  if (
    !genericEntry?.file ||
    !genericEntry?.fallbackFile ||
    (layered && (!productEntry?.file || !productEntry?.fallbackFile))
  ) {
    return null;
  }

  return {
    key,
    scope: productScope,
    genericScope,
    genericFile: getCatalogFilePath(genericEntry.file),
    genericFallbackFile: getCatalogFilePath(genericEntry.fallbackFile),
    productFile: productEntry ? getCatalogFilePath(productEntry.file) : null,
    productFallbackFile: productEntry
      ? getCatalogFilePath(productEntry.fallbackFile)
      : null,
  };
}

function getLv3CompatibilitySourceRequest(request) {
  if (
    Number(request?.scope?.stationLevel) !== 3 ||
    Number(request?.scope?.slotCount) !== 3
  ) {
    return null;
  }

  return getCatalogRequest(
    {
      roomType: request.scope.roomType,
      product: request.scope.product,
      stationLevel: 2,
      slotCount: 2,
    },
  );
}

function getMemberSignature(candidate) {
  const memberSignature = (candidate?.members || [])
    .map(
      (member) =>
        `${member?.name || ""}:${Number(member?.elite || 0)}:${Number(
          member?.level || 1,
        )}:${member?.maxElite === undefined ? "" : Number(member.maxElite)}:${
          (member?.tags || [])
            .map((tag) => String(tag || "").trim())
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right, "en"))
            .join(",")
        }`,
    )
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("|");
  return memberSignature;
}

function getLv3CompatibilitySignature(candidate) {
  const memberSignature = (candidate?.members || [])
    .map((field) =>
      String(field?.name || "").trim(),
    )
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "zh-CN"))
    .join("|");

  return memberSignature;
}

function createLv3CompatibleCandidate(candidate) {
  const sourceId = String(candidate?.id || "").trim();
  if (
    candidate?.lv3CoreFallback === false ||
    !sourceId ||
    !Array.isArray(candidate?.members) ||
    candidate.members.length === 0
  ) {
    return null;
  }

  return {
    ...candidate,
    id: `lv3-compatible:${sourceId}`,
  };
}

function withCandidateSourceFile(candidate, sourceFile) {
  const normalizedSourceFile = String(sourceFile || "").trim();
  return normalizedSourceFile
    ? { ...candidate, sourceFile: normalizedSourceFile }
    : { ...candidate };
}

function getRateSignature(rate) {
  return `${Number(rate?.elite || 0)}:${Number(rate?.level || 1)}:${Number(
    rate?.slotCount || 0,
  )}`;
}

function mergeFallbackOperators(genericFallback, productFallback) {
  const ratesByName = new Map();
  const fillPriorityByName = new Map();

  for (const source of [genericFallback, productFallback].filter(Boolean)) {
    for (const operator of source?.operators || []) {
      const name = String(operator?.name || "").trim();
      if (!name) {
        continue;
      }
      const rates = ratesByName.get(name) || new Map();
      for (const rate of operator?.rates || []) {
        const percent = Number(rate?.percent);
        if (!Number.isFinite(percent)) {
          continue;
        }
        rates.set(getRateSignature(rate), {
          ...(Number(rate?.elite || 0) > 0
            ? { elite: Number(rate.elite) }
            : {}),
          ...(Number(rate?.level || 1) > 1
            ? { level: Number(rate.level) }
            : {}),
          ...(Number(rate?.slotCount || 0) > 0
            ? { slotCount: Number(rate.slotCount) }
            : {}),
          percent,
          ...(rate?.skipR30 === true ? { skipR30: true } : {}),
          ...(Array.isArray(rate?.tags) && rate.tags.length > 0
            ? {
                tags: [
                  ...new Set(
                    rate.tags
                      .map((tag) => String(tag || "").trim())
                      .filter(Boolean),
                  ),
                ],
              }
            : {}),
        });
      }
      ratesByName.set(name, rates);

      if (Object.hasOwn(operator || {}, "fillPriority")) {
        const fillPriority = Number(operator.fillPriority);
        if (Number.isFinite(fillPriority)) {
          fillPriorityByName.set(name, fillPriority);
        }
      }
    }
  }

  return [...ratesByName.entries()]
    .map(([name, rates]) => ({
      name,
      ...(fillPriorityByName.has(name)
        ? { fillPriority: fillPriorityByName.get(name) }
        : {}),
      rates: [...rates.values()].sort(
        (left, right) =>
          Number(left.elite || 0) - Number(right.elite || 0) ||
          Number(left.level || 1) - Number(right.level || 1),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

function buildImplicitMeetingFallbackOperators(candidates, fallbackOperators) {
  if (fallbackOperators.length > 0) {
    return fallbackOperators;
  }

  const ratesByName = new Map();
  for (const candidate of candidates || []) {
    const member =
      candidate?.selectionMode === "individual" &&
      Array.isArray(candidate?.members) &&
      candidate.members.length === 1
        ? candidate.members[0]
        : null;
    const name = String(member?.name || "").trim();
    const percent = Number(candidate?.efficiency);
    if (!name || !Number.isFinite(percent) || percent <= 0) {
      continue;
    }

    const rate = {
      ...(Number(member?.elite || 0) > 0
        ? { elite: Number(member.elite) }
        : {}),
      ...(Number(member?.level || 1) > 1
        ? { level: Number(member.level) }
        : {}),
      percent,
    };
    const rates = ratesByName.get(name) || new Map();
    const signature = getRateSignature(rate);
    const current = rates.get(signature);
    if (!current || percent > current.percent) {
      rates.set(signature, rate);
    }
    ratesByName.set(name, rates);
  }

  return [...ratesByName.entries()]
    .map(([name, rates]) => ({
      name,
      rates: [...rates.values()].sort(
        (left, right) =>
          Number(left.elite || 0) - Number(right.elite || 0) ||
          Number(left.level || 1) - Number(right.level || 1),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

async function loadJson(filePath) {
  const loader = CATALOG_LOADERS[filePath];
  if (!loader) {
    throw new Error(`Missing RIIC catalog file: ${filePath}`);
  }
  const module = await loader();
  return module.default || module;
}

export function getRiicStaticRoomCandidateCatalogKey({
  roomType,
  product,
  stationLevel,
  slotCount,
}) {
  return (
    getCatalogRequest({
      roomType,
      product,
      stationLevel,
      slotCount,
    })?.key || null
  );
}

export async function loadRiicStaticRoomCandidateCatalog({
  roomType,
  product,
  stationLevel,
  slotCount,
}) {
  const request = getCatalogRequest(
    {
      roomType,
      product,
      stationLevel,
      slotCount,
    },
  );
  if (!request) {
    return null;
  }
  const lv3CompatibilitySourceRequest =
    getLv3CompatibilitySourceRequest(request);

  const [
    genericCatalog,
    genericFallback,
    productCatalog,
    productFallback,
    compatibleGenericCatalog,
    compatibleProductCatalog,
  ] = await Promise.all([
      loadJson(request.genericFile),
      loadJson(request.genericFallbackFile),
      request.productFile ? loadJson(request.productFile) : null,
      request.productFallbackFile ? loadJson(request.productFallbackFile) : null,
      lv3CompatibilitySourceRequest?.genericFile
        ? loadJson(lv3CompatibilitySourceRequest.genericFile)
        : null,
      lv3CompatibilitySourceRequest?.productFile
        ? loadJson(lv3CompatibilitySourceRequest.productFile)
        : null,
    ]);
  const candidatesBySignature = new Map();
  const explicitLv3CandidateSignatures = new Set(
    [...(genericCatalog.candidates || []), ...(productCatalog?.candidates || [])]
      .filter((candidate) => (candidate?.members || []).length < 3)
      .map(getLv3CompatibilitySignature),
  );
  for (const [sourceCandidates, sourceFile] of [
    [
      compatibleGenericCatalog?.candidates || [],
      lv3CompatibilitySourceRequest?.genericFile,
    ],
    [
      compatibleProductCatalog?.candidates || [],
      lv3CompatibilitySourceRequest?.productFile,
    ],
  ]) {
    for (const sourceCandidate of sourceCandidates) {
      const candidate = createLv3CompatibleCandidate(
        withCandidateSourceFile(sourceCandidate, sourceFile),
      );
      if (
        candidate &&
        !explicitLv3CandidateSignatures.has(
          getLv3CompatibilitySignature(candidate),
        )
      ) {
        candidatesBySignature.set(getMemberSignature(candidate), candidate);
      }
    }
  }
  for (const candidate of genericCatalog.candidates || []) {
    const candidateWithSource = withCandidateSourceFile(
      candidate,
      request.genericFile,
    );
    candidatesBySignature.set(
      getMemberSignature(candidateWithSource),
      candidateWithSource,
    );
  }
  for (const candidate of productCatalog?.candidates || []) {
    const candidateWithSource = withCandidateSourceFile(
      candidate,
      request.productFile,
    );
    const signature = getMemberSignature(candidateWithSource);
    candidatesBySignature.set(signature, candidateWithSource);
  }
  const fallbackSource = productFallback || genericFallback;
  const fallbackSourceFile = productFallback
    ? request.productFallbackFile
    : request.genericFallbackFile;
  const fallback = {
    percent: Number(
      fallbackSource?.defaultPercent ??
        productCatalog?.fallback?.percent ??
        genericCatalog?.fallback?.percent ??
        0,
    ),
    label:
      productCatalog?.fallback?.label ||
      genericCatalog?.fallback?.label ||
      "基础补位",
    sourceFile: fallbackSourceFile,
  };
  const fallbackPoolKey = `${request.key}:fallback`;
  const candidates = [...candidatesBySignature.values()];
  const publishedFallbackOperators = mergeFallbackOperators(
    genericFallback,
    productFallback,
  );
  const fallbackOperators =
    request.scope.roomType === "meeting"
      ? buildImplicitMeetingFallbackOperators(
          candidates,
          publishedFallbackOperators,
        )
      : publishedFallbackOperators;

  return {
    key: request.key,
    catalog: {
      schemaVersion: Number(
        productCatalog?.schemaVersion ?? genericCatalog?.schemaVersion,
      ),
      scope: request.scope,
      fallback: {
        ...fallback,
        poolKey: fallbackPoolKey,
      },
      candidates: [...candidatesBySignature.values()],
    },
    fallbackCatalog: {
      schemaVersion: 1,
      pools: [
        {
          key: fallbackPoolKey,
          defaultPercent: Number(
            productFallback?.defaultPercent ??
              genericFallback?.defaultPercent ??
              0,
          ),
          operators: fallbackOperators,
        },
      ],
    },
  };
}
