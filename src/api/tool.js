import request from "@/api/request";

const api_name = `/tool`;

export default {
  //根据tag集合和最高星级返回公招结果
  findAllDataRec(type, tags, rarityMax) {
    return request({
      url: `/api/find/recruit/${type}/${tags}/${rarityMax}`,
      method: "get",
    });
  },

  updateVisits(path) {
    return request({
      url: `${api_name}/visits?path=${path}`,
      method: "get",
    });
  },

  maaStatistical() {
    return request({
      url: `${api_name}/recruit/statistical`,
      method: "get",
    });
  },

  createStorePackJson(data) {
    return request({
      url: `/file/create/pack/json`,
      method: "post",
      data: data,
    });
  },

  findPoolDataByUid(uid) {
    return request({
      url: `${api_name}/pool/find/${uid}`,
      method: "get",
    });
  },
};
