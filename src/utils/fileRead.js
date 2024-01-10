function fileRead(file){
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

export { fileRead }