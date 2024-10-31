async function compressImage(file, targetSize = 100 * 1024) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = async () => {
                let width = img.width, height = img.height;
                let quality = 0.8; // 默认质量

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 调整画布大小以适应图像
                canvas.width = width;
                canvas.height = height;

                // 绘制图像到画布上
                ctx.drawImage(img, 0, 0, width, height);

                // 压缩循环
                while ((canvas.toDataURL('image/jpeg', quality).length / 8) > targetSize && quality > 0.1) {
                    quality -= 0.1;
                }

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

export default compressImage