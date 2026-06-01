import axios from "axios";

const statHarborService = axios.create({
    baseURL: "https://udu.yituliu.cn",
    timeout: 150000,
    headers: {
        "Content-Type": "application/json",
        "Authorization": "yituliu im19fv1m1jcmc1mo",
    },
});

const STAT_HARBOR_META = {
    projectKey: "ArknightsMHV2",
    version: "1.0",
    source: "yituliuWeb",
};

function uploadRecord(data) {
    return statHarborService({
        url: "/v1/records",
        method: "post",
        data,
    }).then((response) => {
        if (response.data?.code !== 200) {
            return Promise.reject(response.data);
        }
        return response.data;
    });
}

function buildStatHarborRecord(category, payload) {
    return {
        ...STAT_HARBOR_META,
        category,
        capturedAt: String(Date.now()),
        payload,
    };
}

function uploadStatHarborRecord(category, payload) {
    return uploadRecord(buildStatHarborRecord(category, payload));
}

function buildAlchemyResultRecord(payload) {
    return buildStatHarborRecord("AlchemyResult", payload);
}

function uploadAlchemyResult(payload) {
    return uploadStatHarborRecord("AlchemyResult", payload);
}

function buildMHDropResultRecord(payload) {
    return buildStatHarborRecord("MHDropResult", payload);
}

function uploadMHDropResult(payload) {
    return uploadStatHarborRecord("MHDropResult", payload);
}

export {
    buildAlchemyResultRecord,
    buildMHDropResultRecord,
    buildStatHarborRecord,
    uploadAlchemyResult,
    uploadMHDropResult,
    uploadStatHarborRecord,
};
