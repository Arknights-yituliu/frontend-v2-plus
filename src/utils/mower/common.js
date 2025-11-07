export function swap(source, target, arr) {
  const temp = arr[source]
  arr[source] = arr[target]
  arr[target] = temp
}
