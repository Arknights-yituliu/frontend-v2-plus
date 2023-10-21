import request from "/src/api/request";

export default {
  /**
   * 查询蓝色品质材料的推荐关卡
   * @param expCoefficient 经验书价值系数
   * @param sampleSize 样本量
   * @returns {*}
   */

  getT3RecommendedStage(expCoefficient, sampleSize) {
    return request({
      url: `/stage/t3?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`,
      method: "get",
    });
  },

  /**
   * 获取关卡效率，按材料系列分组
   * @param expCoefficient 经验书价值系数
   * @param sampleSize 样本量
   * @returns {*}
   */
  getStageResultGroupByItemSeries(expCoefficient,sampleSize) {
    return request({
      url: `/stage/result?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`,
      method: "get",
    });
  },

  /**
   * 查询绿色品质材料的推荐关卡
   * @param expCoefficient 经验书价值系数
   * @param sampleSize 样本量
   * @returns {*}
   */
  getT2RecommendedStage(expCoefficient, sampleSize) {
    return request({
      url: `/stage/t2?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`,
      method: "get",
    });
  },

  //搓玉查询
  getOrundumRecommendedStage() {
    return request({
      url: `/stage/orundum`,
      method: "get",
    });
  },

  /**
   * 查询历史活动关
   * @param expCoefficient 经验书价值系数
   * @param sampleSize 样本量
   * @returns {*}
   */
  getHistoryActStage(expCoefficient, sampleSize) {
    return request({
      url: `/stage/act?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`,
      method: "get",
    });
  },

  /**
   * 单独获取新章节关卡效率
   * @returns {*}
   */
  getNewChapterStage(){
    return request({
      url: `stage/chapter?expCoefficient=0.625&sampleSize=300&zone=13-`,
      method: "get",
    });
  },

  /**
   * 获取关卡掉落详情
   * @param expCoefficient 经验书价值系数
   * @param sampleSize 样本量
   * @returns {*}
   */
  getAllStageResultDetail(expCoefficient,sampleSize) {
    return request({
      url: `/stage/detail?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`,
      method: "get",
    });
  },



  /**
   * 获取章节与关卡的映射表
   * @returns {*}
   */
  getStageMenu() {
    return request({
      url: `/stage/zone`,
      method: "get",
    });
  },
};
