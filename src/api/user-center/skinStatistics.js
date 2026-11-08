import ucService from "/src/api/user-center/ucClient.js";

// UC 皮肤持有统计结果查询路径：只读统计结果表，无需登录、无需授权范围
const AK_SKIN_STATISTICS_RESULT_PATH = "/open/ak-skin-statistics/result";

/**
 * 查询皮肤持有统计结果（UC 皮肤数据统计接口）
 *
 * <p>只读统计结果表，无需登录、无需授权范围，故不携带业务参数；尚未跑过统计时返回空数组。
 * 结果由服务端每小时 10 分定时跑批刷新，接口本身不触发全表扫描。
 * 失败提示由 ucService 响应拦截器统一弹出。</p>
 *
 * @returns {Promise<Array<{skinId: string, own: number, totalAccounts: number}>>} 按皮肤编码升序排列的统计结果
 *   - skinId：皮肤编码，与 skin_table 的 skinId 一致
 *   - own：拥有该皮肤的账号数
 *   - totalAccounts：本轮参与统计的账号总数，也是持有率的分母
 */
async function getAkSkinStatisticsResult() {
  return ucService.get(AK_SKIN_STATISTICS_RESULT_PATH);
}

export {
  getAkSkinStatisticsResult,
};
