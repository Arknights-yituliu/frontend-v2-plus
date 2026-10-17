import Dexie from 'dexie';
const myDatabase = new Dexie('myDatabase');
myDatabase.version(2).stores({
    item_value: 'itemId,itemName,itemValueAp,itemValue,rarity,cardNum,version',
    operator_progression_statistics: 'result,data',
    cache_data:'id,resource,version,createTime',
    cache_time: 'resource,version,createTime',
});

/**
 * 安全读取 cache_data 表中的缓存记录
 * Chrome 130+ 在读取超大 value 且底层文件丢失时，会抛出
 * NotReadableError: Data lost due to missing file...，此类记录不可恢复。
 * 读取失败时清理该记录并返回 null，使调用方按“缓存未命中”处理并回源，
 * 避免异常外抛成 Uncaught (in promise)。
 * @param {string} key 缓存主键
 * @returns {Promise<any|null>} 缓存记录，读取失败时返回 null
 */
async function getCacheSafe(key) {
    try {
        return await myDatabase.cache_data.get(key)
    } catch (error) {
        console.warn(`读取缓存失败，已按未命中处理。key=${key}`, error)
        // 记录不可读时尝试删除，防止后续读取继续报错
        try {
            await myDatabase.cache_data.delete(key)
        } catch (deleteError) {
            console.warn(`清理损坏缓存失败。key=${key}`, deleteError)
        }
        return null
    }
}

/**
 * 安全写入 cache_data 表中的缓存记录
 * 写入失败仅告警，不抛出异常，避免异步写入的 rejection 变成未捕获错误。
 * @param {object} data 缓存记录（含 id 字段）
 * @returns {Promise<void>}
 */
async function putCacheSafe(data) {
    try {
        await myDatabase.cache_data.put(data)
    } catch (error) {
        console.warn(`写入缓存失败。key=${data && data.id}`, error)
    }
}

export { getCacheSafe, putCacheSafe }

export default myDatabase
