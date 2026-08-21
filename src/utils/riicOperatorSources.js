import { reactive, ref, nextTick } from "vue";
import operatorDataAPI from "/src/api/operatorData.js";
import { cMessage } from "/src/utils/message.js";
import { operatorTableV2 } from "/src/utils/gameData.js";
import { parseRiicMaaOperatorBox } from "/src/utils/riicMaaOperatorData.js";
import {
  RIIC_MANUAL_OPERATOR_SOURCE_KEY,
  RIIC_MANUAL_OPERATOR_STORAGE_KEY,
  readRiicManualOperatorSnapshot,
} from "/src/utils/riicManualOperatorData.js";

const SKLAND_ACCOUNT_SESSION_STORAGE_KEY = "skland_account_data";
const RIIC_SKLAND_OPERATOR_SNAPSHOT_STORAGE_KEY =
  "riic_skland_operator_snapshot_v1";
const RIIC_MAA_OPERATOR_STORAGE_KEY = "riic_maa_operator_data_v1";
const RIIC_OPERATOR_SOURCE_STORAGE_KEY = "riic_operator_source_v1";
const RIIC_OPERATOR_SOURCES_STORAGE_KEY = "riic_operator_sources_v2";
const RIIC_YITULIU_OPERATOR_API_URL =
  "https://backend.yituliu.cn/open-api/operator/info";
const ENABLE_MANUAL_OPERATOR_SOURCE = import.meta.env.DEV;
export const RIIC_MAX_CUSTOM_OPERATOR_SOURCES = 3;
export const OPERATOR_SOURCE_KEYS = Object.freeze({
  skland: "skland",
  manual: RIIC_MANUAL_OPERATOR_SOURCE_KEY,
});

function formatOperatorSyncTime(value) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(date);
}

function formatYituliuSourceLabel(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return "一图流数据";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
}

export function useRiicOperatorSources(options = {}) {
  const {
    router,
    storageReady,
    createInitialWorkspaceFromCurrent,
    readOperatorSourceWorkspaces,
    saveWizardState,
    loadSavedWizardState,
    applySavedWizardState,
    removeOperatorSourceWorkspace,
    resetGeneratedScheduleState,
    generateAutomaticSchedule,
    getIsUserLoggedIn,
    getAutomaticGenerationTriggerKey,
  } = options;
  const isUserLoggedIn = {
    get value() {
      return Boolean(getIsUserLoggedIn?.());
    },
  };
  const automaticGenerationTriggerKey = {
    get value() {
      return String(getAutomaticGenerationTriggerKey?.() || "");
    },
  };

  const yituliuTokenInput = ref("");
  const yituliuSourceLabelInput = ref("");
  const customSourceImportPanelOpen = ref(false);
  const customSourceImportType = ref("");
  const customSourceImporting = ref(false);
  const customOperatorSources = ref([]);
  const ownedOperators = ref([]);
  const ownedOperatorSource = ref("");
  const ownedOperatorMessage = ref("");
  const ownedOperatorError = ref("");
  const ownedOperatorLastSyncedAt = ref("");
  const loadingOwnedOperators = ref(false);
  const activeOperatorSource = ref("");
  const operatorSourceSwitching = ref(false);
  const operatorSourceStates = reactive({
    skland: {
      id: OPERATOR_SOURCE_KEYS.skland,
      type: "skland",
      label: "???",
      operators: [],
      importedAt: "",
      loading: false,
      error: "",
    },
    manual: {
      id: OPERATOR_SOURCE_KEYS.manual,
      type: "manual",
      label: "手动编辑",
      operators: [],
      importedAt: "",
      loading: false,
      error: "",
    },
  });

function normalizeOwnedOperators(list = [], requireOwn = false) {
  const operatorMap = new Map();

  for (const operator of list) {
    if (requireOwn && !operator?.own) {
      continue;
    }

    const charId = operator?.charId;
    const name = operatorTableV2?.[charId]?.name || operator?.name;
    if (!name) {
      continue;
    }

    const elite = Number.isFinite(Number(operator?.elite))
      ? Number(operator.elite)
      : 0;
    const level = Number.isFinite(Number(operator?.level))
      ? Number(operator.level)
      : null;
    const identity = charId || name;
    const current = operatorMap.get(identity);

    if (
      !current ||
      elite > current.elite ||
      (elite === current.elite && (level || 0) > (current.level || 0))
    ) {
      operatorMap.set(identity, {
        charId: charId || null,
        name,
        rarity:
          Number.isFinite(Number(operator?.rarity))
            ? Number(operator.rarity)
            : operatorTableV2?.[charId]?.rarity || 1,
        elite,
        level,
        potential: Number.isFinite(Number(operator?.potential))
          ? Number(operator.potential)
          : 0,
      });
    }
  }

  return [...operatorMap.values()];
}

function getOwnedOperatorSignature(list = []) {
  return normalizeOwnedOperators(list)
    .map(
      (operator) =>
        `${operator.charId || operator.name}:${operator.elite}:${
          operator.level ?? ""
        }:${operator.potential}`,
    )
    .sort()
    .join("|");
}

function normalizeYituliuStoredOperators(list = []) {
  return normalizeOwnedOperators(list).filter(
    (operator) => Number(operator?.level) >= 1,
  );
}

function readSklandAccountFromSession() {
  try {
    const savedAccountData = sessionStorage.getItem(
      SKLAND_ACCOUNT_SESSION_STORAGE_KEY,
    );
    if (!savedAccountData) {
      return null;
    }

    return JSON.parse(savedAccountData);
  } catch (error) {
    console.error("readSklandAccountFromSession failed", error);
    return null;
  }
}

function readStoredSklandOperatorSnapshot() {
  try {
    const raw = localStorage.getItem(
      RIIC_SKLAND_OPERATOR_SNAPSHOT_STORAGE_KEY,
    );
    if (!raw) {
      return null;
    }

    const snapshot = JSON.parse(raw);
    if (snapshot?.version !== 1 || !Array.isArray(snapshot?.operators)) {
      return null;
    }

    const operators = normalizeOwnedOperators(snapshot.operators);
    return operators.length > 0
      ? {
          operators,
          importedAt: String(snapshot.importedAt || ""),
        }
      : null;
  } catch {
    return null;
  }
}

function saveSklandOperatorSnapshot(operators, importedAt = "") {
  try {
    localStorage.setItem(
      RIIC_SKLAND_OPERATOR_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        importedAt: String(importedAt || ""),
        operators: normalizeOwnedOperators(operators),
      }),
    );
  } catch {
    // A current-tab source remains usable when shared storage is unavailable.
  }
}

function getOperatorSourceState(source) {
  return operatorSourceStates[source] || null;
}

function getOperatorSourceRecord(source) {
  return customOperatorSources.value.find((item) => item.id === source) || null;
}

function getOperatorSourceLabel(source) {
  if (source === OPERATOR_SOURCE_KEYS.skland) {
    return "森空岛";
  }

  if (source === OPERATOR_SOURCE_KEYS.manual) {
    return "手动编辑";
  }

  return getOperatorSourceRecord(source)?.label || "自定义数据源";
}

function getOperatorSourceType(source) {
  if (source === OPERATOR_SOURCE_KEYS.skland) {
    return "skland";
  }

  if (source === OPERATOR_SOURCE_KEYS.manual) {
    return "manual";
  }

  return getOperatorSourceRecord(source)?.type || "";
}

function getOperatorSourceStatus(source) {
  const state = getOperatorSourceState(source);
  const available = Boolean(state?.operators?.length);
  const type = getOperatorSourceType(source);
  const isSkland = type === "skland";
  const isManual = type === "manual";
  const isMaa = type === "maa";

  let detail = isSkland
    ? "点击打开森空岛同步流程"
    : isManual
      ? "点击前往干员编辑"
    : isMaa
      ? "点击导入 MAA JSON 文件"
      : "点击使用一图流 Token";
  if (state?.loading) {
    detail = isSkland
      ? "正在读取森空岛数据"
      : isManual
        ? "正在读取手动编辑数据"
      : isMaa
        ? "正在读取 MAA JSON 文件"
        : "正在读取一图流数据";
  } else if (state?.error) {
    detail = state.error;
  } else if (available) {
    const count = state.operators.length;
    const time = state.importedAt
      ? ` · ${formatOperatorSyncTime(state.importedAt)}`
      : "";
    detail = `${count} 名持有干员${time}`;
  }

  return {
    available,
    active: activeOperatorSource.value === source,
    title: isSkland
      ? available
        ? "森空岛数据已同步"
        : "未同步森空岛数据"
      : isMaa
        ? available
          ? "MAA 数据已导入"
          : "未导入 MAA 数据"
        : isManual
          ? available
            ? "手动编辑数据"
            : "未设置手动编辑数据"
        : available
          ? "一图流数据已导入"
          : "未导入一图流数据",
    detail,
    tone: available ? "success" : "warning",
  };
}

function readSavedOperatorSource() {
  try {
    const source = localStorage.getItem(RIIC_OPERATOR_SOURCE_STORAGE_KEY);
    if (
      source === OPERATOR_SOURCE_KEYS.skland ||
      (ENABLE_MANUAL_OPERATOR_SOURCE &&
        source === OPERATOR_SOURCE_KEYS.manual) ||
      Boolean(getOperatorSourceRecord(source))
    ) {
      return source;
    }
    return "";
  } catch {
    return "";
  }
}

function saveActiveOperatorSource(source) {
  try {
    localStorage.setItem(RIIC_OPERATOR_SOURCE_STORAGE_KEY, source);
  } catch {
    // The current page remains usable when local storage is unavailable.
  }
}

function readStoredMaaOperatorSnapshot() {
  try {
    const stored = localStorage.getItem(RIIC_MAA_OPERATOR_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const snapshot = JSON.parse(stored);
    if (
      snapshot?.schemaVersion !== 1 ||
      !Array.isArray(snapshot.operators)
    ) {
      return null;
    }

    return snapshot;
  } catch (error) {
    console.error("readStoredMaaOperatorSnapshot failed", error);
    return null;
  }
}

function createStoredCustomOperatorSource(source) {
  if (
    customOperatorSources.value.length >= RIIC_MAX_CUSTOM_OPERATOR_SOURCES ||
    customOperatorSources.value.some((item) => item.id === source.id)
  ) {
    return false;
  }

  const label =
    source.label ||
    (source.type === "maa" ? "MAA 数据" : "一图流数据");
  customOperatorSources.value.push({
    id: source.id,
    type: source.type,
    label,
    fileName: source.fileName || "",
    importedAt: source.importedAt || "",
    createdAt: source.createdAt || new Date().toISOString(),
    warnings: Array.isArray(source.warnings) ? source.warnings : [],
  });
  operatorSourceStates[source.id] = {
    id: source.id,
    type: source.type,
    label,
    operators:
      source.type === "yituliu"
        ? normalizeYituliuStoredOperators(source.operators || [])
        : normalizeOwnedOperators(source.operators || []),
    importedAt: source.importedAt || "",
    fileName: source.fileName || "",
    warnings: Array.isArray(source.warnings) ? source.warnings : [],
    loading: false,
    error: "",
  };
  return true;
}

function saveOperatorSources() {
  try {
    localStorage.setItem(
      RIIC_OPERATOR_SOURCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        sources: customOperatorSources.value.map((source) => ({
          id: source.id,
          type: source.type,
          label: source.label,
          fileName: source.fileName || "",
          importedAt: source.importedAt || "",
          createdAt: source.createdAt || "",
          warnings: Array.isArray(source.warnings) ? source.warnings : [],
          operators: getOperatorSourceState(source.id)?.operators || [],
        })),
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // The page remains usable when local storage is unavailable.
  }
}

function loadOperatorSources() {
  customOperatorSources.value = [];
  let cleanedYituliuCache = false;

  try {
    const raw = localStorage.getItem(RIIC_OPERATOR_SOURCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const source of Array.isArray(parsed?.sources) ? parsed.sources : []) {
        if (
          !source?.id ||
          !["maa", "yituliu"].includes(source.type) ||
          !Array.isArray(source.operators)
        ) {
          continue;
        }
        if (createStoredCustomOperatorSource(source)) {
          const storedOperators =
            getOperatorSourceState(source.id)?.operators || [];
          if (
            source.type === "yituliu" &&
            storedOperators.length !== source.operators.length
          ) {
            cleanedYituliuCache = true;
          }
        }
      }
    } else {
      const legacySnapshot = readStoredMaaOperatorSnapshot();
      if (legacySnapshot?.operators?.length) {
        createStoredCustomOperatorSource({
          id: "custom-maa-legacy",
          type: "maa",
          label: "MAA 数据",
          fileName: legacySnapshot.fileName,
          importedAt: legacySnapshot.importedAt,
          warnings: legacySnapshot.warnings,
          operators: legacySnapshot.operators,
        });
        saveOperatorSources();
      }
    }
  } catch (error) {
    console.error("loadOperatorSources failed", error);
    customOperatorSources.value = [];
  }

  if (cleanedYituliuCache) {
    saveOperatorSources();
  }

  let savedSource = readSavedOperatorSource();
  if (
    !savedSource &&
    localStorage.getItem(RIIC_OPERATOR_SOURCE_STORAGE_KEY) === "maa" &&
    getOperatorSourceRecord("custom-maa-legacy")
  ) {
    savedSource = "custom-maa-legacy";
    saveActiveOperatorSource(savedSource);
  }
  activeOperatorSource.value =
    savedSource === OPERATOR_SOURCE_KEYS.skland ||
    (ENABLE_MANUAL_OPERATOR_SOURCE &&
      savedSource === OPERATOR_SOURCE_KEYS.manual) ||
    getOperatorSourceRecord(savedSource)
      ? savedSource
      : OPERATOR_SOURCE_KEYS.skland;
}

function loadManualOperatorSource() {
  if (!ENABLE_MANUAL_OPERATOR_SOURCE) {
    return;
  }

  const state = operatorSourceStates.manual;
  state.loading = true;
  state.error = "";

  try {
    const snapshot = readRiicManualOperatorSnapshot();
    state.operators = normalizeOwnedOperators(snapshot?.operators || []);
    state.importedAt = snapshot?.updatedAt || "";
  } catch (error) {
    console.error("loadManualOperatorSource failed", error);
    state.operators = [];
    state.importedAt = "";
    state.error = "手动编辑数据读取失败";
  } finally {
    state.loading = false;
  }
}

function loadStoredMaaOperatorSource() {
  if (customOperatorSources.value.length > 0) {
    return;
  }

  const snapshot = readStoredMaaOperatorSnapshot();
  if (!snapshot?.operators?.length) {
    return;
  }

  createStoredCustomOperatorSource({
    id: "custom-maa-legacy",
    type: "maa",
    label: "MAA 数据",
    fileName: snapshot.fileName,
    importedAt: snapshot.importedAt,
    warnings: snapshot.warnings,
    operators: snapshot.operators,
  });
  saveOperatorSources();
}

async function setActiveOperatorSource(
  source,
  {
    notify = false,
    restoreWorkspace = true,
    initialWorkspace = null,
    generate = true,
  } = {},
) {
  const state = getOperatorSourceState(source);
  if (!state || state.operators.length === 0) {
    return false;
  }

  const previousSource = activeOperatorSource.value;
  const sourceHasSavedWorkspace = Boolean(
    readOperatorSourceWorkspaces()[source],
  );
  if (
    previousSource &&
    previousSource !== source &&
    storageReady.value
  ) {
    saveWizardState();
  }

  operatorSourceSwitching.value = true;
  try {
    activeOperatorSource.value = source;
    saveActiveOperatorSource(source);
    ownedOperators.value = normalizeOwnedOperators(state.operators);
    ownedOperatorSource.value = getOperatorSourceLabel(source);
    ownedOperatorMessage.value = `已读取 ${ownedOperators.value.length} 名持有干员`;
    ownedOperatorLastSyncedAt.value = state.importedAt || "";
    ownedOperatorError.value = state.error || "";

    if (restoreWorkspace && previousSource !== source) {
      const restored = loadSavedWizardState({
        sourceId: source,
        initialWorkspace,
      });
      if (!restored && initialWorkspace) {
        applySavedWizardState(initialWorkspace);
      }
    }

    await nextTick();
  } catch (error) {
    console.error("setActiveOperatorSource failed", error);
    ownedOperatorError.value = "持有干员数据切换失败，请稍后重试";
    return false;
  } finally {
    operatorSourceSwitching.value = false;
  }

  if (
    generate &&
    automaticGenerationTriggerKey.value &&
    (!sourceHasSavedWorkspace || initialWorkspace)
  ) {
    void generateAutomaticSchedule({ silentSuccess: true });
  }

  if (notify) {
    cMessage(
      `${getOperatorSourceLabel(source)}数据已切换，共 ${ownedOperators.value.length} 名持有干员`,
    );
  }

  return true;
}

function clearActiveOperatorSource() {
  activeOperatorSource.value = "";
  ownedOperators.value = [];
  ownedOperatorSource.value = "";
  ownedOperatorMessage.value = "尚未读取到本站可用的持有干员数据";
  ownedOperatorLastSyncedAt.value = "";
}

function readSklandOperatorsFromSession() {
  const accountData = readSklandAccountFromSession();
  return normalizeOwnedOperators(accountData?.operatorDataList || [], true);
}

async function loadSklandOperatorSource() {
  const state = operatorSourceStates.skland;
  state.loading = true;
  state.error = "";

  try {
    const sklandAccountData = readSklandAccountFromSession();
    const sklandOperators = readSklandOperatorsFromSession();

    if (sklandOperators.length > 0) {
      state.operators = sklandOperators;
      state.importedAt = sklandAccountData?.importedAt || "";
      saveSklandOperatorSnapshot(state.operators, state.importedAt);
      return;
    }

    if (isUserLoggedIn.value) {
      const response = await operatorDataAPI.getOperatorData();
      const surveyOperators = normalizeOwnedOperators(
        response?.data || [],
        true,
      );

      if (surveyOperators.length > 0) {
        state.operators = surveyOperators;
        state.importedAt = "";
        saveSklandOperatorSnapshot(state.operators, state.importedAt);
        return;
      }
    }

    const storedSnapshot = readStoredSklandOperatorSnapshot();
    state.operators = storedSnapshot?.operators || [];
    state.importedAt = storedSnapshot?.importedAt || "";
  } catch (error) {
    console.error("loadSklandOperatorSource failed", error);
    const storedSnapshot = readStoredSklandOperatorSnapshot();
    state.operators = storedSnapshot?.operators || [];
    state.importedAt = storedSnapshot?.importedAt || "";
    if (state.operators.length === 0) {
      state.error = "森空岛数据读取失败";
    }
  } finally {
    state.loading = false;
  }
}

async function loadOwnedOperators({ notify = false } = {}) {
  loadingOwnedOperators.value = true;
  ownedOperatorError.value = "";

  try {
    const previousSource = activeOperatorSource.value;
    const previousOperatorSignature = getOwnedOperatorSignature(
      ownedOperators.value,
    );
    await loadSklandOperatorSource();
    loadManualOperatorSource();
    loadStoredMaaOperatorSource();

    const savedSource = readSavedOperatorSource();
    const preferredSources = [
      savedSource,
      previousSource,
      OPERATOR_SOURCE_KEYS.skland,
      ...(ENABLE_MANUAL_OPERATOR_SOURCE
        ? [OPERATOR_SOURCE_KEYS.manual]
        : []),
      ...customOperatorSources.value.map((source) => source.id),
    ];
    const nextSource = preferredSources.find(
      (source, index) =>
        source &&
        preferredSources.indexOf(source) === index &&
        getOperatorSourceState(source)?.operators?.length > 0,
    );

    if (nextSource) {
      const nextOperatorSignature = getOwnedOperatorSignature(
        getOperatorSourceState(nextSource)?.operators,
      );
      const savedOperatorSignature = String(
        readOperatorSourceWorkspaces()[nextSource]?.operatorRosterSignature ||
          "",
      ).trim();
      const shouldResetGeneratedSchedule =
        previousSource === nextSource &&
        Boolean(nextOperatorSignature) &&
        ((Boolean(previousOperatorSignature) &&
          previousOperatorSignature !== nextOperatorSignature) ||
          (Boolean(savedOperatorSignature) &&
            savedOperatorSignature !== nextOperatorSignature));
      if (shouldResetGeneratedSchedule) {
        resetGeneratedScheduleState?.({
          suppressCurrentAutomaticGeneration: false,
        });
      }
      await setActiveOperatorSource(nextSource, {
        restoreWorkspace: false,
        generate: true,
      });
      if (notify) {
        cMessage(ownedOperatorMessage.value);
      }
    } else {
      clearActiveOperatorSource();
    }
  } catch (error) {
    console.error("loadOwnedOperators failed", error);
    ownedOperators.value = [];
    ownedOperatorLastSyncedAt.value = "";
    ownedOperatorError.value = "持有干员数据读取失败，请稍后重试";
  } finally {
    loadingOwnedOperators.value = false;
  }
}

function openSklandImport() {
  router.push({
    name: "OperatorSurvey",
    query: {
      openImport: "1",
    },
  });
}

async function handleMaaFileChange(file) {
  if (!file) {
    return;
  }

  const initialWorkspace = createInitialWorkspaceFromCurrent();
  customSourceImporting.value = true;

  try {
    const payload = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
    const parsed = parseRiicMaaOperatorBox(payload, operatorTableV2);

    if (parsed.operators.length === 0) {
      throw new Error("MAA JSON 中没有找到已持有干员");
    }

    await createCustomOperatorSource({
      type: "maa",
      label: "MAA 数据",
      fileName: file.name,
      operators: parsed.operators,
      warnings: parsed.warnings,
      initialWorkspace,
    });
    customSourceImportPanelOpen.value = false;

    const warningSuffix = parsed.warnings.length
      ? `，另有 ${parsed.warnings.length} 条提示`
      : "";
    cMessage(
      `MAA 数据已导入，共 ${parsed.operators.length} 名持有干员${warningSuffix}`,
      parsed.warnings.length ? "warn" : "success",
    );
  } catch (error) {
    console.error("handleMaaFileChange failed", error);
    cMessage(error?.message || "MAA JSON 读取失败", "error");
  } finally {
    customSourceImporting.value = false;
    customSourceImportType.value = "";
  }
}

function createCustomOperatorSourceId(type) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `custom-${type}-${Date.now()}-${suffix}`;
}

function normalizeYituliuOperatorBox(payload) {
  const records = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  const warnings = [];
  const operators = [];
  const seenIds = new Set();

  for (const record of records) {
    const charId = String(record?.id || "").trim();
    if (!charId || seenIds.has(charId)) {
      continue;
    }
    seenIds.add(charId);

    const knownOperator = operatorTableV2?.[charId];
    if (!knownOperator) {
      warnings.push(`本地干员表未找到：${charId}`);
      continue;
    }

    const elite = Number(record?.evolvePhase);
    const level = Number(record?.level);
    const potential = Number(record?.potentialRank);
    if (!Number.isInteger(level) || level < 1) {
      continue;
    }
    operators.push({
      charId,
      name: knownOperator.name,
      rarity: knownOperator.rarity,
      elite: Number.isInteger(elite) && elite >= 0 && elite <= 2 ? elite : 0,
      level,
      potential:
        Number.isInteger(potential) && potential >= 0 && potential <= 6
          ? potential
          : 0,
    });
  }

  return {
    operators: normalizeOwnedOperators(operators),
    warnings,
  };
}

async function createCustomOperatorSource({
  type,
  label,
  operators,
  fileName = "",
  warnings = [],
  importedAt = new Date().toISOString(),
  initialWorkspace = null,
}) {
  if (customOperatorSources.value.length >= RIIC_MAX_CUSTOM_OPERATOR_SOURCES) {
    throw new Error(`最多只能添加 ${RIIC_MAX_CUSTOM_OPERATOR_SOURCES} 个自定义数据源`);
  }

  const source = {
    id: createCustomOperatorSourceId(type),
    type,
    label,
    fileName,
    importedAt,
    warnings,
    operators,
  };
  if (!createStoredCustomOperatorSource(source)) {
    throw new Error("创建自定义数据源失败");
  }

  saveOperatorSources();
  await setActiveOperatorSource(source.id, {
    initialWorkspace,
    generate: true,
  });
  return source;
}

function openCustomSourceImportPanel() {
  if (customOperatorSources.value.length >= RIIC_MAX_CUSTOM_OPERATOR_SOURCES) {
    cMessage(`最多只能添加 ${RIIC_MAX_CUSTOM_OPERATOR_SOURCES} 个自定义数据源`, "warn");
    return;
  }

  customSourceImportPanelOpen.value = !customSourceImportPanelOpen.value;
  customSourceImportType.value = "";
  yituliuTokenInput.value = "";
  yituliuSourceLabelInput.value = "";
}

async function importYituliuOperatorSource() {
  const token = yituliuTokenInput.value.trim();
  if (!token) {
    cMessage("请输入一图流 Token", "warn");
    return;
  }

  const initialWorkspace = createInitialWorkspaceFromCurrent();
  customSourceImporting.value = true;
  customSourceImportType.value = "yituliu";
  try {
    const response = await fetch(RIIC_YITULIU_OPERATOR_API_URL, {
      headers: {
        Authorization: token,
      },
    });
    const payload = await response.json().catch(() => null);
    const responseCode = Number(payload?.code);
    if (
      !response.ok ||
      (payload?.code !== undefined && ![0, 200].includes(responseCode))
    ) {
      throw new Error(payload?.msg || payload?.message || "一图流数据读取失败");
    }

    const parsed = normalizeYituliuOperatorBox(payload);
    if (parsed.operators.length === 0) {
      throw new Error("一图流数据中未找到可用的持有干员");
    }
    const importedAt = new Date().toISOString();
    const label =
      yituliuSourceLabelInput.value.trim() ||
      formatYituliuSourceLabel(importedAt);

    await createCustomOperatorSource({
      type: "yituliu",
      label,
      operators: parsed.operators,
      warnings: parsed.warnings,
      importedAt,
      initialWorkspace,
    });
    yituliuTokenInput.value = "";
    yituliuSourceLabelInput.value = "";
    customSourceImportPanelOpen.value = false;
    cMessage(`一图流数据已导入，共 ${parsed.operators.length} 名持有干员`, "success");
  } catch (error) {
    console.error("importYituliuOperatorSource failed", error);
    cMessage(error?.message || "一图流数据读取失败", "error");
  } finally {
    customSourceImporting.value = false;
    customSourceImportType.value = "";
  }
}

async function deleteCustomOperatorSource(sourceId) {
  const source = getOperatorSourceRecord(sourceId);
  if (!source) {
    return;
  }

  const wasActive = activeOperatorSource.value === sourceId;
  if (wasActive && storageReady.value) {
    saveWizardState();
  }

  customOperatorSources.value = customOperatorSources.value.filter(
    (item) => item.id !== sourceId,
  );
  delete operatorSourceStates[sourceId];
  removeOperatorSourceWorkspace(sourceId);
  saveOperatorSources();

  if (wasActive) {
    activeOperatorSource.value = "";
    if (getOperatorSourceState(OPERATOR_SOURCE_KEYS.skland)?.operators?.length) {
      await setActiveOperatorSource(OPERATOR_SOURCE_KEYS.skland, {
        notify: true,
      });
    } else {
      clearActiveOperatorSource();
      saveActiveOperatorSource(OPERATOR_SOURCE_KEYS.skland);
    }
  }

  cMessage(`${source.label}已删除`, "success");
}

  function resetOperatorSources({ clearStorage = false } = {}) {
    if (clearStorage) {
      try {
        localStorage.removeItem(RIIC_MAA_OPERATOR_STORAGE_KEY);
        localStorage.removeItem(RIIC_MANUAL_OPERATOR_STORAGE_KEY);
        localStorage.removeItem(RIIC_SKLAND_OPERATOR_SNAPSHOT_STORAGE_KEY);
        localStorage.removeItem(RIIC_OPERATOR_SOURCE_STORAGE_KEY);
        localStorage.removeItem(RIIC_OPERATOR_SOURCES_STORAGE_KEY);
      } catch {
        // The generator remains usable when local storage is unavailable.
      }
    }

    clearActiveOperatorSource();
    Object.assign(operatorSourceStates.skland, {
      loading: false,
      operators: [],
      importedAt: "",
      error: "",
    });
    Object.assign(operatorSourceStates.manual, {
      loading: false,
      operators: [],
      importedAt: "",
      error: "",
    });
    for (const source of customOperatorSources.value) {
      delete operatorSourceStates[source.id];
    }
    customOperatorSources.value = [];
    customSourceImportPanelOpen.value = false;
    customSourceImportType.value = "";
    customSourceImporting.value = false;
    yituliuTokenInput.value = "";
    yituliuSourceLabelInput.value = "";
    operatorSourceSwitching.value = false;
  }

  return {
    yituliuTokenInput,
    yituliuSourceLabelInput,
    customSourceImportPanelOpen,
    customSourceImportType,
    customSourceImporting,
    customOperatorSources,
    ownedOperators,
    ownedOperatorSource,
    ownedOperatorMessage,
    ownedOperatorError,
    ownedOperatorLastSyncedAt,
    loadingOwnedOperators,
    activeOperatorSource,
    operatorSourceSwitching,
    operatorSourceStates,
    getOperatorSourceState,
    getOperatorSourceRecord,
    getOperatorSourceLabel,
    getOperatorSourceType,
    getOperatorSourceStatus,
    loadOperatorSources,
    loadManualOperatorSource,
    loadStoredMaaOperatorSource,
    loadOwnedOperators,
    setActiveOperatorSource,
    clearActiveOperatorSource,
    openSklandImport,
    handleMaaFileChange,
    openCustomSourceImportPanel,
    importYituliuOperatorSource,
    deleteCustomOperatorSource,
    resetOperatorSources,
  };
}
