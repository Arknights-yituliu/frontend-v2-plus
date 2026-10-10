export function swap(source, target, arr) {
  const temp = arr[source]
  arr[source] = arr[target]
  arr[target] = temp
}

import { match } from 'pinyin-pro'
export function pinyin_match(text, pinyin) { return match(text, pinyin.replaceAll('v', 'ü')) }
