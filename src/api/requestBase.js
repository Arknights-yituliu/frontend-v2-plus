import axios from "axios";
import { DOMAIN } from "/src/api/BASE_URL";

// 创建axios实例
const service = axios.create({
    baseURL: DOMAIN,
    timeout: 15000, // 请求超时时间
});


export default service;