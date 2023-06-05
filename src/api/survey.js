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

  uploadCharacter(characterList, userName) {
    userName = userName.replace("#", "%23");
    return request({
      url: `${api_name}/character/upload?userName=${userName}`,
      method: "post",
      data: characterList,
    });
  },

  getSurveyCharacter(userName) {
    userName = userName.replace("#", "%23");
    return request({
      url: `${api_name}/character/retrieval?userName=${userName}`,
      method: "get",
    });
  },

  getCharStatisticsResult() {
    return request({
      url: `${api_name}/character/result`,
      method: "get",
    });
  },

  uploadScore(scoreList, userName) {
    userName = userName.replace("#", "%23");
    return request({
      url: `${api_name}/score/upload?userName=${userName}`,
      method: "post",
      data: scoreList,
    });
  },
};
