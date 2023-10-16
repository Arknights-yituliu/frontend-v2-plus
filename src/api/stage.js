import request from "/src/api/request";

export default {
  /**
   * 查询蓝色品质材料的推荐关卡
   * @param expCoefficient 经验书价值系数
   * @returns {*}
   */
  //根据材料类型查询关卡效率按关卡效率降序 蓝材料
  findStageDateByTypeOrderByEfficiencyDesc(expCoefficient) {
    return request({
      url: `/find/stage/t3?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },
  //根据材料查询关卡效率按期望理智降序  绿材料
  findStageDateByMainOrderByExpectDesc(expCoefficient) {
    return request({
      url: `/find/stage/t2?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },
  //搓玉查询
  findStageDataOfOrundum() {
    return request({
      url: `/find/stage/orundum`,
      method: "get",
    });
  },

  //查询已结束活动
  findClosedStage(expCoefficient) {
    return request({
      url: `/stage/closed?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },

  getNewChapter(){
    return request({
      url: `stage/chapter/v2?expCoefficient=0.625&zone=13-`,
      method: "get",
    });
  },


  getAllStageResultDetail(expCoefficient) {
    return request({
      url: `/stage/detail?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },

  getStageMenu() {
    return request({
      url: `/stage/zone`,
      method: "get",
    });
  },
};
