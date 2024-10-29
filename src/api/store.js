import request from "/src/api/request";
export default {
  //查询所有常驻商店数据
  getPermStore() {
    return request({
      url: `store/perm`,
      method: "get",
    });
  },

  //查询活动商店性价比
  getActStore() {
    return request({
      url: `store/act`,
      method: "get",
    });
  },

  //商店礼包性价比
  getPackStore() {
    return request({
      url: `/store/pack`,
      method: "get",
    });
  },
};
