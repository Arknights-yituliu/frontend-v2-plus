<script setup>
import { computed } from 'vue'
import { mowerPlanStore } from '../store/planStore.js'
import { renderOperatorLabel, renderOperatorTag } from '@/utils/mower/opSelect.js'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const options = computed(() => mowerPlanStore.operators.value ?? [])

function update(value) {
  emit('update:modelValue', value)
}
</script>

<template>
  <n-select
    :disabled="disabled"
    multiple
    filterable
    :options="options"
    :placeholder="placeholder"
    :value="modelValue"
    :render-label="renderOperatorLabel"
    :render-tag="renderOperatorTag"
    @update:value="update"
  />
</template>
