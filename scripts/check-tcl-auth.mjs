import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'

const root = process.argv[2] || fileURLToPath(new URL('..', import.meta.url))
const tokenSource = (await readFile(resolve(root, 'src/utils/user/tclToken.js'), 'utf8'))
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/export \{([^}]+)\};?/, 'return {$1};')
const clientSource = (await readFile(resolve(root, 'src/api/user-center/tclClient.js'), 'utf8'))
  .replace(/^import[^\n]*\n/gm, '')
  .replace('export default tclService;', 'return tclService;')
const now = 1800000000000
const fresh = {accessToken: 'existing-token', expiresAt: now + 7200000, scope: 'user.read'}
const quiet = {log() {}, warn() {}}
const success = accessToken => ({data: {code: 200, data: {
  access_token: accessToken, expires_in: 7200, scope: 'user.read', token_type: 'Bearer',
}}})

function fixture(initial = {}, blockedWrites = false) {
  const values = new Map(Object.entries(initial)), requests = []
  let respond = async () => success('issued-token')
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (blockedWrites) throw new Error('Storage unavailable')
      values.set(key, value)
    },
    removeItem(key) { values.delete(key) },
  }
  const axios = {post: async (...args) => {requests.push(args); return respond(...args)}}
  const api = new Function('axios', 'DOMAIN', 'localStorage', 'Date', 'console', tokenSource)(
    axios, 'https://backend.invalid', storage, {now: () => now}, quiet)
  return {api, values, requests, respondWith: handler => {respond = handler}}
}

test('existing browser token migrates without changing its expiry or local session', () => {
  const raw = JSON.stringify(fresh)
  const f = fixture({UC_ACCESS_TOKEN: raw, USER_TOKEN: 'local-session'})
  assert.equal(f.api.getTclAccessToken(), fresh.accessToken)
  assert.equal(f.values.get('TCL_ACCESS_TOKEN'), raw)
  assert.equal(f.values.has('UC_ACCESS_TOKEN'), false)
  assert.equal(f.values.get('USER_TOKEN'), 'local-session')
  assert.equal(f.requests.length, 0)
})

test('new cache wins and logout clears both names without resurrecting the old token', () => {
  const f = fixture({TCL_ACCESS_TOKEN: JSON.stringify(fresh), UC_ACCESS_TOKEN: JSON.stringify({...fresh, accessToken: 'old-token'})})
  assert.equal(f.api.getTclAccessToken(), fresh.accessToken)
  f.api.clearTclToken()
  assert.equal(f.api.getTclAccessToken(), null)
  assert.equal(f.values.has('TCL_ACCESS_TOKEN'), false)
  assert.equal(f.values.has('UC_ACCESS_TOKEN'), false)
})

test('readable legacy cache remains usable in memory if storage writes fail', () => {
  const f = fixture({UC_ACCESS_TOKEN: JSON.stringify(fresh)}, true)
  assert.equal(f.api.getTclAccessToken(), fresh.accessToken)
  assert.equal(f.api.getTclAccessToken(), fresh.accessToken)
})

test('expired or corrupt cache is not treated as a usable token', () => {
  const expired = fixture({UC_ACCESS_TOKEN: JSON.stringify({...fresh, expiresAt: now - 1})})
  assert.equal(expired.api.getTclAccessToken(), null)
  assert.equal(JSON.parse(expired.values.get('TCL_ACCESS_TOKEN')).expiresAt, now - 1)
  assert.equal(fixture({TCL_ACCESS_TOKEN: '{broken'}).api.getTclAccessToken(), null)
})

test('login accepts new and old backend fields; a login without a token clears the previous account', () => {
  const f = fixture()
  f.api.saveTclTokenFromSession({tclAccessToken: 'new-login', tclTokenExpiresIn: 120, tclTokenScope: 'user.profile'})
  assert.deepEqual(JSON.parse(f.values.get('TCL_ACCESS_TOKEN')), {
    accessToken: 'new-login', expiresAt: now + 120000, scope: 'user.profile',
  })
  f.api.saveTclTokenFromSession({ucAccessToken: 'old-backend', ucTokenExpiresIn: 60, ucTokenScope: 'user.read'})
  assert.equal(f.api.getTclAccessToken(), 'old-backend')
  assert.equal(JSON.parse(f.values.get('TCL_ACCESS_TOKEN')).expiresAt, now + 60000)
  f.api.saveTclTokenFromSession({})
  assert.equal(f.api.getTclAccessToken(), null)
})

test('parallel token exchanges reuse one request and preserve the local-session header and API URL', async () => {
  const f = fixture({USER_TOKEN: 'local-session'})
  let finish
  f.respondWith(() => new Promise(resolve => {finish = resolve}))
  const first = f.api.ensureTclToken(), second = f.api.ensureTclToken()
  assert.equal(first, second)
  assert.equal(f.requests.length, 1)
  assert.equal(f.requests[0][0], 'https://backend.invalid/auth/uc-token/issue')
  assert.equal(f.requests[0][2].headers.Authorization, 'Authorizationlocal-session')
  finish(success('exchanged-token'))
  assert.equal(await first, 'exchanged-token')
  assert.equal(f.api.getTclAccessToken(), 'exchanged-token')
})

test('refreshes are deduplicated, failures clear both cache names and later exchange recovers', async () => {
  const f = fixture({USER_TOKEN: 'local-session', TCL_ACCESS_TOKEN: JSON.stringify(fresh), UC_ACCESS_TOKEN: JSON.stringify(fresh)})
  let finish
  f.respondWith(() => new Promise(resolve => {finish = resolve}))
  const first = f.api.refreshTclToken(), second = f.api.refreshTclToken()
  assert.equal(first, second)
  assert.equal(f.requests.length, 1)
  assert.equal(f.requests[0][0], 'https://backend.invalid/auth/token/refresh')
  finish({data: {code: 90009, msg: 'Revoked'}})
  await assert.rejects(first, /Revoked/)
  assert.equal(f.api.getTclAccessToken(), null)
  assert.equal(f.values.has('UC_ACCESS_TOKEN'), false)
  assert.equal(f.values.has('TCL_ACCESS_TOKEN'), false)
  f.respondWith(async () => success('recovered-token'))
  assert.equal(await f.api.ensureTclToken(), 'recovered-token')
})

test('refresh-ahead renews a token within ten minutes and leaves longer-lived tokens alone', async () => {
  const f = fixture({USER_TOKEN: 'local-session', TCL_ACCESS_TOKEN: JSON.stringify(fresh)})
  await f.api.checkAndRefreshTclToken()
  assert.equal(f.requests.length, 0)
  f.api.saveTclToken({accessToken: 'expiring', expiresIn: 60})
  await f.api.checkAndRefreshTclToken()
  assert.equal(f.requests.length, 1)
  assert.equal(f.api.getTclAccessToken(), 'issued-token')
})

function clientFixture() {
  let requestHook, successHook, failureHook, options, refreshes = 0, retriedConfig
  const messages = []
  let currentToken = 'before-refresh'
  const service = {
    interceptors: {
      request: {use(handler) { requestHook = handler }},
      response: {use(success, failure) {successHook = success; failureHook = failure}},
    },
    async request(config) {retriedConfig = requestHook(config); return {ok: true}},
  }
  const axios = {create(config) {options = config; return service}}
  new Function('axios', 'TCL_DOMAIN', 'createMessage', 'getTclAccessToken', 'refreshTclToken', clientSource)(
    axios, 'https://auth.invalid', message => messages.push(message), () => currentToken,
    async () => {refreshes++; currentToken = 'after-refresh'})
  return {requestHook, successHook, failureHook, options, messages,
    get refreshes() {return refreshes}, get retriedConfig() {return retriedConfig}}
}

test('TCL requests preserve Bearer authentication and retry an expired business token once', async () => {
  const f = clientFixture()
  assert.equal(f.options.baseURL, 'https://auth.invalid')
  assert.equal(f.options.withCredentials, false)
  const config = f.requestHook({url: '/oauth2/userinfo', headers: {}})
  assert.equal(config.headers.Authorization, 'Bearer before-refresh')
  assert.deepEqual(await f.successHook({data: {code: 80001}, config}), {ok: true})
  assert.equal(f.refreshes, 1)
  assert.equal(f.retriedConfig.headers.Authorization, 'Bearer after-refresh')
  await assert.rejects(f.successHook({data: {code: 80001, msg: 'Expired again'}, config}), /Expired again/)
  assert.equal(f.refreshes, 1)
})

test('HTTP 401 follows the same single retry rule', async () => {
  const f = clientFixture(), config = {url: '/oauth2/ak-accounts', headers: {}}
  assert.deepEqual(await f.failureHook({response: {status: 401}, config}), {ok: true})
  assert.equal(f.refreshes, 1)
  await assert.rejects(f.failureHook({response: {status: 401}, config}))
  assert.equal(f.refreshes, 1)
})
