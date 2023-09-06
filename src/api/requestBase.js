import axios from "axios";
import { http } from "@/api/baseURL";

// 创建axios实例
const service = axios.create({
    baseURL: http,
    timeout: 150000, // 请求超时时间
});


export default service;