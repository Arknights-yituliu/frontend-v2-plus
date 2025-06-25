// 自定义指令 - 滚动加载更多
export const vLoadmore = {
  mounted: (el, binding) => {
    const selectWrap = el.querySelector(".el-scrollbar__wrap");
    selectWrap.addEventListener("scroll", (e) => {
      const {scrollHeight, scrollTop, clientHeight} = selectWrap;
      if (scrollHeight - scrollTop - 160 <= clientHeight) {
        binding.value();
      }
    });
  },
  unmounted: (el, binding) => {
    const selectWrap = el.querySelector('.el-scrollbar__wrap');
    if (selectWrap) {
      selectWrap.removeEventListener('scroll', binding.value);
    }
  }
};