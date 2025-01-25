function exportExcel(fileName,data){
    let exc = XLSX.utils.book_new(); // 初始化一个excel文件
    let exc_data = XLSX.utils.aoa_to_sheet(data);   // 传入数据 , 到excel
    // 将文档插入文件并定义名称
    XLSX.utils.book_append_sheet(exc, exc_data, fileName);
    // 执行下载
    XLSX.writeFile(exc, fileName + '.xlsx');
}

export {
    exportExcel
}