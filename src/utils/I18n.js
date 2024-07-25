import {ref} from "vue";
import Language_Dictionary_Schedule from '/src/static/json/i18n/language_dictionary_schedule.json' //排班生成器页面的字典

//字典表  引入对应页面的翻译文件写入字典表
const Language_Dictionary_Table = {
    schedule:Language_Dictionary_Schedule
}

//当前语言
let language = ref('cn')

/**
 * 国际化工具函数，具体在src/utils/i18n.js中查看注释
 * @param {string} dictionaryName 页面对应的字典名称
 * @param {string} keyText  一个以'.'为分隔符的key字符串，将key根据'.'分隔后，使用分割后的key数组去提供的翻译字典(在/src/static/json/i18n/目录下)中查找对应语言的文本
 * @return {string} 翻译文本
 *
 * @example
 * translate(schedule,schedule.InfrastructureLayout)
 * 将会去引入的Language_Dictionary_Schedule.json中查找schedule属性的InfrastructureLayout属性中对应的语言翻译
 */
function translate(dictionaryName,keyText) {
    if(!keyText){
        return 'key is undefined'
    }
    // 将key根据'.'分隔
    let keys = keyText.split('.')
    //翻译文本
    let translatedText = Language_Dictionary_Table[dictionaryName]
    // 根据key数组去逐层查找对应的翻译文本
    for (const key of keys) {
        if (!translatedText[key]) {
            return 'no translate'
        } else {
            translatedText = translatedText[key]
        }
    }

    return translatedText[language.value]
}

export {
    translate,language
}