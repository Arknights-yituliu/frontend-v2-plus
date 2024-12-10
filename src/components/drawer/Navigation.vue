<script setup >
import {LinkedTable} from "/src/router/routes.js";

import {ref,computed, watch} from "vue";



let open = ref([])

for(const module in LinkedTable){
  open.value.push(module)
}

</script>
<template>
  <v-list  v-model:opened="open" >
    <v-list-group v-for="(parent, module) in LinkedTable" v-show="parent.display" :key="module"
                  :value="module" class="drawer-navigation">
      <template v-slot:activator="{ props }">
        <v-list-item
            v-bind="props"
            color="primary">
          <div class="navigation-item-content">
            <v-icon :icon="parent.icon"></v-icon>
            <div class="navigation-item-content-spacer"></div>
            {{parent.text}}
          </div>

        </v-list-item>
      </template>

      <v-list-item
          v-for="(child,index) in parent.child" :key="index"
          color="primary"
          rounded
          :value="child.text"
          class="drawer-navigation-group-item">
        <router-link :to="child.path" :href="child.path" class="navigation-item-content">
          <v-icon :icon="child.icon"></v-icon>
          <div class="navigation-item-content-spacer"></div>
          {{child.text}}
        </router-link>

      </v-list-item>
    </v-list-group>
  </v-list>
</template>

