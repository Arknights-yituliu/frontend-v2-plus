import axios from "axios";

// const http = "https://backend.yituliu.site/";

const http = "http://127.0.0.1:10010/";

function get_newChapter() {
  return axios.get(http + "stage/chapter?expCoefficient=0.625&zone=12-");
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
