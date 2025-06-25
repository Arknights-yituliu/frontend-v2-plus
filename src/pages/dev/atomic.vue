<script setup>

let margin = ''
let padding = ''
for (let i = 4; i < 40; i += 4) {
  margin += `.m-${i} {margin: ${i}px;}`
  padding += `.p-${i} {padding: ${i}px;}`
}
for (let i = 4; i < 40; i += 4) {
  margin += `.m-a-${i} {margin:auto ${i}px;}`
}
for (let i = 4; i < 40; i += 4) {
  margin += `.m-${i}-a {margin: ${i}px auto;}`
}
for (let i = 4; i < 40; i += 4) {
  margin += `.m-${i}-0 {margin: ${i}px 0;}`
  padding += `.p-${i}-0 {padding: ${i}px 0;}`
}
for (let i = 4; i < 40; i += 4) {
  margin += `.m-0-${i} {margin:0 ${i}px;}`
  padding += `.p-0-${i} {padding: 0 ${i}px;}`
}

console.log(margin)
console.log(padding)

</script>
<template></template>