import request from "@/api/request";

const api_name = `/survey`;

export default {
  manualUploadOperBox(data) {
    return request({
      headers: {
        "Content-Type": "application/json",
      },
      url: `maa/upload/operBox/manual`,
      method: "post",
      data: data,
    });
  },

  getOperatorDataResult() {
    return request({
      url: `maa/operator/result`,
      method: "get",
    });
  },

  maaStatistical() {
    return request({
      url: `maa/recruit/statistical`,
      method: "get",
    });
  },

  register(userName) {
    return request({
      headers: {
        "Content-Type": "application/json",
      },
      url: `${api_name}/register`,
      method: "post",
      data: userName,
    });
  },

  login(userName) {
    return request({
      headers: {
        "Content-Type": "application/json",
      },
      url: `${api_name}/login`,
      method: "post",
      data: userName,
    });
  },

  upload_character(characterList, userName) {
    return request({
      url: `${api_name}/character?userName=${userName}`,
      method: "post",
      data: characterList,
    });
  },
};
