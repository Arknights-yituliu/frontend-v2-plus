import axios from "axios";

export async function onBeforeRender(pageContext) {
  const response = await axios.get("https://backend.yituliu.site/store/pack-gacha/");
  const pack_data = await response.data.data;
  const pageProps = { pack_data };
  return {
    pageContext: {
      pageProps,
    },
  };
}
