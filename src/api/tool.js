import request from "@/api/request";

const api_name = `/tool`;

export default {
  updateVisits(path) {
    return request({
      url: `/private/visits?path=${path}`,
      method: "get",
    });
  },

  maaStatistical() {
    return request({
      url: `${api_name}/recruit/statistical`,
      method: "get",
    });
  },
};
