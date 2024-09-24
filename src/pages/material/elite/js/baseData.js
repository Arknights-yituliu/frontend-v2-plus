import { useMaterialMaps } from './maps'

const { baseMaterialIdMap } = useMaterialMaps()
const LMDId = baseMaterialIdMap.get('龙门币')
const barWidth = 50; // 柱状图宽
const barHeight = 400; // 柱状图高
const noModIcon = new URL(`../imgs/no_mod_icon_128.png`, import.meta.url).href // 无模组图片的图标

// 星级列表
const rarityList = [
  { label: '★1', value: 1 },
  { label: '★2', value: 2 },
  { label: '★3', value: 3 },
  { label: '★4', value: 4 },
  { label: '★5', value: 5 },
  { label: '★6', value: 6 },
]

export const useBaseData = () => {
  return {
    LMDId,
    barWidth,
    barHeight,
    rarityList,
    noModIcon,
  }
}