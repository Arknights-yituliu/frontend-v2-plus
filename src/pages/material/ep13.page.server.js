import axios from "axios";

import { http } from "/src/api/baseURL";

function get_newChapter() {
  return axios.get(http + "stage/chapter?expCoefficient=0.625&zone=13-");
}

// console.log(http+"stage/newChapter?zone=11-")

export async function onBeforeRender() {
  const result = await Promise.all([get_newChapter()]);
  const newChapter = result[0].data.data;
  const pageProps = { newChapter };
  return {
    pageContext: {
      pageProps,
    },
  };
}
