<script setup>

const props = defineProps({
  btnText:{
    type:String,
    default:''
  },
  active:{
    type:Boolean,
    default:''
  }
})


</script>

<template>
  <v-btn  variant="outlined" size="small" :color="active?'primary':'red'" class="m-4" >
    <template v-slot:prepend>
      <v-icon :color="active?'success':'red'" :icon="active?'mdi-check':'mdi-close'"></v-icon>
    </template>
        {{btnText}}
  </v-btn>
</template>