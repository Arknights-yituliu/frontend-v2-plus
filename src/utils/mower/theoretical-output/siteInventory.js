import {onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch} from 'vue'
import {listAkAccounts, getAkAccountOperators} from '/src/api/user-center/userCenterApi.js'
import {userInfo} from '/src/api/backend/userSession.js'
import {ensureUcToken, refreshUcToken, clearUcToken} from '/src/utils/user/ucToken.js'
import {latestMowerSiteAccount, mapUcMowerInventory} from './siteInventoryMapping.js'

function currentSession() {
  const token = localStorage.getItem('USER_TOKEN')
  return {token: token && !['null', 'undefined'].includes(token) ? token : null, uid: localStorage.getItem('UID')}
}

function sameSession(left, right) {
  return left.token === right.token && left.uid === right.uid
}

/** The same latest imported UC account as My Operators, with no cross-account snapshot cache. */
export function useMowerSiteInventory() {
  const entries = ref(null), status = ref('loading'), error = ref('')
  const accountLabel = ref(''), updatedAt = ref(null)
  // Other pages may still have an exchange/refresh from the preceding login in flight.
  // Verify the credential on first mount too, before any account data is requested.
  let requestId = 0, mounted = false, active = true, disposed = false, replaceToken = true
  let session = currentSession()

  function clear(nextStatus) {
    entries.value = null
    accountLabel.value = ''
    updatedAt.value = null
    error.value = ''
    status.value = nextStatus
  }

  function syncSession() {
    const latest = currentSession()
    if (sameSession(session, latest)) return false
    session = latest
    requestId++
    replaceToken = true
    // UC's in-memory token cache must not retain the preceding account after a tab switch.
    clearUcToken()
    clear(latest.token ? 'loading' : 'unauthenticated')
    return true
  }

  async function reload() {
    if (disposed || !active) return
    syncSession()
    const snapshot = currentSession(), id = ++requestId
    clear(snapshot.token ? 'loading' : 'unauthenticated')
    if (!snapshot.token) return
    const current = () => !disposed && active && id === requestId && sameSession(snapshot, currentSession())
    try {
      // ensureUcToken checks its cache before its shared issuingPromise. Clear first so
      // even a cached current token cannot hide an older account's pending exchange.
      if (replaceToken) clearUcToken()
      let token = await ensureUcToken()
      if (!current()) return
      if (replaceToken) {
        // The shared helpers deduplicate exchanges/refreshes. Drain a preceding session's
        // pending operation before clearing its result and obtaining a current-session token.
        await refreshUcToken().catch(() => null)
        if (!current()) return
        clearUcToken()
        replaceToken = false
        token = await ensureUcToken()
        if (!current()) return
      }
      if (!token) throw new Error('无法读取一图流干员库，请重新登录后重试')
      const account = latestMowerSiteAccount(await listAkAccounts())
      if (!current()) return
      if (!account) {
        entries.value = []
        status.value = 'empty'
        return
      }
      const payload = await getAkAccountOperators(account.akUid)
      if (!current()) return
      const normalized = mapUcMowerInventory(payload, account.akUid)
      entries.value = normalized
      accountLabel.value = `游戏账号 UID ${account.akUid}`
      updatedAt.value = typeof account.updateTime === 'string' ? account.updateTime : null
      status.value = normalized.length ? 'ready' : 'empty'
    } catch (cause) {
      if (!current()) return
      clear('error')
      error.value = cause instanceof Error ? cause.message : '一图流干员库读取失败，请重试'
    } finally {
      if (!disposed && active && syncSession()) void reload()
    }
  }

  function sessionChanged() {
    if (syncSession() && mounted && active) void reload()
  }
  function onStorage(event) {
    if (event.key === 'USER_TOKEN' || event.key === 'UID' || event.key === null) sessionChanged()
  }
  function onFocus() {
    // A return from My Operators may have imported a newer game account under the same login.
    if (mounted && active) void reload()
  }
  const stop = watch(() => [userInfo.value.uid, userInfo.value.token, userInfo.value.status], sessionChanged)
  onMounted(() => {
    mounted = true
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    void reload()
  })
  onDeactivated(() => {active = false; requestId++})
  onActivated(() => {
    const reactivating = !active
    active = true
    if (mounted && reactivating) void reload()
  })
  onBeforeUnmount(() => {
    disposed = true
    requestId++
    stop()
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('focus', onFocus)
  })
  return {entries, status, error, accountLabel, updatedAt, reload}
}
