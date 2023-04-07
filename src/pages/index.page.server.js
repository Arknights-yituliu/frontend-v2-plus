import axios from "axios";

const http = "https://backend.yituliu.site/";

// const http = "http://127.0.0.1:10012/";

function get_t3() {
  return axios.get(http+"stage/t3?expCoefficient=0.625");
}

function get_t2() {
  return axios.get(http+"stage/t2?expCoefficient=0.625");
}

function get_orundum() {
  return axios.get(http+"stage/orundum");
}

function get_closed() {
  return axios.get(http+"stage/closed?expCoefficient=0.625");
}

function get_perm() {
  return axios.get(http+"store/perm");
}

function get_act() {
  return axios.get(http+"store/act");
}

function get_value() {
  return axios.get(http+"item/value?expCoefficient=0.625");
}

function get_newChapter() {
  return axios.get(http+"stage/newChapter?zone=12-");
}

// console.log(http+"stage/newChapter?zone=11-")

export async function onBeforeRender(pageContext) {
  const result = await Promise.all([
    get_t3(),
    get_t2(),
    get_orundum(),
    get_closed(),
    get_perm(),
    get_act(),
    get_value(),
    get_newChapter(),
  ]);
  const t3 = result[0].data.data;
  const t2 = result[1].data.data;
  const orundum = result[2].data.data;
  const closed = result[3].data.data;
  const perm = result[4].data.data;
  const act = result[5].data.data;
  const value = result[6].data.data;
  const newChapter = result[7].data.data;
  const pageProps = { t3, t2, orundum, closed, perm, act, value, newChapter};
  return {
    pageContext: {
      pageProps,
    },
  };
}
