import { operatorTableV2 } from "@/utils/gameData.js";

export const nameToCharId = {};
export const charIdToName = {};
for (const [id, operator] of Object.entries(operatorTableV2)) {
  const avatarId = id === "char_1001_amiya2" ? "char_002_amiya" : id;
  nameToCharId[operator.name] = avatarId;
  charIdToName[avatarId] = operator.name;
}
