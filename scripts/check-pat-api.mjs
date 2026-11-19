import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'

const root = process.argv[2] || fileURLToPath(new URL('..', import.meta.url))
const source = async path => (await readFile(resolve(root, path), 'utf8')).replace(/^import[^\n]*\n/gm, '')
const managementSource = (await source('src/api/user-center/pat.js')).replace(/export function/g, 'function')
const issuanceSource = (await source('src/api/backend/userInfo.js')).replace('export default', 'return')
const card = await source('src/components/account/OpenApiTokenCard.vue')
const cardSource = card.match(/<script setup>([\s\S]*?)<\/script>/)[1]
const ref = value => ({value})
const computed = get => ({get value() {return get()}})

function fixture(overrides = {}) {
  const calls = {issue: [], revoke: [], messages: []}
  const deps = {
    userInfoAPI: {generateOpenApiPat: async (...args) => {calls.issue.push(args)}},
    listPats: async () => [], listOAuthScopes: async () => [],
    revokePat: async token => {calls.revoke.push(token)},
    listAkAccounts: async () => [{akUid: '123', source: 'skland'}, {akUid: 'manual', source: 'manual'}],
    ensureTclToken: async () => 'oauth-access',
    createMessage: message => {calls.messages.push(message)},
    copyTextToClipboard() {}, ...overrides,
  }
  const api = new Function('computed', 'onMounted', 'ref', ...Object.keys(deps), cardSource + `
    return {fetchAccounts, fetchTokens, generateToken, gameAccounts, selectedGameUid,
      accountLoadError, isAccountsLoading, hasTokenForScope, tokenList,
      openDeleteConfirm, confirmDeleteToken, getTokenAccountText, generatingScope};
  `)(computed, () => {}, ref, ...Object.values(deps))
  return {api, calls}
}

test('PAT management keeps OAuth authentication and revokes by token rather than id', async () => {
  const calls = []
  const service = {get: async (...args) => calls.push(['GET', ...args]), post: async (...args) => calls.push(['POST', ...args])}
  const api = new Function('tclService', managementSource + ';return {listPats,revokePat}')(service)
  await api.listPats()
  await api.revokePat('tlc_pat_fixture')
  assert.deepEqual(calls, [['GET', '/oauth2/pat/list'], ['POST', '/oauth2/pat/revoke', {token: 'tlc_pat_fixture'}]])
})

test('local issuance sends account and expiry as JSON without browser refresh credentials', async () => {
  let sent
  const api = new Function('request', issuanceSource)(async config => {sent = config})
  await api.generateOpenApiPat(315360000, 'arknights-data.read', '只读 PAT', {game_uid: '123'})
  assert.deepEqual(sent, {url: '/auth/pat', method: 'post', data: {
    expires_in: 315360000, scope: 'arknights-data.read', name: '只读 PAT', payload: {game_uid: '123'},
  }})
  assert.equal('params' in sent, false)
})

test('account picker excludes manual entries and issues a read-only PAT for the selected account', async () => {
  const {api, calls} = fixture()
  await api.fetchAccounts()
  await api.fetchTokens()
  assert.equal(api.isAccountsLoading.value, false)
  assert.deepEqual(api.gameAccounts.value.map(item => item.akUid), ['123'])
  assert.equal(api.selectedGameUid.value, '123')
  await api.generateToken('arknights-data.read', '只读 PAT')
  assert.deepEqual(calls.issue, [[315360000, 'arknights-data.read', '只读 PAT', {game_uid: '123', game_name: '明日方舟', source: 'skland'}]])
  assert.equal(api.generatingScope.value, '')
})

test('write-only issuance remains available beside a read-only PAT and blocks duplicate writes', async () => {
  const {api, calls} = fixture()
  await api.fetchAccounts()
  await api.fetchTokens()
  api.tokenList.value = [{scope: 'arknights-data.read', payload: {game_uid: '123'}}]
  await api.generateToken('arknights-data.write', '只写 PAT')
  assert.deepEqual(calls.issue, [[315360000, 'arknights-data.write', '只写 PAT', {game_uid: '123', game_name: '明日方舟', source: 'skland'}]])
  api.tokenList.value = [{scope: 'arknights-data.write', payload: {game_uid: '123'}}]
  await api.generateToken('arknights-data.write', '只写 PAT')
  assert.equal(calls.issue.length, 1)
  assert.equal(api.hasTokenForScope('arknights-data.read'), false)
  assert.match(card, /@click="generateToken\(WRITE_SCOPE, '干员数据只写 PAT'\)"/)
  assert.match(cardSource, /const WRITE_SCOPE = "arknights-data.write"/)
  assert.doesNotMatch(cardSource, /gama-data\.write/)
})

test('account load failure clears stale selection and prevents issuance', async () => {
  const {api, calls} = fixture({listAkAccounts: async () => {throw new Error('offline')}})
  api.selectedGameUid.value = 'stale-account'
  await api.fetchAccounts()
  assert.equal(api.selectedGameUid.value, '')
  assert.match(api.accountLoadError.value, /读取失败/)
  await api.generateToken('arknights-data.read', '只读 PAT')
  assert.equal(calls.issue.length, 0)
})

test('duplicate prevention matches the selected account and permission across supported scope formats', () => {
  const {api} = fixture()
  api.selectedGameUid.value = '123'
  for (const scope of ['arknights-data.read', ['arknights-data.read'], '["arknights-data.read"]', 'arknights-data.read,arknights-data.write']) {
    api.tokenList.value = [{scope, payload: {game_uid: '123'}, expiresInSeconds: 30}]
    assert.equal(api.hasTokenForScope('arknights-data.read'), true)
  }
  api.tokenList.value = [
    {scope: 'arknights-data.read', payload: {game_uid: 'different'}, expiresInSeconds: 30},
    {scope: 'arknights-data.write', payload: {game_uid: '123'}, expiresInSeconds: 30},
    {scope: 'arknights-data.read', payload: null, expiresInSeconds: 30},
  ]
  assert.equal(api.hasTokenForScope('arknights-data.read'), false)
  api.tokenList.value = [{scope: ['arknights-data.read', 'arknights-data.write'], payload: {gameUid: '123'}}]
  assert.equal(api.hasTokenForScope('arknights-data.read'), true)
  assert.equal(api.hasTokenForScope('arknights-data.write'), true)
})

test('historical tokens remain visible and revokable without changing OAuth token cache', async () => {
  const {api, calls} = fixture()
  const legacy = {id: 99, token: 'a'.repeat(64), payload: null}
  assert.match(api.getTokenAccountText(legacy), /历史令牌/)
  assert.match(api.getTokenAccountText({token: 'tlc_pat_fixture', payload: null}), /未指定账号/)
  api.openDeleteConfirm(legacy)
  await api.confirmDeleteToken()
  assert.deepEqual(calls.revoke, [legacy.token])
  assert.doesNotMatch(cardSource, /(?:localStorage|saveTclToken|refreshTclToken)/)
})
