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

  updateUser(token,data) {
    return request({
      url: `${api_name}/user/update?token=${token}`,
      method: "post",
      data: data,
    });
  },

  uploadCharacter(characterList, token) {
    return request({
      url: `${api_name}/character/upload?token=${token}`,
      method: "post",
      data: characterList,
    });
  },

  uploadCharacterByExcel(file, token) {
    return request({
      url: `${api_name}/character/import/excel?token=${token}`,
      method: "post",
      data: file,
    });
  },


  uploadCharacterBySKLand(data){
    return request({
      url: `${api_name}/character/import/skland`,
      method: "post",
      data: data,
    });
  },

  getSurveyCharacter(token) {
    return request({
      url: `${api_name}/character/retrieval?token=${token}`,
      method: "get",
    });
  },

  getCharStatisticsResult() {
    return request({
      url: `${api_name}/character/result`,
      method: "get",
    });
  },

  uploadScore(scoreList, token) {
    return request({
      url: `${api_name}/score/upload?token=${token}`,
      method: "post",
      data: scoreList,
    });
  },
};
