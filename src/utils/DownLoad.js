function downloadJsonFile(jsonData, fileName) {
    // 将JSON对象转换为字符串
    const jsonString = JSON.stringify(jsonData, null, 2);

    // 创建一个Blob对象
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 使用fetch API创建一个带有Blob对象的响应
    fetch(URL.createObjectURL(blob))
        .then(response => response.blob())
        .then(blob => {
            // 创建一个<a>元素用于下载
            const aTag = document.createElement('a');
            aTag.style.display = 'none';
            aTag.href = URL.createObjectURL(blob);
            aTag.download = fileName;

            // 添加到DOM中并模拟点击事件以触发下载
            document.body.appendChild(aTag);
            aTag.click();

            // 清理工作
            document.body.removeChild(aTag);
            URL.revokeObjectURL(aTag.href);
        });
}

function downloadJsonFileA(jsonData, fileName) {
    // 将JSON对象转换为字符串
    const jsonString = encodeURIComponent(JSON.stringify(jsonData, null, 2));

    // 创建一个Blob对象，包含JSON字符串数据
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 创建一个<a>元素用于下载
    const aTag = document.createElement('a');
    aTag.style.display = 'none';
    aTag.href = URL.createObjectURL(blob);
    aTag.download = fileName;

    // 添加到DOM中并模拟点击事件以触发下载
    document.body.appendChild(aTag);
    aTag.click();

    // 清理工作
    document.body.removeChild(aTag);
    URL.revokeObjectURL(aTag.href);
}



export {downloadJsonFile}