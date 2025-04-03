function readFileToString(file){
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

async function compressImage(file, targetSize = 100 * 1024) {
    return new Promise(async (resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 设置画布大小
            canvas.width = img.width;
            canvas.height = img.height;

            // 绘制图像到画布上
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // 初始质量设置
            let minQuality = 0.1;
            let maxQuality = 1.0;
            let currentQuality = (minQuality + maxQuality) / 2;

            // 二分查找质量参数
            while (true) {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', currentQuality));
                if (blob.size < targetSize) {
                    if (maxQuality - minQuality <= 0.01) break; // 达到足够精度
                    minQuality = currentQuality;
                } else {
                    maxQuality = currentQuality;
                }
                currentQuality = (minQuality + maxQuality) / 2;
            }

            // 最终压缩
            const finalBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', currentQuality));
            resolve(finalBlob);
        };
        img.onerror = reject;
    });
}


// 导出 JSON 的函数
function exportToJsonFile(data, fileName = 'data.json') {
    // 将对象转换为 JSON 字符串
    const jsonString = JSON.stringify(data, null, 2);

    // 创建 Blob 对象
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    // 模拟点击下载
    a.click();

    // 清理 URL 对象
    URL.revokeObjectURL(url);
}


export { readFileToString , getDataUrl ,compressImage,exportToJsonFile}