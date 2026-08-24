// 是否使用本地端口：npm run dev:local 会设置 VITE_USE_LOCAL=1（本地调试），否则使用线上域名
const useLocal = import.meta.env.VITE_USE_LOCAL === '1';

// 旧系统后端域名
const DOMAIN = useLocal ? "http://127.0.0.1:10010/" : "https://backend.yituliu.cn/";

// UC（用户中心）根域名：直连登录时前端凭证直接提交到该域，不经过旧系统后端
const UC_DOMAIN = useLocal ? "http://127.0.0.1:8080" : "https://orange.yituliu.cn";

export { DOMAIN, UC_DOMAIN };
