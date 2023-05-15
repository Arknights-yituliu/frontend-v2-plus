<template>
  <div class="popup_mask">
    <div class="popup"></div>
  </div>
</template>

<style scoped>
.popup_mask {
  position: fixed;
  z-index: 30;
  width: 100%;
  height: 2000px;
  background-color: rgba(0, 0, 0, 0.7);
  display: none;
}

.popup {
  display: none;
  position: fixed;
  right: 0;
  left: 0;
  z-index: 50;
  margin: auto;
  margin-top: 100px;
  width: 450px;
  height: 160px;
  background-color: rgba(255, 255, 255);
  border-radius: 6px;
}

</style>
