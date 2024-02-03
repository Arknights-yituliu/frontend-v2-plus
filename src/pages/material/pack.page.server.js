import axios from "axios";
import {http} from '/src/api/baseURL'
export async function onBeforeRender(pageContext) {
  console.log(`${http}store/pack`)
  const response = await axios.get(`${http}store/pack`);
  const data = await response.data.data;
  const pageProps = { data };
  return {
    pageContext: {
      pageProps,
    },
  };
}
