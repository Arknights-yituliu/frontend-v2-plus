/**
 * 控制折叠栏的通用方法
 * @param collapse_item_class  传入所有折叠内容的样式名称  比如在id为collapse的元素中有10个样式为collapse_item的元素，折叠或展开的高度即为10个collapse_item的高度
 * @param collapse_item_id 传入折叠内容盒子的元素id
 * @param collapse_wrap_id  传入折叠内容盒子外的套子的元素id
 */
function collapse(collapse_item_class, collapse_wrap_id, collapse_item_id) {
    // 包裹折叠内容的元素高度
    const wrapHeight = document.getElementById(collapse_wrap_id).offsetHeight;
    //获取所有折叠内容的样式高度
    let elements = document.getElementsByClassName(collapse_item_class);
    // const collapse_box_element = document.getElementById(collapse_box_id);
    // const collapse_box_computed_style = window.getComputedStyle(collapse_box_element, null);
    // const marginTop = parseInt(collapse_box_computed_style.marginTop.replace('px','')) ;
    // const marginBottom = parseInt(collapse_box_computed_style.marginBottom.replace('px',''));
    // let height = marginTop+marginBottom
    let height = 8;
    for (let e of elements) {
        height += e.offsetHeight;
    }

    document.getElementById(collapse_item_id).style.transform = 'translateY(-' + height + 'px)';

    // document.getElementById(collapse_box_id).style.transform = 'translateY(0)';

    // 包裹折叠内容的元素高度小于1则展开
    if (wrapHeight < 1) {
        //设置包裹折叠内容的元素高度为所有折叠内容的样式高度
        document.getElementById(collapse_wrap_id).style.height = height + "px";
        // console.log("通用展开高度", height + "px");
        //等待过渡动画结束将包裹折叠内容的元素高度设为auto

        setTimeout(() => {
            document.getElementById(collapse_item_id).style.transform = 'translateY(0)';
            document.getElementById(collapse_wrap_id).style.height = "auto";
        }, 50);
    } else {
        //设置包裹折叠内容的元素高度为展开高度，因为过渡动画需要一个高度

        document.getElementById(collapse_wrap_id).style.height = height + "px";
        //设置包裹折叠内容的元素高度为0
        document.getElementById(collapse_item_id).style.transform = 'translateY(-' + height + 'px)';
        setTimeout(() => {
            document.getElementById(collapse_wrap_id).style.height = 0 + "px";
        }, 100);
    }
}

function collapseV2(collapse_id,collapse_item_id){
    const wrapHeight = document.getElementById(collapse_id).offsetHeight;
    let element = document.getElementById(collapse_item_id);
    console.log(collapse_item_id)
    let height = element.offsetHeight;
    // for (let e of elements) {
    //     height += e.offsetHeight;
    // }

    console.log(height)
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
    collapse,collapseV2
}