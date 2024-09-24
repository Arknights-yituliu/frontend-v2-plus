// 测试新干员还没有统计数据的情况
export const test = (statisticsMap) => {
  statisticsMap.delete('char_002_amiya')
}
// 遍历初始化干员数据的时候展示单个干员数据
export const showSingleInfo = (operatorData) => {
  // 缄默德克萨斯
  // charId === 'char_1028_texas2'
  console.log(`operatorData`, operatorData)
}
