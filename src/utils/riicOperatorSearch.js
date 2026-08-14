import { pinyin } from "pinyin-pro";

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s_-]+/g, "");
}

function getOperatorName(operator, metadata, charId) {
  return String(operator?.name || metadata?.name || charId || "").trim();
}

function getSearchTerms({ charId, name }) {
  const pinyinSyllables = pinyin(name, {
    toneType: "none",
    type: "array",
  });
  const fullPinyin = pinyinSyllables.join("");
  const pinyinInitials = pinyinSyllables
    .map((syllable) => String(syllable || "").slice(0, 1))
    .join("");
  const shortCode = String(charId || "").split("_").at(-1) || "";

  return [
    name,
    charId,
    shortCode,
    fullPinyin,
    pinyinInitials,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);
}

export function createRiicOperatorSearchEntries(
  operators = [],
  operatorTable = {},
) {
  const entriesByKey = new Map();

  for (const operator of operators || []) {
    const charId = String(operator?.charId || "").trim();
    const metadata = operatorTable?.[charId] || {};
    const name = getOperatorName(operator, metadata, charId);
    const key = charId || name;
    if (!key || !name || entriesByKey.has(key)) {
      continue;
    }

    entriesByKey.set(key, {
      charId,
      name,
      rarity: Number(metadata?.rarity || operator?.rarity || 1),
      searchTerms: getSearchTerms({ charId, name }),
    });
  }

  return [...entriesByKey.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name, "zh-CN") ||
      left.charId.localeCompare(right.charId, "en"),
  );
}

function getMatchRank(entry, query) {
  if (!query) {
    return -1;
  }

  if (entry.searchTerms.some((term) => term === query)) {
    return 0;
  }
  if (entry.searchTerms.some((term) => term.startsWith(query))) {
    return 1;
  }
  if (entry.searchTerms.some((term) => term.includes(query))) {
    return 2;
  }
  return -1;
}

export function findRiicOperatorSearchMatches(
  entries = [],
  keyword = "",
  limit = 8,
) {
  const query = normalizeSearchText(keyword);
  if (!query) {
    return [];
  }

  return (entries || [])
    .map((entry) => ({
      entry,
      rank: getMatchRank(entry, query),
    }))
    .filter(({ rank }) => rank >= 0)
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.entry.name.localeCompare(right.entry.name, "zh-CN") ||
        left.entry.charId.localeCompare(right.entry.charId, "en"),
    )
    .slice(0, Math.max(1, Number(limit) || 8))
    .map(({ entry }) => entry);
}
