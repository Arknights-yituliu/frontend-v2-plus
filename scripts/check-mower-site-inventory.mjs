import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {latestMowerSiteAccount, mapUcMowerInventory, mapSiteMowerInventory} from '../src/utils/mower/theoretical-output/siteInventoryMapping.js'

const uid = '12345678'
const uc = items => ({akUid: uid, items})
const card = (id, evolvePhase, level) => ({id, evolvePhase, level, rarity: 5, potentialRank: 2, mainSkillLevel: 7})

assert.deepEqual(latestMowerSiteAccount([{akUid: uid, updateTime: '2026-10-02'}, {akUid: '87654321'}]), {akUid: uid, updateTime: '2026-10-02'})
assert.equal(latestMowerSiteAccount([]), null)
assert.throws(() => latestMowerSiteAccount({items: []}), /列表格式/)
assert.throws(() => latestMowerSiteAccount([{akUid: null}]), /UID/)
assert.deepEqual(mapUcMowerInventory(uc([card('char_002_amiya', 1, 12), card('char_103_angel', 0, 1)]), uid), [
  {operator: 'char_002_amiya', elitePhase: 1, level: 12},
  {operator: 'char_103_angel', elitePhase: 0, level: 1},
])
assert.deepEqual(mapUcMowerInventory(uc([]), uid), [])
assert.deepEqual(mapSiteMowerInventory([
  {charId: 'char_002_amiya', elite: 0, level: 30, own: true},
  {charId: 'char_103_angel', elite: 0, level: 0, own: false},
  {charId: 'char_999_future', elite: 2, level: 90, own: true},
]), [{operator: 'char_002_amiya', elitePhase: 0, level: 30}, {operator: 'char_999_future', elitePhase: 2, level: 90}])
assert.deepEqual(mapUcMowerInventory(uc([
  card('char_002_amiya', 1, 70), card('char_1001_amiya2', 2, 1), card('char_1037_amiya3', 2, 20),
]), uid), [{operator: 'char_002_amiya', elitePhase: 2, level: 20}])
assert.deepEqual(mapUcMowerInventory(uc([card('char_1001_amiya2', 2, 20), card('char_002_amiya', 1, 70)]), uid), [
  {operator: 'char_002_amiya', elitePhase: 2, level: 20},
])
for (const payload of [null, [], {}, {akUid: uid}, {akUid: uid, items: null}, {akUid: uid, items: {}}, {items: []}]) {
  assert.throws(() => mapUcMowerInventory(payload, uid))
}
assert.throws(() => mapUcMowerInventory({akUid: '87654321', items: []}, uid), /账号不一致/)
assert.throws(() => mapUcMowerInventory(uc([card('char_103_angel', 0, 1), card('char_103_angel', 1, 1)]), uid), /重复/)
assert.throws(() => mapUcMowerInventory(uc([card('char_1001_amiya2', 1, 1), card('char_1001_amiya2', 2, 1)]), uid), /重复/)
for (const row of [null, [], {}, card('Exusiai', 0, 1), card('char_103_angel', null, 1), card('char_103_angel', '0', 1),
  card('char_103_angel', 3, 1), card('char_103_angel', 0, null), card('char_103_angel', 0, '1'),
  card('char_103_angel', 0, 91), {...card('char_103_angel', 0, 1), own: 'false'}]) {
  assert.throws(() => mapUcMowerInventory(uc([row]), uid))
}
assert.throws(() => mapSiteMowerInventory([card('char_103_angel', 0, 1)]), /ID/)

// Run the production composable against deterministic Vue lifecycle/network boundaries.
// The lifecycle shims only capture callbacks; all request/session logic remains the real source.
const source = (await readFile(new URL('../src/utils/mower/theoretical-output/siteInventory.js', import.meta.url), 'utf8'))
  .replace(/^import[^\n]*\n/gm, '').replace('export function useMowerSiteInventory', 'function useMowerSiteInventory')
const dependencyNames = ['ref', 'watch', 'onActivated', 'onDeactivated', 'onMounted', 'onBeforeUnmount',
  'listAkAccounts', 'getAkAccountOperators', 'userInfo', 'ensureUcToken', 'refreshUcToken', 'clearUcToken',
  'latestMowerSiteAccount', 'mapUcMowerInventory', 'localStorage', 'window']
const createInventory = new Function(...dependencyNames, `${source}\nreturn useMowerSiteInventory()`)
const flush = () => new Promise(resolve => setImmediate(resolve))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {resolve = yes; reject = no})
  return {promise, resolve, reject}
}
function fixture(overrides = {}, initialSession = {token: 'session-a', uid: '11'}) {
  const storage = new Map([['USER_TOKEN', initialSession.token], ['UID', initialSession.uid]]), hooks = {}, listeners = new Map()
  const dependencies = {
    ref: value => ({value}), watch: (getter, callback) => {hooks.watch = callback; return () => {}},
    onActivated: callback => {hooks.activate = callback}, onDeactivated: callback => {hooks.deactivate = callback},
    onMounted: callback => {hooks.mount = callback}, onBeforeUnmount: callback => {hooks.unmount = callback},
    listAkAccounts: async () => [{akUid: uid, updateTime: '2026-10-02'}],
    getAkAccountOperators: async () => uc([card('char_002_amiya', 1, 12)]),
    userInfo: {value: {uid: initialSession.uid, token: initialSession.token}}, ensureUcToken: async () => 'uc-token',
    refreshUcToken: async () => 'refreshed-token', clearUcToken: () => {},
    latestMowerSiteAccount, mapUcMowerInventory,
    localStorage: {getItem: key => storage.get(key) ?? null},
    window: {addEventListener: (key, callback) => listeners.set(key, callback), removeEventListener: key => listeners.delete(key)},
    ...overrides,
  }
  const inventory = createInventory(...dependencyNames.map(key => dependencies[key]))
  return {inventory, storage, hooks, listeners, dependencies,
    changeSession(token, userUid) {
      if (token) storage.set('USER_TOKEN', token)
      else storage.delete('USER_TOKEN')
      storage.set('UID', userUid)
      listeners.get('storage')?.({key: 'USER_TOKEN'})
    },
  }
}

const success = fixture()
success.hooks.mount()
await flush()
assert.equal(success.inventory.status.value, 'ready')
assert.deepEqual(success.inventory.entries.value, [{operator: 'char_002_amiya', elitePhase: 1, level: 12}])
assert.equal(success.inventory.accountLabel.value, `游戏账号 UID ${uid}`)
assert.equal(success.inventory.updatedAt.value, '2026-10-02')

const malformed = fixture({getAkAccountOperators: async () => ({akUid: uid})})
malformed.hooks.mount()
await flush()
assert.equal(malformed.inventory.status.value, 'error')
assert.equal(malformed.inventory.entries.value, null, 'malformed API must never yield a full-catalog fallback')

const pendingRows = deferred()
const logout = fixture({getAkAccountOperators: () => pendingRows.promise})
logout.hooks.mount()
await flush()
logout.changeSession(null, null)
assert.equal(logout.inventory.status.value, 'unauthenticated')
pendingRows.resolve(uc([card('char_002_amiya', 2, 80)]))
await flush()
assert.equal(logout.inventory.entries.value, null, 'late response after logout must be discarded')

const pendingUnmount = deferred()
const unmount = fixture({getAkAccountOperators: () => pendingUnmount.promise})
unmount.hooks.mount()
await flush()
unmount.hooks.unmount()
pendingUnmount.resolve(uc([card('char_002_amiya', 2, 80)]))
await flush()
assert.equal(unmount.inventory.entries.value, null, 'late response after unmount must be discarded')
assert.equal(unmount.listeners.size, 0)

const olderRows = deferred()
let calls = 0
const overlapping = fixture({getAkAccountOperators: async () => ++calls === 1 ? olderRows.promise : uc([card('char_002_amiya', 2, 20)])})
overlapping.hooks.mount()
await flush()
await overlapping.inventory.reload()
olderRows.resolve(uc([card('char_002_amiya', 0, 1)]))
await flush()
assert.equal(overlapping.inventory.entries.value[0].elitePhase, 2, 'older reload must not replace the newer result')

// UC helpers share pending promises, so clearing their cache alone does not cancel old exchanges.
const oldIssue = deferred(), oldRefresh = deferred()
let cachedToken = null
let issuing = oldIssue.promise.then(token => {cachedToken = token; return token}).finally(() => {issuing = null})
let refreshing = oldRefresh.promise.then(token => {cachedToken = token; return token}).finally(() => {refreshing = null})
const observedTokens = []
let switching
switching = fixture({
  clearUcToken: () => {cachedToken = null},
  ensureUcToken: () => cachedToken ? Promise.resolve(cachedToken) : issuing ?? Promise.resolve(cachedToken = switching.storage.get('USER_TOKEN')),
  refreshUcToken: () => refreshing ?? Promise.resolve(cachedToken = switching.storage.get('USER_TOKEN')),
  listAkAccounts: async () => {observedTokens.push(cachedToken); return [{akUid: uid}]},
})
switching.hooks.mount()
switching.changeSession('session-b', '22')
oldIssue.resolve('old-session-uc-token')
await flush()
assert.deepEqual(observedTokens, [], 'must wait for an old refresh before reading the new account')
oldRefresh.resolve('old-session-refreshed-token')
await flush()
assert.deepEqual(observedTokens, ['session-b'], 'account reads must use a freshly exchanged current-session token')
assert.equal(switching.inventory.status.value, 'ready')

// The first mounted page may already be session B while other pages still own session A's
// shared exchange/refresh promises. This must be safe without a session-change notification.
async function checkColdMount({pendingIssue, pendingRefresh, initiallyCached}) {
  const issue = pendingIssue ? deferred() : null, refresh = pendingRefresh ? deferred() : null
  let token = initiallyCached ? 'cached-current-session-b-token' : null
  let issuePromise = issue?.promise.then(value => {token = value; return value}).finally(() => {issuePromise = null})
  let refreshPromise = refresh?.promise.then(value => {token = value; return value}).finally(() => {refreshPromise = null})
  const reads = []
  let exchangeCalls = 0, refreshCalls = 0
  const cold = fixture({
    clearUcToken: () => {token = null},
    ensureUcToken: () => {
      exchangeCalls++
      return token ? Promise.resolve(token) : issuePromise ?? Promise.resolve(token = 'fresh-session-b-token')
    },
    refreshUcToken: () => {refreshCalls++; return refreshPromise ?? Promise.resolve(token = 'refreshed-session-b-token')},
    listAkAccounts: async () => {reads.push(token); return [{akUid: uid}]},
  }, {token: 'session-b', uid: '22'})
  cold.hooks.mount()
  await flush()
  assert.deepEqual(reads, [], 'cold mount must wait for the prior session credential operations')
  if (issue) {
    issue.resolve('old-session-a-issued-token')
    await flush()
    if (refresh) assert.deepEqual(reads, [], 'cold mount must also wait for the old refresh')
  }
  if (refresh) {
    refresh.resolve('old-session-a-refreshed-token')
    await flush()
  }
  assert.deepEqual(reads, ['fresh-session-b-token'], 'cold mount must only read the current session account')
  assert.equal(cold.inventory.status.value, 'ready')
  const callsBeforeFocus = {exchangeCalls, refreshCalls}
  cold.listeners.get('focus')()
  await flush()
  assert.deepEqual({exchangeCalls, refreshCalls}, {exchangeCalls: callsBeforeFocus.exchangeCalls + 1, refreshCalls: callsBeforeFocus.refreshCalls},
    'ordinary focus should reuse the cached current token instead of forcing replacement again')
  assert.deepEqual(reads, ['fresh-session-b-token', 'fresh-session-b-token'])
}
await checkColdMount({pendingIssue: true, pendingRefresh: false, initiallyCached: false})
await checkColdMount({pendingIssue: false, pendingRefresh: true, initiallyCached: true})
await checkColdMount({pendingIssue: true, pendingRefresh: true, initiallyCached: true})

console.log('Mower site inventory checks passed (UC/schema mapping, progression, aliases, malformed data, stale requests and session token races).')
