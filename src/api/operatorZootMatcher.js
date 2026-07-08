const OPERATOR_ZOOT_MATCHER_API_BASE = 'https://prts.maa.plus'

const DEFAULT_LIMIT = 50
const DEFAULT_MAX_PAGES = 6
const DEFAULT_TIMEOUT_MS = 15000

function buildOperatorZootMatcherUrl(path, query = {}) {
    const url = new URL(path, OPERATOR_ZOOT_MATCHER_API_BASE)

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') {
            continue
        }

        url.searchParams.set(key, String(value))
    }

    return url.toString()
}

async function fetchOperatorZootMatcherJson(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                ...(options.headers || {}),
            },
        })

        if (!response.ok) {
            throw new Error(`ZOOT request failed with status ${response.status}`)
        }

        const result = await response.json()

        if (result?.status_code !== 200) {
            throw new Error(result?.message || 'ZOOT returned an unexpected response')
        }

        return result.data
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error('连接 ZOOT 作业站超时，请稍后重试')
        }

        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}

async function queryOperatorZootMatcherJobPage({ stageKeyword, page, limit = DEFAULT_LIMIT }) {
    return fetchOperatorZootMatcherJson(
        buildOperatorZootMatcherUrl('/copilot/query', {
            limit,
            page,
            level_keyword: stageKeyword,
            order_by: 'hot',
            desc: true,
        }),
    )
}

async function searchOperatorZootMatcherJobsByStage(stageKeyword, options = {}) {
    const keyword = stageKeyword?.trim()
    const limit = options.limit ?? DEFAULT_LIMIT
    const startPage = Math.max(1, Math.floor(Number(options.startPage) || 1))
    const pageCount = Math.max(1, Math.floor(Number(options.pageCount ?? options.maxPages) || DEFAULT_MAX_PAGES))
    const endPage = startPage + pageCount - 1

    if (!keyword) {
        return {
            jobs: [],
            total: 0,
            fetchedPages: 0,
            nextPage: startPage,
            truncated: false,
        }
    }

    const jobs = []
    let page = startPage
    let hasNext = true
    let total = 0

    while (hasNext && page <= endPage) {
        const data = await queryOperatorZootMatcherJobPage({
            stageKeyword: keyword,
            page,
            limit,
        })

        jobs.push(...(data?.data || []))
        total = data?.total ?? total
        hasNext = Boolean(data?.has_next)
        page += 1
    }

    return {
        jobs,
        total,
        fetchedPages: page - startPage,
        nextPage: page,
        truncated: hasNext,
    }
}

async function listOperatorZootMatcherStageInfo() {
    return fetchOperatorZootMatcherJson(buildOperatorZootMatcherUrl('/arknights/level'))
}

function buildOperatorZootMatcherJobApiUrl(id) {
    return buildOperatorZootMatcherUrl(`/copilot/get/${id}`)
}

export {
    OPERATOR_ZOOT_MATCHER_API_BASE,
    buildOperatorZootMatcherJobApiUrl,
    listOperatorZootMatcherStageInfo,
    searchOperatorZootMatcherJobsByStage,
}
