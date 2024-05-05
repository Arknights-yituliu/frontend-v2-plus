<script setup>



</script>


<template>
  <div>

  </div>
  <div>

  </div>

</template>

<style scoped>
.container1 {

  display: flex;

  flex-direction: row;

  position: relative;

}


@media (max-width: 1000px) {

  .container1 {

    display: grid;

    grid-template-rows: auto 1fr; /* 第一组高度自适应，第二组占据剩余空间 */

    grid-gap: 20px; /* 可以根据需要调整两组之间的间距 */

  }


  .group1 {

    position: sticky;

    top: 20px;

    z-index: 1; /* 确保第一组元素位于第二组之上 */

  }

}


.group1 {
  position: sticky;

  top: 20px;
  height: 1px;
  z-index: 1; /* 确保第一组元素位于第二组之上 */
  /* 在大屏幕下，a元素的相关样式 */

}


.group2 {

  display: flex;

  flex-direction: column; /* 小屏幕下，b和c元素纵向排列 */

}


.a{
  background-color: palevioletred;
  width: 600px;

}

.b{
  background-color: #00a2a2;
  width: 600px;
  height: 1000px;
}

.c{
  background-color: #00a1d6;
  width: 600px;
  height: 1000px;
}

</style>




