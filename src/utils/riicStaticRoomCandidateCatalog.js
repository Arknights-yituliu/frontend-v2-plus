const CATALOG_LOADERS = import.meta.glob(
  "/src/static/json/tools/riic-candidates/**/*.json",
);

function normalizeProduct(roomType, product) {
  return roomType === "manufacture" || roomType === "trading"
    ? product
    : "all";
}

function isLayeredProduct(roomType, product) {
  return (
    product !== "all" &&
    (roomType === "manufacture" || roomType === "trading")
  );
}

function getCatalogFilePath({ roomType, product, stationLevel }, suffix = "") {
  const directory = product === "all" ? roomType : `${roomType}/${product}`;
  return `/src/static/json/tools/riic-candidates/${directory}/${stationLevel}${suffix}.json`;
}

function getCatalogRequest({ roomType, product, stationLevel, slotCount }) {
  const normalizedRoomType = String(roomType || "").trim();
  const normalizedProduct = normalizeProduct(
    normalizedRoomType,
    String(product || "").trim(),
  );
  const normalizedStationLevel = Number(stationLevel);
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
  const genericFile = getCatalogFilePath(genericScope);
  const genericFallbackFile = getCatalogFilePath(genericScope, ".fallback");
  const layered = isLayeredProduct(normalizedRoomType, normalizedProduct);
  const productFile = layered ? getCatalogFilePath(productScope) : null;
  const productFallbackFile = layered
    ? getCatalogFilePath(productScope, ".fallback")
    : null;

  return {
    key: `${normalizedRoomType}:${normalizedProduct}:${normalizedStationLevel}:${normalizedSlotCount}`,
    scope: productScope,
    genericScope,
    genericFile,
    genericFallbackFile,
    productFile,
    productFallbackFile,
  };
}

function getMemberSignature(candidate) {
  const memberSignature = (candidate?.members || [])
    .map(
      (member) =>
        `${member?.name || ""}:${Number(member?.elite || 0)}:${Number(
          member?.level || 1,
        )}:${member?.maxElite === undefined ? "" : Number(member.maxElite)}`,
    )
    .sort((left, right) => left.localeCompare(right, "en"))
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

function getRateSignature(rate) {
  return `${Number(rate?.elite || 0)}:${Number(rate?.level || 1)}`;
}

function mergeFallbackOperators(genericFallback, productFallback) {
  const ratesByName = new Map();

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
          percent,
        });
      }
      ratesByName.set(name, rates);
    }
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

function assertScope(catalog, expectedScope, filePath) {
  const scope = catalog?.scope || {};
  if (
    Number(catalog?.schemaVersion) !== 5 ||
    scope.roomType !== expectedScope.roomType ||
    scope.product !== expectedScope.product ||
    Number(scope.stationLevel) !== Number(expectedScope.stationLevel) ||
    Number(scope.slotCount) !== Number(expectedScope.slotCount)
  ) {
    throw new Error(`Invalid RIIC catalog scope: ${filePath}`);
  }
}

function assertFallbackScope(fallback, expectedScope, filePath) {
  const scope = fallback?.scope || {};
  if (
    Number(fallback?.schemaVersion) !== 1 ||
    scope.roomType !== expectedScope.roomType ||
    scope.product !== expectedScope.product ||
    Number(scope.stationLevel) !== Number(expectedScope.stationLevel) ||
    Number(scope.slotCount) !== Number(expectedScope.slotCount)
  ) {
    throw new Error(`Invalid RIIC fallback scope: ${filePath}`);
  }
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
  const request = getCatalogRequest({
    roomType,
    product,
    stationLevel,
    slotCount,
  });
  if (!request) {
    return null;
  }

  const [genericCatalog, genericFallback, productCatalog, productFallback] =
    await Promise.all([
      loadJson(request.genericFile),
      loadJson(request.genericFallbackFile),
      request.productFile ? loadJson(request.productFile) : null,
      request.productFallbackFile ? loadJson(request.productFallbackFile) : null,
    ]);
  assertScope(genericCatalog, request.genericScope, request.genericFile);
  assertFallbackScope(
    genericFallback,
    request.genericScope,
    request.genericFallbackFile,
  );
  if (productCatalog) {
    assertScope(productCatalog, request.scope, request.productFile);
  }
  if (productFallback) {
    assertFallbackScope(
      productFallback,
      request.scope,
      request.productFallbackFile,
    );
  }

  const candidatesBySignature = new Map(
    (genericCatalog.candidates || []).map((candidate) => [
      getMemberSignature(candidate),
      candidate,
    ]),
  );
  const collisions = [];
  for (const candidate of productCatalog?.candidates || []) {
    const signature = getMemberSignature(candidate);
    const genericCandidate = candidatesBySignature.get(signature);
    if (
      genericCandidate &&
      genericCandidate.variantGroupId !== candidate.variantGroupId
    ) {
      collisions.push(candidate.name || signature);
    }
    candidatesBySignature.set(signature, candidate);
  }
  if (collisions.length > 0 && import.meta.env.DEV) {
    console.error(
      `RIIC generic/product candidate collision at ${request.key}: ${collisions.join(", ")}`,
    );
  }

  const fallback = productCatalog?.fallback || genericCatalog.fallback;
  const fallbackPoolKey = `${request.key}:fallback`;
  return {
    key: request.key,
    diagnostics: {
      collisions,
    },
    catalog: {
      schemaVersion: 5,
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
          operators: mergeFallbackOperators(genericFallback, productFallback),
        },
      ],
    },
  };
}
