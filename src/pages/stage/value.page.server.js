import axios from "axios";
import {http} from '@/api/baseURL'

function get_value() {
  return axios.get(http + "item/value?expCoefficient=0.625");
}

console.log(http + "item/value?expCoefficient=0.625");

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
