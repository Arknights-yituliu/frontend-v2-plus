/**
 * 使用OpenCV.js进行模板匹配（使用内置cellTemplates）
 * @param {string} inputBase64 - 输入图像的base64
 * @param {Object} [options] - 可选参数
 * @param {number} [options.inputWidth=960] - 输入图像的目标宽度
 * @param {number} [options.templateWidth=64] - 模板图像的目标宽度
 * @param {number} [options.threshold=0.8] - 匹配阈值(0-1)
 * @param {number} [options.overlapThreshold=0.5] - 重叠抑制阈值(0-1)
 * @returns {Promise<Array<{x: number, y: number, width: number, height: number, confidence: number, templateKey: string}>>} - 匹配结果数组（包含模板键值）
 */

// 识别逻辑：利用tempBase64.js中的模板图片，调用opencv.js进行模板匹配，寻找定界框，部分节点类别有多个模板，对重叠定界框仅保留置信度最高的

// 网格逻辑：将识别到的起始点放在[3,4]位置，然后以上下左右最近的格子计算行/列间距，搜索各个格子对应的格点

// TODO：识别连接线

async function templateMatchingWithCellTemplates(inputBase64, options = {}) {
    // 设置默认选项
    const {
        inputWidth = 960,
        templateWidth = 64,
        threshold = 0.8,
        overlapThreshold = 0.5
    } = options;

    // 加载OpenCV.js（假设已在全局作用域中可用）
    if (typeof cv === 'undefined') {
        throw new Error('OpenCV.js is not loaded. Please include opencv.js before using this function.');
    }

    // 辅助函数：base64转Image对象
    function base64ToImage(base64) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = base64;
        });
    }

    // 辅助函数：图像缩放并转换为Mat
    async function imageToMat(image, targetWidth) {
        const canvas = document.createElement('canvas');
        const scale = targetWidth / image.width;
        canvas.width = targetWidth;
        canvas.height = image.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const mat = cv.matFromImageData(imgData);

        // 转换为彩色图像
        let colorMat = new cv.Mat();
        cv.cvtColor(mat, colorMat, cv.COLOR_RGBA2BGR);
        mat.delete();

        return colorMat;
    }

    // 辅助函数：计算两个矩形的重叠比例
    function calculateOverlap(a, b) {
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);

        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;

        return intersection / Math.min(areaA, areaB);
    }

    // 辅助函数：非极大值抑制
    function nonMaxSuppression(matches, overlapThreshold) {
        matches.sort((a, b) => b.confidence - a.confidence);

        const suppressed = [];
        while (matches.length > 0) {
            const current = matches.shift();
            suppressed.push(current);

            // 移除与当前匹配重叠过多的其他匹配
            for (let i = matches.length - 1; i >= 0; i--) {
                const match = matches[i];
                const overlap = calculateOverlap(current, match);

                if (overlap > overlapThreshold) {
                    matches.splice(i, 1);
                }
            }
        }

        return suppressed;
    }

    try {
        // 加载输入图像
        const inputImage = await base64ToImage(inputBase64);
        const inputMat = await imageToMat(inputImage, inputWidth);

        // 收集所有匹配结果
        let allMatches = [];

        // 处理每个模板图像（从cellTemplates中获取）
        for (const [templateKey, templateBase64] of Object.entries(cellTemplates)) {
            const templateImage = await base64ToImage(templateBase64);

            // 准备模板图像
            const templateCanvas = document.createElement('canvas');
            const scale = templateWidth / templateImage.width;
            templateCanvas.width = templateWidth;
            templateCanvas.height = templateImage.height * scale;

            const templateCtx = templateCanvas.getContext('2d');
            templateCtx.drawImage(templateImage, 0, 0, templateCanvas.width, templateCanvas.height);

            const templateImgData = templateCtx.getImageData(0, 0, templateCanvas.width, templateCanvas.height);
            const templateMat = cv.matFromImageData(templateImgData);

            // 转换为彩色图像
            let templateColorMat = new cv.Mat();
            cv.cvtColor(templateMat, templateColorMat, cv.COLOR_RGBA2BGR);
            templateMat.delete();

            // 创建结果矩阵
            const result = new cv.Mat();
            const inputColor = new cv.Mat();

            // 确保图像类型一致
            inputMat.convertTo(inputColor, cv.CV_8UC3);
            templateColorMat.convertTo(templateColorMat, cv.CV_8UC3);

            // 模板匹配 (使用彩色图像的相关系数法)
            cv.matchTemplate(inputColor, templateColorMat, result, cv.TM_CCOEFF_NORMED);

            // 寻找匹配位置
            for (let y = 0; y < result.rows; y++) {
                for (let x = 0; x < result.cols; x++) {
                    const confidence = result.floatAt(y, x);
                    if (confidence > threshold) {
                        allMatches.push({
                            x: x,
                            y: y,
                            confidence: confidence,
                            width: templateColorMat.cols,
                            height: templateColorMat.rows,
                            templateKey: templateKey  // 添加模板键值
                        });
                    }
                }
            }

            // 释放内存
            templateColorMat.delete();
            result.delete();
            inputColor.delete();
        }

        // 对所有匹配结果进行非极大值抑制
        const finalMatches = nonMaxSuppression(allMatches, overlapThreshold);

        // 释放输入Mat内存
        inputMat.delete();

        // 返回匹配结果（包含模板键值）
        return finalMatches.map(match => ({
            x: match.x,
            y: match.y,
            width: match.width,
            height: match.height,
            confidence: match.confidence,
            templateKey: match.templateKey  // 保留模板键值
        }));

    } catch (error) {
        console.error('Error in template matching:', error);
        throw error;
    }
}

async function recognizeGrid(imageData) {
    // 1. 调用模板匹配获取定界框
    const matches = await templateMatchingWithCellTemplates(imageData);

    console.log("识别定界框：", matches)

    // 2. 初始化返回数据结构
    const result = {
        grid: Array(5).fill().map(() => Array(7).fill('unknown')),
        stats: Array(5).fill().map(() => Array(7).fill(false)),
        connections: [
            [3, 4, 3, 3],
            [3, 4, 2, 4],
            [3, 4, 3, 5],
            [3, 4, 4, 4]
        ],
        startPos: [3, 4]
    };

    // 3. 查找起始点并计算基准间距
    const startMatch = matches.find(m => m.templateKey === 'start');
    if (!startMatch) throw new Error("未找到起始点");

    const { x: startX, y: startY } = startMatch;
    result.grid[2][3] = 'unknown'; // (3,4)位置强制设为unknown
    result.stats[2][3] = false;

    // 4. 精确查找最近的四个基准邻居（带容错）
    const findClosestNeighbor = (matches, startX, startY, direction) => {
        let candidates = [];
        const tolerance = 5; // 5px容差

        matches.forEach(m => {
            if (m.templateKey === 'start') return;

            const dx = m.x - startX;
            const dy = m.y - startY;

            // 方向筛选
            if (direction === 'up' && Math.abs(dx) <= tolerance && dy < -tolerance) {
                candidates.push({ ...m, distance: -dy });
            }
            else if (direction === 'down' && Math.abs(dx) <= tolerance && dy > tolerance) {
                candidates.push({ ...m, distance: dy });
            }
            else if (direction === 'left' && Math.abs(dy) <= tolerance && dx < -tolerance) {
                candidates.push({ ...m, distance: -dx });
            }
            else if (direction === 'right' && Math.abs(dy) <= tolerance && dx > tolerance) {
                candidates.push({ ...m, distance: dx });
            }
        });

        // 返回距离最近的候选
        return candidates.sort((a, b) => a.distance - b.distance)[0];
    };

    const neighbors = {
        up: findClosestNeighbor(matches, startX, startY, 'up'),
        down: findClosestNeighbor(matches, startX, startY, 'down'),
        left: findClosestNeighbor(matches, startX, startY, 'left'),
        right: findClosestNeighbor(matches, startX, startY, 'right')
    };

    // 5. 计算典型间距（带容错）
    const rowSpacing = neighbors.down ? (neighbors.down.y - startY) :
        neighbors.up ? (startY - neighbors.up.y) : 60;
    const colSpacing = neighbors.right ? (neighbors.right.x - startX) :
        neighbors.left ? (startX - neighbors.left.x) : 80;



    console.log("列间距", colSpacing, "行间距", rowSpacing)

    // 6. 处理所有匹配项
    matches.forEach(match => {
        const { x, y, templateKey } = match;

        // 跳过起始点
        if (templateKey === 'start') return;

        // 解析模板键
        let [type, status, _] = templateKey.split('_');
        let gridValue = 'unknown';
        let statValue = false;

        if (templateKey.startsWith('unknown_')) {
            gridValue = 'unknown';
            statValue = false;
        } else if (type && (status === 'true' || status === 'false')) {
            gridValue = type;
            statValue = status === 'true';
        } else {
            // 无法解析的键视为未知
            gridValue = 'unknown';
            statValue = false;
        }

        // 计算网格位置
        const deltaX = x - startX;
        const deltaY = y - startY;

        let row, col;

        // 垂直方向计算（行）
        if (Math.abs(deltaY) <= 5) {
            row = 2; // 与起始点同行
        } else {
            row = Math.round(deltaY / rowSpacing) + 2;
        }

        // 水平方向计算（列）
        if (Math.abs(deltaX) <= 5) {
            col = 3; // 与起始点同列
        } else {
            col = Math.round(deltaX / colSpacing) + 3;
        }

        // 验证网格范围
        if (row >= 0 && row < 5 && col >= 0 && col < 7) {
            // 只在当前位置为unknown时覆盖（保留手动设置的起始点）
            if (result.grid[row][col] === 'unknown' || result.grid[row][col] === 'blank') {
                result.grid[row][col] = gridValue;
                result.stats[row][col] = statValue;
            }
        }
    });

    // 7. 标记缺失的格子为blank
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 7; col++) {
            // 检查该位置是否有匹配项（允许5px误差）
            const hasMatch = matches.some(m => {
                if (m.templateKey === 'start' && row === 2 && col === 3) return true;

                const deltaX = m.x - (startX + (col - 3) * colSpacing);
                const deltaY = m.y - (startY + (row - 2) * rowSpacing);
                return Math.abs(deltaX) <= 5 && Math.abs(deltaY) <= 5;
            });

            if (!hasMatch && result.grid[row][col] === 'unknown') {
                result.grid[row][col] = 'blank';
            }
        }
    }


    return result;
}