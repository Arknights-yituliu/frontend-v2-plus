<script setup>



</script>


<template>
  <div class="my-chart-box" style="width:600px;margin:auto;">
    <div class="pie-title">图表标题</div>
    <div style="float:left;">
      <div class="pie" >
        <div class="area">
          <div class="area-item area-4">
            <div class="part color4" style="transform:rotate(0deg);"></div>
            <div class="part color5" style="transform:rotate(30deg);"></div>
          </div>
          <div class="area-item area-1">
            <div class="part color1" style="transform:rotate(0deg);"></div>
            <div class="part color2" style="transform:rotate(30deg);"></div>
          </div>
        </div>
        <div class="area">
          <div class="area-item area-3">
            <div class="part color3" style="transform:rotate(0deg);"></div>
            <div class="part color4" style="transform:rotate(30deg);"></div>
          </div>
          <div class="area-item area-2">
            <div class="part color2" style="transform:rotate(0deg);"></div>
            <div class="part color3" style="transform:rotate(30deg);"></div>
          </div>
        </div>
        <div class="pie-blank"></div>
      </div>
    </div>
    <div class="legend">
      <div class="legend-item">
        <div class="color1 icon">12</div>
        <text>项目名称</text>
      </div>
      <div class="legend-item">
        <div class="color2 icon">12</div>
        <text>项目名称</text>
      </div>
      <div class="legend-item">
        <div class="color3 icon">12</div>
        <text>项目名称</text>
      </div>
      <div class="legend-item">
        <div class="color4 icon">12</div>
        <text>项目名称</text>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-chart-box { margin: 20px; min-height: 440px; background: #fff; border-radius: 10px; margin-top: 30px; padding-top: 10px; position: relative; }
.pie-title { line-height: 60px; text-align: center; font-size: 32px; }
.pie { width: 180px; height: 180px; border-radius: 50%; display: block; overflow: hidden; margin: 0px; position: relative; padding: 0px; }
.pie .area { display: flex; height: 50%; width: 100%;overflow: hidden; margin: 0px; padding: 0px; }
.pie .area-item { flex: 1; height: 90px; overflow: hidden; position: relative; }

.pie .area-1 .part { transform-origin: left bottom; }
.pie .area-2 .part { transform-origin: left top; }
.pie .area-3 .part { transform-origin: right top; }
.pie .area-4 .part { transform-origin: right bottom; }
.pie .part { width: 100%; height: 100%; position: absolute; left: 0; top: 0; }
.pie-blank { width: 110px; height: 110px; position: absolute; left: 35px; top: 35px; border-radius: 50%; z-index: 50; background: #fff; }
.legend { margin-right: 10px; line-height: 40px; padding-top: 0px; position: absolute; right: 10px; top: 60px; height: 300px; overflow: auto; }
.legend .legend-item { padding-top: 10px; clear: both; }
.legend .legend-item text { float: right; font-size: 28px; }
.legend .legend-item .icon { width: 80px; height: 40px; display: inline-block; border-radius: 10px; float: right; margin-left: 10px; text-align: center; color: #fff; }

.color1 { background: #dd6b66; }
.color2 { background: #759aa0; }
.color3 { background: #e69d87; }
.color4 { background: #8dc1a9; }
.color5 { background: #ea7e53; }
.color6 { background: #ea7e53; }
.color7 { background: #73a373; }
.color8 { background: #73a373; }
.color9 { background: #7289ab; }
.color10 { background: #91ca8c; }
.color11 { background: #f49f42; }
</style>




