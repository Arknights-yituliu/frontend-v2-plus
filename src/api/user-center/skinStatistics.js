import ucService from "/src/api/user-center/ucClient.js";

// UC 皮肤持有统计结果查询路径：只读统计结果表，无需登录、无需授权范围
const AK_SKIN_STATISTICS_RESULT_PATH = "/open/ak-skin-statistics/result";

// 访问密钥的请求参数名：与回收站掉落统计接口一致，复用同一把密钥（服务端存的是明文的 SHA-256 摘要）
const ACCESS_KEY_PARAM = "key";

/**
 * 查询皮肤持有统计结果（UC 皮肤数据统计接口）
 *
 * <p>该接口与回收站掉落统计共用同一把访问密钥，调用时必须以 {@code key} 参数携带明文；
 * 密钥缺失或不匹配时 UC 返回 80008（无权限操作）。</p>
 *
 * <p>统计结果由服务端每小时 10 分定时跑批刷新，接口本身不触发全表扫描。结果按皮肤编码升序排列，
 * 尚未跑过统计时返回空数组。</p>
 *
 * <p>密钥问题除了 ucService 的统一提示外，页面还会把 80008 渲染成密钥面板/提示条，方便直接改。</p>
 *
 * @param {string} key 访问密钥明文，与回收站掉落统计页共用
 * @returns {Promise<Array<{skinId: string, own: number, totalAccounts: number}>>} 按皮肤编码升序排列的统计结果
 *   - skinId：皮肤编码，与 skin_table 的 skinId 一致
 *   - own：拥有该皮肤的账号数
 *   - totalAccounts：本轮参与统计的账号总数，也是持有率的分母
 */
async function getAkSkinStatisticsResult(key) {
  return ucService.get(AK_SKIN_STATISTICS_RESULT_PATH, {
    params: {[ACCESS_KEY_PARAM]: key},
  });
}

export {
  getAkSkinStatisticsResult,
};
