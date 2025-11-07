<script setup>
import { LinkedTable } from '/src/router/routes.js'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const open = ref([])

for (const module in LinkedTable) {
  open.value.push(module)
}

const route = useRoute()

const activePath = computed(() => normalizePath(route.path))

function normalizePath(path) {
  if (!path) return '/'
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

function isActive(path) {
  return normalizePath(path) === activePath.value
}
</script>
<template>
  <v-list v-model:opened="open" open-strategy="multiple" density="compact">
    <v-list-group v-for="(parent, module) in LinkedTable" v-show="parent.display" :key="module"
                  :value="module" class="drawer-navigation">
      <template v-slot:activator="{ props }">
        <v-list-item
            v-bind="props"
            color="primary">
          <div class="navigation-item-content">
            <v-icon :icon="parent.icon"></v-icon>
            <div class="navigation-item-content-spacer"></div>
            {{ parent.text }}
          </div>
        </v-list-item>
      </template>
      <router-link v-for="(child,index) in parent.child" :key="index"
                   :to="child.path" :href="child.path" class="router-link">
        <v-list-item
          color="primary"
          rounded
          :value="child.text"
          :active="isActive(child.path)"
        >
          <div class="navigation-item-content">
            <v-icon :icon="child.icon"></v-icon>
            <div class="navigation-item-content-spacer"></div>
            {{ child.text }}
          </div>
        </v-list-item>
      </router-link>
    </v-list-group>
  </v-list>
</template>
