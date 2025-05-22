import {ref} from "vue";

let menuList = ref([])
function getMenuList(){

    const hElement = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    let list = []
    for (let item of hElement) {
        const {nodeName, innerText, id} = item;
        list.push({
            title: innerText,
            id: id,
            nodeName: nodeName,
        })
    }
    menuList.value = list
}

function getMenuGroup() {
    const hElement = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    let list = []
    for (let item of hElement) {

        const {nodeName, innerText, id} = item;

        let h1LastChild = 0
        let h2LastChild = 0
        let h3LastChild = 0
        if (list.length) {
            h1LastChild = list.length - 1
            if (list[h1LastChild].child.length) {
                h2LastChild = list[h1LastChild].child.length - 1
                if (list[h1LastChild].child[h2LastChild].child.length) {
                    h3LastChild = list[h1LastChild].child[h2LastChild].child.length - 1
                }
            }
        }

        if ('H1' === nodeName) {
            list.push({
                title: innerText,
                id: id,
                child: [],

            })
        }

        if ('H2' === nodeName) {
            list[h1LastChild].child.push({
                title: innerText,
                id: id,
                child: []
            })
        }

        if ('H3' === nodeName) {
            list[h1LastChild].child[h2LastChild].child.push({
                title: innerText,
                id: id,
                child: []
            })
        }

        if ('H4' === nodeName) {
            list[h1LastChild].child[h2LastChild].child[h3LastChild].child.push({
                title: innerText,
                id: id,
                child: []
            })
        }

    }

    menuList.value = list

}

export {
    menuList,getMenuGroup,getMenuList
}