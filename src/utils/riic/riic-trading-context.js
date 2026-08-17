const HODRER_ID = "char_4088_hodrer";
const INES_ID = "char_4087_ines";
const W_ID = "char_113_cqbw";
const BELLONE_ID = "char_4037_demetr";
const VIGIL_ID = "char_427_vigil";
const DEEP_ID = "char_4137_udflow";
const ULPIAN_ID = "char_4145_ulpia";
const ARCHET_ID = "char_332_archet";
const QUARTZ_ID = "char_4063_quartz";

const HODRER_ALPHA_SKILL_ID =
  `${HODRER_ID}|trading|\u767d\u624b\u8d77\u5bb6\u00b7\u03b1|0|1`;
const HODRER_BETA_SKILL_ID =
  `${HODRER_ID}|trading|\u767d\u624b\u8d77\u5bb6\u00b7\u03b2|2|1`;
const BELLONE_ALPHA_SKILL_ID =
  `${BELLONE_ID}|trading|\u5bb6\u65cf\u7ecf\u8425\u00b7\u03b1|0|1`;
const BELLONE_BETA_SKILL_ID =
  `${BELLONE_ID}|trading|\u5bb6\u65cf\u7ecf\u8425\u00b7\u03b2|2|1`;
const DEEP_ALPHA_SKILL_ID =
  `${DEEP_ID}|trading|\u5bf9\u9646\u63a5\u6d3d\u4ee3\u8868\u00b7\u03b1|0|1`;
const DEEP_BETA_SKILL_ID =
  `${DEEP_ID}|trading|\u5bf9\u9646\u63a5\u6d3d\u4ee3\u8868\u00b7\u03b2|2|1`;
const VIGIL_SKILL_ID =
  `${VIGIL_ID}|trading|\u65b0\u57ce\u8d38\u6613|2|1`;
const QUARTZ_SKILL_ID =
  `${QUARTZ_ID}|trading|\u7cbe\u51c6\u6392\u671f|1|1`;
const ARCHET_ALPHA_SKILL_ID =
  `${ARCHET_ID}|trading|\u8654\u8bda\u7b79\u6b3e\u00b7\u03b1|0|1`;
const ARCHET_BETA_SKILL_ID =
  `${ARCHET_ID}|trading|\u8654\u8bda\u7b79\u6b3e\u00b7\u03b2|2|1`;

function getStateOperatorIds(stateRooms) {
  return new Set(
    (stateRooms || [])
      .flatMap((room) => room?.operators || [])
      .map((operator) => String(operator?.charId || "").trim())
      .filter(Boolean),
  );
}

function getDormitoryLevelTotal(stateRooms) {
  return (stateRooms || [])
    .filter(
      (room) => String(room?.facility || "").trim() === "dormitory",
    )
    .map((room) => Number(room?.stationLevel))
    .filter((level) => Number.isInteger(level) && level >= 0)
    .reduce((total, level) => total + level, 0);
}

function getMeetingLevel(stateRooms) {
  const levels = (stateRooms || [])
    .filter((room) => String(room?.facility || "").trim() === "meeting")
    .map((room) => Number(room?.stationLevel))
    .filter((level) => Number.isInteger(level) && level >= 0);
  return levels.length > 0 ? Math.max(...levels) : null;
}

function getManufactureProductKindCount(stateRooms) {
  return new Set(
    (stateRooms || [])
      .filter(
        (room) => String(room?.facility || "").trim() === "manufacture",
      )
      .map((room) => String(room?.product || "").trim())
      .filter(Boolean),
  ).size;
}

/**
 * Resolves cross-room conditions before P01 runs.
 * P01 receives the resulting scalar map instead of inspecting the full layout.
 */
export function resolveRiicTradingExternalOrderBonuses(stateRooms = []) {
  const operatorIds = getStateOperatorIds(stateRooms);
  const dormitoryLevelTotal = getDormitoryLevelTotal(stateRooms);
  const meetingLevel = getMeetingLevel(stateRooms);
  const manufactureProductKindCount =
    getManufactureProductKindCount(stateRooms);
  const hasInes = operatorIds.has(INES_ID);
  const hasW = operatorIds.has(W_ID);
  const hasVigil = operatorIds.has(VIGIL_ID);
  const hasUlpian = operatorIds.has(ULPIAN_ID);

  return {
    [HODRER_ALPHA_SKILL_ID]: hasInes ? 5 : 0,
    [HODRER_BETA_SKILL_ID]: (hasInes ? 5 : 0) + (hasW ? 5 : 0),
    [BELLONE_ALPHA_SKILL_ID]: hasVigil ? 5 : 0,
    [BELLONE_BETA_SKILL_ID]: hasVigil ? 10 : 0,
    [DEEP_ALPHA_SKILL_ID]: hasUlpian ? 5 : 0,
    [DEEP_BETA_SKILL_ID]: hasUlpian ? 10 : 0,
    [VIGIL_SKILL_ID]:
      Number.isInteger(meetingLevel) ? Math.min(40, meetingLevel * 5) : 0,
    [QUARTZ_SKILL_ID]: manufactureProductKindCount * 2,
    [ARCHET_ALPHA_SKILL_ID]: dormitoryLevelTotal,
    [ARCHET_BETA_SKILL_ID]: dormitoryLevelTotal * 2,
  };
}
