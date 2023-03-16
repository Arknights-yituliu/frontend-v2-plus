import request from "@/api/request";

const api_name = `/api`;

export default {
  //根据材料类型查询关卡效率按关卡效率降序 蓝材料
  findStageDateByTypeOrderByEfficiencyDesc(expCoefficient) {
    return request({
      url: `${api_name}/find/stage/t3?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },
  //根据材料查询关卡效率按期望理智降序  绿材料
  findStageDateByMainOrderByExpectDesc(expCoefficient) {
    return request({
      url: `${api_name}/find/stage/t2?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },
  //搓玉查询
  findStageDataOfOrundum() {
    return request({
      url: `${api_name}/find/stage/orundum`,
      method: "get",
    });
  },

  //根据关卡ID查询已结束活动
  findClosedActivStageByStageId(expCoefficient) {
    return request({
      url: `${api_name}/find/stage/closed?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },

  //查询所有关卡效率
  findAllStageEfficiency() {
    return request({
      url: `${api_name}/find/stage/all`,
      method: "get",
    });
  },
};
