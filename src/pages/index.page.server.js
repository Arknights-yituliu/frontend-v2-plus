import axios from "axios";

function get_t3() {
  return axios.get("https://backend.yituliu.site/api/find/stage/t3?expCoefficient=0.625");
}

function get_t2() {
  return axios.get("https://backend.yituliu.site/api/find/stage/t2?expCoefficient=0.625");
}

function get_orundum() {
  return axios.get("https://backend.yituliu.site/api/find/stage/orundum");
}

function get_closed() {
  return axios.get("https://backend.yituliu.site/api/find/stage/closed?expCoefficient=0.625");
}

function get_perm() {
  return axios.get("https://backend.yituliu.site/api/find/store/perm");
}

function get_act() {
  return axios.get("https://backend.yituliu.site/api/find/store/act");
}

function get_value() {
  return axios.get("https://backend.yituliu.site/api/find/item/value?expCoefficient=0.625");
}

export async function onBeforeRender(pageContext) {
  const result = await Promise.all([
    get_t3(),
    get_t2(),
    get_orundum(),
    get_closed(),
    get_perm(),
    get_act(),
    get_value(),
  ]);
  const t3 = result[0].data.data;
  const t2 = result[1].data.data;
  const orundum = result[2].data.data;
  const closed = result[3].data.data;
  const perm = result[4].data.data;
  const act = result[5].data.data;
  const value = result[6].data.data;
  const pageProps = { t3, t2, orundum, closed, perm, act, value };
  return {
    pageContext: {
      pageProps,
    },
  };
}
