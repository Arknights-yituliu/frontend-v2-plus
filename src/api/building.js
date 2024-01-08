import request from "@/api/request";

const api_name = `/maa`;

export default {
  //保存排班
  saveSchedule(data, id) {
    return request({
      url: `${api_name}/schedule/save?schedule_id=${id}`,
      method: "post",
      data: data,
    });
  },

  retrieveSchedule(id) {
    return request({
      url: `${api_name}/schedule/retrieve?schedule_id=${id}`,
      method: "get",
    });
  },
};
