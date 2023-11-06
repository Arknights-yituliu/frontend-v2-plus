/**
 * 控制折叠栏的通用方法
 * @param {string} collapse_id 折叠栏外部元素id
 * @param {string} collapse_item_id 折叠栏内容元素id
 */
function collapseV2(collapse_id,collapse_item_id){
    const wrapHeight = document.getElementById(collapse_id).offsetHeight;
    let element = document.getElementById(collapse_item_id);
    let height = element.offsetHeight;
    if (wrapHeight < 1) {
        // document.getElementById(collapse_id).style.willChange = 'height'
        document.getElementById(collapse_id).style.height = height + "px";
        setTimeout(() => {
            if(document.getElementById(collapse_id).offsetHeight>1){
                document.getElementById(collapse_id).style.height = 'auto'
            }
        }, 300);
    }else {
        document.getElementById(collapse_id).style.height = height + "px";
        setTimeout(() => {
            document.getElementById(collapse_id).style.height = 0 + "px";
        }, 50);
    }


}

export {
    collapseV2
}