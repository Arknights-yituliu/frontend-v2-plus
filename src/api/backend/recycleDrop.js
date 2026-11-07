import request from "/src/api/backend/request";

/**
 * 回收站产出统计接口（后端暂未出文档，依据 RecycleDropController 实现）。
 *
 * GET /recycle-drop/statistics?key=xxx
 * 鉴权：key 明文由服务端做 SHA-256 后与内置摘要比对，缺失或不匹配返回无访问权限（code 80001）。
 * 返回：{ startDay, endDay, items: [{ itemId, quantity, times }] }
 *   - startDay / endDay：这批统计数据覆盖的日期范围（yyyy-MM-dd），无数据时为 null
 *   - items[].quantity：该物品在全部未过期统计日内的产出总次数
 *   - items[].times：全部物品的记录条数总和，所有物品取到相同的值，作为掉率分母
 */
export default {
    statistics(key) {
        return request({
            url: "/recycle-drop/statistics",
            method: "GET",
            params: {key}
        })
    },
}
