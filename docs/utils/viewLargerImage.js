// 当DOM完全加载后执行
import {ref} from "vue";

document.addEventListener('DOMContentLoaded', (event) => {
    // 获取所有 img 标签
    const images = document.querySelectorAll('img');

    // 为每个 img 标签添加点击事件
    images.forEach(img => {
        img.addEventListener('click', () => {
            alert('你点击了一张图片！');
            // 或者执行其他你需要的操作
        });
    });
});


let imageUrl = ref('')
let imageDialog = ref(false)

function viewLargerImage(url){
    imageUrl.value = url
    imageDialog.value = true
}

function addImageClickEvent(){
    const images = document.querySelectorAll('img');
    // 为每个 img 标签添加点击事件
    images.forEach(img => {
        img.addEventListener('click', function(event) {
            imageUrl.value = event.target.src;
            imageDialog.value = true
        });
    });
}


export {
    addImageClickEvent,imageUrl,imageDialog
}
