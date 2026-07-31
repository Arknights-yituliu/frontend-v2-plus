const PORTRAIT_BASE_URL = 'https://torappu.prts.wiki/assets/char_portrait'
const PORTRAIT_DB_NAME = 'logicalByteYieldOverview'
const PORTRAIT_STORE_NAME = 'operatorPortraits'

let portraitDbPromise = null

export function getYieldOverviewAutoPortraitUrl(charId) {
  return charId ? `${PORTRAIT_BASE_URL}/${charId}_1.png` : ''
}

export async function getYieldOverviewStoredPortrait(charId) {
  if (!charId) {
    return null
  }

  const database = await openPortraitDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PORTRAIT_STORE_NAME, 'readonly')
    const request = transaction.objectStore(PORTRAIT_STORE_NAME).get(charId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('立绘读取失败'))
  })
}

export async function saveYieldOverviewStoredPortrait(charId, file) {
  const database = await openPortraitDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PORTRAIT_STORE_NAME, 'readwrite')
    transaction.objectStore(PORTRAIT_STORE_NAME).put({
      charId,
      file,
      fileName: file.name,
      updatedAt: Date.now(),
    })
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('立绘保存失败'))
    transaction.onabort = () => reject(transaction.error || new Error('立绘保存失败'))
  })
}

export async function deleteYieldOverviewStoredPortrait(charId) {
  const database = await openPortraitDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PORTRAIT_STORE_NAME, 'readwrite')
    transaction.objectStore(PORTRAIT_STORE_NAME).delete(charId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('立绘删除失败'))
    transaction.onabort = () => reject(transaction.error || new Error('立绘删除失败'))
  })
}

function openPortraitDatabase() {
  if (portraitDbPromise) {
    return portraitDbPromise
  }

  portraitDbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('当前浏览器不支持 IndexedDB'))
      return
    }

    const request = window.indexedDB.open(PORTRAIT_DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(PORTRAIT_STORE_NAME)) {
        database.createObjectStore(PORTRAIT_STORE_NAME, { keyPath: 'charId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('立绘数据库打开失败'))
  })

  portraitDbPromise.catch(() => {
    portraitDbPromise = null
  })
  return portraitDbPromise
}
