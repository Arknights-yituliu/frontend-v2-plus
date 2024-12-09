
function createPopover(childId,width='200px'){
    const popover = document.createElement("div");
    popover.id = `popover-${childId}`;
    popover.className = 'my-popover'
    if(width){
        popover.style.width = width
    }
    const popoverArrow = document.createElement("div");
    popoverArrow.id = `popover-arrow-${childId}`;
    popoverArrow.className = 'my-popover-arrow'
    const content =  document.getElementById(childId)
    if(!content){
      return
    }
    popover.appendChild(content)
    popover.appendChild(popoverArrow)
    const container = document.getElementById('components-container-114514')
    if(!container){
        return
    }
    container.appendChild(popover)
}

let lastParentId = ''
let lastChildId = ''

function popoverOnOpen(parentId,childId){

    const popoverId = `popover-${childId}`;
    const popoverArrowId = `popover-arrow-${childId}`;
    const popover =  document.getElementById(popoverId)
    if(!popover){
        return
    }
    const popoverArrow = document.getElementById(popoverArrowId)
    if(!popoverArrow){
        return
    }
    const parent =  document.getElementById(parentId)
    if(!parent){
        return
    }

    lastChildId = childId

    if(lastParentId!==parentId){
        popover.style.display='block'
        setPopupStyle(popover,popoverArrow,parent)
        lastParentId = parentId
        return;
    }

    if(popover.style.display!=='none'){
        popover.style.display='none'
    }else {
        popover.style.display='block'
        setPopupStyle(popover,popoverArrow,parent)
    }
    lastParentId = parentId
}

function popupResize(){
    console.log(lastParentId,lastChildId)
    popoverOnOpen(lastParentId,lastChildId)
}

function setPopupStyle(popover,popoverArrow,parent){
    const offsetTop = parent.offsetTop;
    const offsetLeft = parent.offsetLeft;
    const offsetHeight = popover.offsetHeight;
    const offsetWidth = parent.offsetWidth;
    popoverArrow.style.left = `${offsetWidth/2-8}px`;
    popover.style.top=`${offsetTop-offsetHeight-12}px`;
    popover.style.left=`${offsetLeft}px`;
}

export {createPopover,popoverOnOpen,popupResize}