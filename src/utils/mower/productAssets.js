// Shared by the schedule editor and income calculator; keep a single copy of each image.
export function mowerProductImage(product) {
  const icon = product === "orirock_device" ? "orirock" : product;
  return ["gold", "exp3", "lmd", "orirock", "orundum"].includes(icon) ? `/mower-income/product/${icon}.png` : "";
}
