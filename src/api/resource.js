import request from "/src/api/request";
import requestBase from "/src/api/requestBase.js";

export default {
    getOperatorTableByCOS(tag) {
        return requestBase({
            url: `https://cos.yituliu.cn/gamedata/character_table.json`,
            method: "get"
        });
    },
}