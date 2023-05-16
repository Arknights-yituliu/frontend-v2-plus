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

  register(userData) {
    return request({
      headers: {
        "Content-Type": "application/json",
      },
      url: `${api_name}/register`,
      method: "post",
      data: userData,
    });
  },

  login(userData) {
    return request({
      headers: {
        "Content-Type": "application/json",
      },
      url: `${api_name}/login`,
      method: "post",
      data: userData,
    });
  },

  upload_character(characterList, userName) {
    userName = userName.replace("#", "%23");
    return request({
      url: `${api_name}/character?userName=${userName}`,
      method: "post",
      data: characterList,
    });
  },

  getSurveyCharData(userName) {
    userName = userName.replace("#", "%23");
    return request({
      url: `${api_name}/find/character?userName=${userName}`,
      method: "get",
    });
  },

  getCharStatisticsResult() {
    return request({
      url: `${api_name}/result`,
      method: "get",
    });
  },
};
