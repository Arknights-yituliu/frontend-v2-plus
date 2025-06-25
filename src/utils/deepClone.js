export default function (value) {
    const cache = new Map()

    function _deepClone(value) {
        if (typeof value !== "object" || value === null) {
            return value;
        }
        if(cache.has(value)) {
            return  cache.get(value);
        }
        const result = Array.isArray(value) ? [] : {};
        cache.set(value, result);
        for (const key in value) {
            result[key] = _deepClone(value[key])
        }
        return result;
    }

    return _deepClone(value)
}