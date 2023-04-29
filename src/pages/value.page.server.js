import axios from "axios";

const http = "https://backend.yituliu.site/";

// const http = "http://127.0.0.1:10012/";

function get_value() {
  return axios.get(http + "item/value?expCoefficient=0.625");
}

// console.log(http+"stage/newChapter?zone=11-")

export async function onBeforeRender(pageContext) {
  const result = await get_value();
  const value = result.data.data;
  const pageProps = { value };
  return {
    pageContext: {
      pageProps,
    },
  };
}
