function getText(file){
    return new Promise((resolve,reject)=>{
        const reader = new FileReader()
        reader.onload = () =>{
            resolve(reader.result)
        }

        reader.onerror = () =>{
            reject(reader.error)
        }
        reader.readAsText(file,'UTF-8')
    })
}

function getDataUrl(file){
    return new Promise((resolve,reject)=>{
        const reader = new FileReader()
        reader.onload = () =>{
            resolve(reader.result)
        }
        reader.onerror = () =>{
            reject(reader.error)
        }
        reader.readAsDataURL(file)
    })
}



export { getText , getDataUrl }