import request from "/src/api/request";
export default {
    uploadRougeSeed(data) {
        const token = `Bearer ${localStorage.getItem("USER_TOKEN")}`
        return request({
            headers:{"test":'11',Authorization:token},
            url: `auth/rouge-seed/upload`,
            method: "post",
            data:data
        });
    },
}