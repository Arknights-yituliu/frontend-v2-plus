import ucService from "/src/api/user-center/ucClient.js";

// UC OAuth 游戏数据接口路径：读写游戏账号与干员数据
const OAUTH_AK_ACCOUNTS_PATH = "/oauth2/ak-accounts";
// 默认数据来源路径：设置读取干员数据不传 akUid 时默认返回的条目
const OAUTH_AK_ACCOUNTS_DEFAULT_UPDATE_PATH = "/oauth2/ak-accounts/default/update";
const OAUTH_AK_ACCOUNTS_ITEMS_PATH = "/oauth2/ak-accounts/items";
const OAUTH_AK_ACCOUNTS_OPERATOR_SAVE_PATH = "/oauth2/ak-accounts/operators/save";
// UC 手动修改版干员数据路径：每个用户一份个人副本，额外包含 owned（是否持有）
const OAUTH_AK_ACCOUNTS_MANUAL_OPERATORS_PATH = "/oauth2/ak-accounts/manual-operators";
const OAUTH_AK_ACCOUNTS_MANUAL_OPERATOR_SAVE_PATH = "/oauth2/ak-accounts/manual-operators/save";

// UC 干员养成数据统计结果查询路径：只读统计结果表，无需登录、无需授权范围
const AK_OPERATOR_STATISTICS_RESULT_PATH = "/open/ak-operator-statistics/result";

/**
 * 保存游戏角色信息与干员数据（UC OAuth 游戏数据接口）
 *
 * <p>需要 UC access_token 具备 gama-data.write 授权范围；目标游戏账号取自 playerInfo.akUid。
 * 同一游戏账号 2 秒内只接受一次保存请求。失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @param {Object} data 保存参数
 * @param {Object} data.playerInfo 角色信息，至少包含 akUid
 * @param {Array} data.operators 干员数组，不能为空
 * @returns {Promise<{createdCount: number, updatedCount: number, unchangedCount: number}>} 新增/更新/未变更条数统计
 */
async function saveAkAccountOperators(data) {
  return ucService.post(OAUTH_AK_ACCOUNTS_OPERATOR_SAVE_PATH, data);
}

/**
 * 查询当前用户已绑定的游戏账号列表（UC OAuth 游戏数据接口）
 *
 * <p>需要 UC access_token 具备 gama-data.read 授权范围。UC 侧把用户设置的默认来源
 * （defaultFlag=true）排在最前，其余按最近一次变更时间倒序，前端取首条即为默认展示的数据来源。
 * 失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @returns {Promise<Array<{akUid: string, source: string, defaultFlag: boolean, createTime: string, updateTime: string}>>} 数据条目列表，默认来源在前
 */
async function listAkAccounts() {
  return ucService.get(OAUTH_AK_ACCOUNTS_PATH);
}

/**
 * 设置默认数据来源（UC OAuth 游戏数据接口）
 *
 * <p>需要 UC access_token 具备 gama-data.write 授权范围。每个用户只保留一条默认偏好，重复设置直接覆盖；
 * 设置成功后该条目在账号列表中 defaultFlag=true 并排在最前，读取干员数据不传 akUid 时返回该条目。
 * 失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @param {Object} data 默认来源参数
 * @param {string} data.akUid 数据条目 UID：skland 为游戏账号 UID，manual 为用户中心 UID
 * @param {string} data.source 数据来源：skland 森空岛自动导入，manual 用户手动上传
 * @returns {Promise<null>} 成功时 data 为 null
 */
async function setDefaultAkAccount(data) {
  return ucService.post(OAUTH_AK_ACCOUNTS_DEFAULT_UPDATE_PATH, data);
}

/**
 * 按游戏账号 UID 全量拉取干员数据（UC OAuth 游戏数据接口）
 *
 * <p>需要 UC access_token 具备 gama-data.read 授权范围，且该 akUid 在当前用户名下；
 * 该账号无数据时 items 为空数组。失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @param {string} akUid 游戏账号 UID
 * @returns {Promise<{akUid: string, items: Array<Object>}>} 该账号的干员全量数据
 */
async function getAkAccountOperators(akUid) {
  return ucService.get(`${OAUTH_AK_ACCOUNTS_PATH}/operators`, {params: {akUid}});
}

/**
 * 按游戏账号 UID 全量拉取物品存量快照（UC OAuth 游戏数据接口）
 *
 * <p>需要 UC access_token 具备 gama-data.read 授权范围，且该 akUid 在当前用户名下；
 * 物品没有手动/自动来源之分，akUid 必须是游戏账号 UID。
 * 该账号从未上报过物品时 items 为空数组，updateTime 为 null。
 * 失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @param {string} akUid 游戏账号 UID
 * @returns {Promise<{akUid: string, items: Array<{itemId: string, count: number}>, updateTime: string|null}>} 物品存量快照
 */
async function getAkAccountItems(akUid) {
  return ucService.get(OAUTH_AK_ACCOUNTS_ITEMS_PATH, {params: {akUid}});
}

/**
 * 查询当前用户的手动修改版干员数据（UC OAuth 游戏数据接口）
 *
 * <p>手动修改版是用户个人的干员副本，与具体游戏账号无关，每个用户仅一份，
 * 额外包含 owned（是否持有）字段。需要 UC access_token 具备 gama-data.read 授权范围；
 * 尚未创建手动版时返回空数组。失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @returns {Promise<Array<Object>>} 手动版干员数组（含 owned / 等级 / 精英化 / 技能 / 模组等字段）
 */
async function getManualOperators() {
  return ucService.get(OAUTH_AK_ACCOUNTS_MANUAL_OPERATORS_PATH);
}

/**
 * 保存手动修改版干员数据（UC OAuth 游戏数据接口）
 *
 * <p>需要 UC access_token 具备 gama-data.write 授权范围。请求体形如 { operators: [...] }，
 * 同一次请求内 id 不可重复；未出现在请求中的干员不会被删除，本接口不占用游戏账号上传限流名额。
 * 失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @param {{operators: Array<Object>}} payload 完整请求体（由 buildManualOperatorSavePayload 生成）
 * @returns {Promise<{createdCount: number, updatedCount: number, unchangedCount: number}>} 新增/更新/未变更条数统计
 */
async function saveManualOperators(payload) {
  return ucService.post(OAUTH_AK_ACCOUNTS_MANUAL_OPERATOR_SAVE_PATH, payload);
}

/**
 * 查询干员养成数据统计结果（UC 干员数据统计接口）
 *
 * <p>只读统计结果表，无需登录、无需授权范围，故不携带业务参数；尚未跑过统计时返回空数组。
 * 各分布字段（elite / skill1~3 / modA、X、Y、D、B）为「取值 → 记录数」的对象，
 * 与旧接口 {@code Map<Integer, Integer>} 序列化后的形态一致，消费方无需额外转换。</p>
 *
 * @returns {Promise<Array<Object>>} 按干员编码升序排列的统计结果
 */
async function getAkOperatorStatisticsResult() {
  return ucService.get(AK_OPERATOR_STATISTICS_RESULT_PATH);
}

export {
  saveAkAccountOperators,
  listAkAccounts,
  setDefaultAkAccount,
  getAkAccountOperators,
  getAkAccountItems,
  getManualOperators,
  saveManualOperators,
  getAkOperatorStatisticsResult,
};
