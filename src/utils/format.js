import {h} from 'vue'

/**
 * 格式化数字
 * @param {Object} num 数字
 * @param {number} acc 位数
 * @returns {string} 格式化后的数字
 */
const formatNumber = (num, acc = 2) => {
    acc = typeof acc !== "undefined" ? acc : 2;
    if (typeof num === "undefined") return ''
    return parseFloat(num?.toString()).toFixed(acc);
}

// 将 HTML 字符串转换成包含层级结构的 VNode
const htmlStringToVNode = (htmlString) => {
    // 使用 DOMParser 将 HTML 字符串转换成 DOM
    const parser = new DOMParser()
    // DOMParser 可能会把解析结果包裹在 <html><head></head><body>...</body></html> 中，因此只关注 body 里的内容
    const doc = parser.parseFromString(htmlString, 'text/html')
    const body = doc.body

    // 将 body 内所有子元素转成 VNode 数组
    const childrenNodes = Array.from(body.childNodes).map(node => convertNodeToVNode(node))

    // 如果只有一个根节点，返回第一个；否则包裹在一个 div VNode 中
    if (childrenNodes.length === 1) {
        return childrenNodes[0]
    } else {
        return h('div', {}, childrenNodes)
    }
}

// 递归将 DOM 节点转成 VNode
const convertNodeToVNode = (node) => {
    // 文本节点
    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue
    }

    // 注释节点或其他非元素节点
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null
    }

    // 获取标签名（小写）
    const tag = node.tagName.toLowerCase()

    // 收集节点属性
    // 将 HTML 中的属性都转换成一个对象，例如 class、style 等
    const props = {}
    Array.from(node.attributes).forEach(attr => {
        props[attr.name] = attr.value
    })

    // 递归处理子节点
    const children = Array.from(node.childNodes).map(child => convertNodeToVNode(child))

    // 返回一个 h(tag, props, children) 的 VNode
    return h(tag, props, children)
}


export {formatNumber, htmlStringToVNode};
