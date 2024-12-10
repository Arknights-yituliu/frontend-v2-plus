<script setup>

import {ref} from "vue";

let sortBy = ref([{key: 'calories', order: 'asc'}],)
const headers = [
  {
    title: 'Dessert (100g serving)',
    align: 'start',
    sortable: false,
    key: 'name',
  },
  {title: 'Calories', key: 'calories'},
  {title: 'Fat (g)', key: 'fat'},
  {title: 'Carbs (g)', key: 'carbs'},
  {title: 'Protein (g)', key: 'protein'},
  {title: 'Iron (%)', key: 'iron'},
]
const desserts = [
  {
    name: 'Frozen Yogurt',
    calories: 200,
    fat: 6.0,
    carbs: 24,
    protein: 4.0,
    iron: '1%',
  },
  {
    name: 'Ice cream sandwich',
    calories: 200,
    fat: 9.0,
    carbs: 37,
    protein: 4.3,
    iron: '1%',
  },
  {
    name: 'Eclair',
    calories: 300,
    fat: 16.0,
    carbs: 23,
    protein: 6.0,
    iron: '7%',
  },
  {
    name: 'Cupcake',
    calories: 300,
    fat: 3.7,
    carbs: 67,
    protein: 4.3,
    iron: '8%',
  },
  {
    name: 'Gingerbread',
    calories: 400,
    fat: 16.0,
    carbs: 49,
    protein: 3.9,
    iron: '16%',
  },
  {
    name: 'Jelly bean',
    calories: 400,
    fat: 0.0,
    carbs: 94,
    protein: 0.0,
    iron: '0%',
  },
  {
    name: 'Lollipop',
    calories: 400,
    fat: 0.2,
    carbs: 98,
    protein: 0,
    iron: '2%',
  },
  {
    name: 'Honeycomb',
    calories: 400,
    fat: 3.2,
    carbs: 87,
    protein: 6.5,
    iron: '45%',
  },
  {
    name: 'Donut',
    calories: 500,
    fat: 25.0,
    carbs: 51,
    protein: 4.9,
    iron: '22%',
  },
  {
    name: 'KitKat',
    calories: 500,
    fat: 26.0,
    carbs: 65,
    protein: 7,
    iron: '6%',
  },
]


let open = ref(['Users'])
const admins = [
  ['Management', 'mdi-account-multiple-outline'],
  ['Settings', 'mdi-cog-outline'],
]
const cruds = [
  ['Create', 'mdi-plus-outline'],
  ['Read', 'mdi-file-outline'],
  ['Update', 'mdi-update'],
  ['Delete', 'mdi-delete'],
]

</script>


<template>
  <v-data-table
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="desserts"
  ></v-data-table>

  <pre>{{ sortBy }}</pre>

  <v-card
      class="mx-auto"
      width="300"
  >
    <v-list v-model:opened="open">
      <v-list-item prepend-icon="mdi-home" title="Home"></v-list-item>

      <v-list-group value="Users">
        <template v-slot:activator="{ props }">
          <v-list-item
              v-bind="props"
              prepend-icon="mdi-account-circle"
              title="Users"
          ></v-list-item>
        </template>

        <v-list-group value="Admin">
          <template v-slot:activator="{ props }">
            <v-list-item
                v-bind="props"
                title="Admin"
            ></v-list-item>
          </template>

          <v-list-item
              v-for="([title, icon], i) in admins"
              :key="i"
              :prepend-icon="icon"
              :title="title"
              :value="title"
          ></v-list-item>
        </v-list-group>

        <v-list-group value="Actions">
          <template v-slot:activator="{ props }">
            <v-list-item
                v-bind="props"
                title="Actions"
            ></v-list-item>
          </template>

          <v-list-item
              v-for="([title, icon], i) in cruds"
              :key="i"
              :prepend-icon="icon"
              :title="title"
              :value="title"
          ></v-list-item>
        </v-list-group>
      </v-list-group>
    </v-list>
  </v-card>

</template>






