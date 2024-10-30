import request from "/src/api/request";
export default {
    uploadRogueSeed(data) {
        const token = `Bearer ${localStorage.getItem("USER_TOKEN")}`
        return request({
            headers:{"test":'11',Authorization:token},
            url: `auth/rogue-seed/upload`,
            method: "post",
            data:data
        });
    },

    getRogueSeedPage(data) {
        const token = `Bearer ${localStorage.getItem("USER_TOKEN")}`
        return request({
            headers:{Authorization:token},
            url: `auth/rogue-seed/list`,
            method: "post",
            data:data
        });
    },
}