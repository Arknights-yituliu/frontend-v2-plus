<template>
  <el-row>
    <el-col :span="12">
      <div class="grid-content ep-bg-purple">
        <el-upload class="avatar-uploader" action="https://run.mocky.io/v3/9d059bf9-4660-45f2-925d-ce80ad6c4d15"
          :show-file-list="false" :on-success="handleAvatarSuccess" :before-upload="beforeAvatarUpload">
          <img v-if="imageUrl" :src="imageUrl" class="avatar" />
          <el-icon v-else class="avatar-uploader-icon">
            <Plus />
          </el-icon>
        </el-upload>

        <el-input v-model="id" style="width: 240px" placeholder="ID" />
        <el-switch v-model="dhy" class="mb-2" active-text="大会员" />

        <div class="block">
          <span class="demonstration"></span>
          <el-date-picker v-model="date" type="date" placeholder="选择日期" :disabled-date="disabledDate"
            :shortcuts="shortcuts" />
        </div>
        <el-input v-model="text" style="width: 240px" :rows="2" type="textarea" placeholder="Please input" />
      </div>
    </el-col>
    <el-col :span="12">
      <div class="grid-content ep-bg-purple-light">
        <img :src=imgurl>
        {{ imgurl }}
      </div>
    </el-col>
  </el-row>

</template>


<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

import type { UploadProps } from 'element-plus'


const handleAvatarSuccess: UploadProps['onSuccess'] = (
  response,
  uploadFile
) => {
  imageUrl.value = URL.createObjectURL(uploadFile.raw!)
}

const imageUrl = ref('')
const id = ref('')
const date = ref('')
const text = ref('')

const dhy = ref(true)

const beforeAvatarUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (rawFile.type !== 'image/jpeg') {
    ElMessage.error('Avatar picture must be JPG format!')
    return false
  } else if (rawFile.size / 1024 / 1024 > 2) {
    ElMessage.error('Avatar picture size can not exceed 2MB!')
    return false
  }
  return true
}
</script>

<style scoped>
.avatar-uploader .avatar {
  width: 178px;
  height: 178px;
  display: block;
}
</style>

<style>
.avatar-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.el-icon.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
}
</style>