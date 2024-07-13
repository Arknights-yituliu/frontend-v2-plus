import axios from "axios";
import {cMessage} from "/src/utils/message.js";
import {DOMAIN} from "/src/api/BASE_URL";

// 创建axios实例
const service = axios.create({
    baseURL: DOMAIN,
    timeout: 150000, // 请求超时时间
});

// http request 拦截器
service.interceptors.request.use(
    (config) => {
        // config.headers["Access-Control-Max-Age"] = 86400;
        // token 先不处理，后续使用时在完善
        return config;
    },
    (err) => {
        return Promise.reject(err);
    }
);

// http response 拦截器
service.interceptors.response.use(
    (response) => {
        if (response.data.code !== 200) {
            cMessage(response.data.msg, "error");
            return Promise.reject(response.data);
        } else {
            return response.data;
        }
    },
    (error) => {
        return Promise.reject(error.response);
    }
);
export default service;
