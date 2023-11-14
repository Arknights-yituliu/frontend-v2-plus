import axios from "axios";
import { http } from "/src/api/baseURL";

function get_perm() {
  return axios.get(http + "store/perm");
}

function get_act() {
  return axios.get(http + "store/act");
}

export async function onBeforeRender(pageContext) {
  const result = await Promise.all([get_perm(), get_act()]);
  const perm = result[0].data.data;
  const storeListFormat = [] // 常驻商店性价比集合
  const storeTypeList = [ // 常驻商店数据初始化格式
    { typeName: 'green', imgId: 4005, dividing: 0.8, tier: 0.024, borderColor: 'rgb(0, 162, 162)' },
    { typeName: 'yellow', imgId: 4004, dividing: 9.0, tier: 1.5, borderColor: 'rgb(251, 192, 45)' },
    { typeName: 'orange', imgId: 'EPGS_COIN', dividing: 1.22, tier: 0.05, borderColor: 'rgb(232, 93, 6)' },
    { typeName: 'purple', imgId: 'REP_COIN', dividing: 1.6, tier: 0.32, borderColor: 'rgb(163, 53, 238)' },
    { typeName: 'grey', imgId: 'SOCIAL_PT', dividing: 6.5, tier: 1.6, borderColor: 'rgb(160, 160, 160)' },
  ]
  const actStoreList = result[1].data.data; // 活动列表
  
  // 遍历常驻商店格式化数据
  for (let i = 0; i < storeTypeList.length; i++) {
    const item = storeTypeList[i]
    storeListFormat.push({
      ...item,
      itemList: perm[item.typeName]
    })
  }

  // 遍历活动列表
  actStoreList.forEach(act => {
    // 格式化活动商店材料
    if (!act.actStoreFormat) act.actStoreFormat = []
    // 商店区域(通常为三个区域)
    const areas = [...new Set(act.actStore.map(t => t.itemArea))].sort()
    // 每个区域独立数组
    areas.forEach(areaNo => {
      const areaItems = act.actStore.filter(item => item.itemArea === areaNo)
      act.actStoreFormat.push(areaItems)
    })
  })

  const pageProps = { actStoreList, storeListFormat };
  return {
    pageContext: {
      pageProps,
    },
  };
}
