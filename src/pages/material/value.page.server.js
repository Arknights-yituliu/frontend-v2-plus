import axios from "axios";
import { http } from "/src/api/baseURL";

const expCoefficient = 0.625
const sampleSize = 300

function get_value() {
  return axios.get(http + `item/value?expCoefficient=${expCoefficient}&sampleSize=${sampleSize}`);
}


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
