import axios from "axios";
import { http } from "@/api/baseURL";

function get_perm() {
  return axios.get(http + "store/perm");
}

function get_act() {
  return axios.get(http + "store/act");
}

export async function onBeforeRender(pageContext) {
  const result = await Promise.all([get_perm(), get_act()]);
  const perm = result[0].data.data;
  const act = result[1].data.data;
  const pageProps = { perm, act };
  return {
    pageContext: {
      pageProps,
    },
  };
}
