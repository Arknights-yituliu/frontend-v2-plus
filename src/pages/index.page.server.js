import axios from "axios";
import { http } from "@/api/baseURL";


const expCoefficient = 0.625
const sampleSize = 300

function get_t3() {
  return axios.get(  `${http}stage/t3/v2?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`);
}

function get_t2() {
  return axios.get(`${http}stage/t2/v2?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`);
}

function get_orundum() {
  return axios.get(`${http}stage/orundum?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`);
}

function get_closed() {
  return axios.get(`${http}stage/act?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`);
}

export async function onBeforeRender(pageContext) {
  const result = await Promise.all([get_t3(), get_t2(), get_orundum(), get_closed()]);
  const t3 = result[0].data.data;
  const t2 = result[1].data.data;
  const orundum = result[2].data.data;
  const closed = result[3].data.data;
  const pageProps = { t3, t2, orundum, closed };
  return {
    pageContext: {
      pageProps,
    },
  };
}
