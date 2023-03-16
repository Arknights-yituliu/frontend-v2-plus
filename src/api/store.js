import request from "@/api/request";

const api_name = `/api`;

export default {
  //查询所有材料价值
  findAllItem(expCoefficient) {
    return request({
      url: `${api_name}/find/item/value?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },

  //查询所有常驻商店数据
  findPermStore() {
    return request({
      url: `${api_name}/find/store/perm`,
      method: "get",
    });
  },

  //查询活动商店性价比
  findActStore() {
    return request({
      url: `${api_name}/find/store/act`,
      method: "get",
    });
  },

  //商店礼包性价比
  findPackStore() {
    return request({
      url: `${api_name}/find/store/pack`,
      method: "get",
    });
  },
};
