## 弹窗 c-popup

```
<template>
<c-popup v-model="visible" :width="'500px'" :height="'500px'">
  弹窗内容
</c-popup>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const visible = ref(true)
</script>
```

### v-model

声明一个响应式 visible ,通过v-model绑定, visible 的状态为true时,显示弹窗,点击弹窗后面的遮罩层会关闭弹窗,同时触发一个事件,将
visible 赋值为false

### width

可改变弹窗宽度

### height

可改变弹窗高度

--- 

## 按钮 c-button

```
<template>
<c-button :color="'blue'" :status="status" :style="'width:20px'">
  按钮描述
</c-button>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const status = ref(true)

</script>
```

### status

声明一个响应式 status ,传入status,当status的状态为true时,按钮根据:color的传入的颜色进行改变

### color

有 red blue green三种颜色

### style

可以给按钮传入自定义样式

--- 

## 无头折叠栏 c-collapse-item

这是一个不靠标题栏控制的折叠栏

```
<template>
<c-collapse-item :name="'item'" :visible="visible"  :style="'width:20px'">
  折叠栏内容
</c-collapse-item>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(true)

</script>
```

### name

传入一个字符串名称对弹窗进行区分,必传 </br>

### visible

声明一个响应式 visible ,传入:visible, visible 的状态为true/false时,展开/收起折叠栏

### style

可以给按钮传入自定义样式

--- 

## 折叠栏 c-collapse

```
<template>
    <c-collapse :name="'item'" :visible="visible"  :style="'width:20px'">
        <template #title>
            标题
        </template>
        
            内容
    </c-collapse>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const visible = ref(true)

</script>
```

### name

传入一个字符串名称对弹窗进行区分,必传 </br>

### visible

声明一个响应式 visible ,传入:visible, visible 的状态为true/false时,展开/收起折叠栏

### style

声明一个响应式 visible ,传入:visible, visible 的状态为true/false时,展开/收起折叠栏


## 消息通知 cMessage
```

<script lang="ts" setup>
import {cMessage} from "/src/custom/message";

cMsssage('通知内容',类型,持续时间)

</script>
```

类型不填默认普通通知,可填error,
持续时间以毫秒为单位传入,比如4000

