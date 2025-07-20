document.addEventListener("DOMContentLoaded", function () {
    // 全局变量
    let gridData = {};
    let connections = [];
    let currentCell = null;
    let isDrawing = false;
    let startCell = null;
    let imageData = {};
    // 添加全局变量
    let recmapImageData = null;
    // 在全局变量部分添加
    let quickMenu = document.getElementById("quick-menu");
    let quickMenuTimeout = null;

    // 在全局变量部分添加
    let isDragging = false; // 新增拖拽状态标志

    document.addEventListener('contextmenu', function (e) {
        const popup = document.getElementById('popup');
        const textarea = document.getElementById('cell-notes');

        // 如果 popup 是显示状态，并且点击的不是 textarea 或其内部元素
        if (!popup.classList.contains('hidden') &&
            !textarea.contains(e.target)) {
            e.preventDefault();
            e.stopPropagation();

            // 关闭 popup
            saveCellData();
            const imageSection = popup.querySelector(".image-upload-section");
            if (imageSection) {
                imageSection.remove();
            }
            popup.classList.add("hidden");
            currentCell = null;
        }
    }, true);  // 使用捕获阶段确保优先级最高

    // 在DOMContentLoaded事件监听器中添加
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);



    // 记得在不需要时移除监听器（如重置时）
    function cleanupEventListeners() {
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("mousemove", handleMouseMove);
    }


    const cellTypeNames = {
        unknown: "未知",
        shiyi: "拾遗",
        yiyu: "易与",
        huoluan: "祸乱",
        chuanshuo: "传说",
        zayi: "杂疑",
        gusi: "故肆",
        changle: "常乐",
        choumou: "筹谋",        
        blank: "无",
    };

    // DOM元素
    const gridContainer = document.getElementById("grid-container");
    let grid = document.getElementById("grid");
    const rowsInput = document.getElementById("rows");
    const colsInput = document.getElementById("cols");
    const startRowInput = document.getElementById("start-row");
    const startColInput = document.getElementById("start-col");
    const generateBtn = document.getElementById("generate-grid");

    const resetBtn = document.getElementById("reset-button");
    const recmapBtn = document.getElementById("recmap-button");

    const popup = document.getElementById("popup");
    const typeButtons = document.querySelectorAll(".type-button");
    const formSections = document.querySelectorAll(".form-section");
    const cellClosedCheckbox =
        document.getElementById("cell-closed");



    // 初始化网格
    function initializeGrid(rows, cols, startRow, startCol) {
        // 清除所有现有数据
        gridData = {};
        imageData = {};
        connections = [];

        grid.innerHTML = "";
        gridContainer.innerHTML =
            '<div class="grid" id="grid"></div>';
        grid = document.getElementById("grid");

        // 设置网格样式
        grid.style.gridTemplateRows = `repeat(${rows}, var(--grid-size))`;
        grid.style.gridTemplateColumns = `repeat(${cols}, var(--grid-size))`;

        // 创建单元格
        for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= cols; c++) {
                const cell = document.createElement("div");
                cell.className = "grid-cell unknown";
                cell.dataset.row = r;
                cell.dataset.col = c;
                // 替换原来的占位图标
                const iconContainer = document.createElement("div");
                iconContainer.className = "grid-icon";
                iconContainer.innerHTML = iconTemplates.unknown; // 默认使用未知图标
                cell.appendChild(iconContainer);

                const label = document.createElement("div");
                label.className = "grid-label";
                label.textContent = "未知";
                cell.appendChild(label);

                // 在这里定义 cellKey
                const cellKey = `${r},${c}`;
                gridData[cellKey] = {
                    type: "unknown",
                    closed: false,
                    notes: "",
                    image: null,
                };

                // 设置起始点
                if (r == startRow && c == startCol) {
                    cell.classList.add("start");
                    cell.classList.remove("unknown");
                    cell.style.backgroundColor = "black";
                    cell.style.cursor = "default";
                    const label = cell.querySelector(".grid-label");
                    if (label) {
                        label.textContent = "起始点";
                    }
                }

                // 在initializeGrid函数中修改事件监听
                cell.addEventListener(
                    "mousedown",
                    handleCellMouseDown
                );
                cell.addEventListener(
                    "mouseenter",
                    handleCellMouseEnter
                );
                cell.addEventListener("click", function (e) {
                    // 如果正在绘制连接线，则忽略点击
                    if (!isDrawing) {
                        handleCellClick(e);
                    }
                });
                // 禁止显示右键菜单方便后续处理
                cell.addEventListener("contextmenu", function (e) {
                    e.preventDefault();
                });

                // 不对起始点增加滚轮事件
                if (!cell.classList.contains("start")) {
                    // 添加cell的滚轮事件
                    cell.addEventListener(
                        "wheel",
                        handleCellMouseWheel
                    );

                }

                // 在initializeGrid函数中，为每个单元格添加鼠标悬停事件
                cell.addEventListener("mouseenter", handleCellMouseEnterForQuickMenu);
                cell.addEventListener("mouseleave", handleCellMouseLeaveForQuickMenu);


                // 添加鼠标离开网格的处理
                grid.addEventListener("mouseleave", function () {
                    if (isDrawing) {
                        isDrawing = false;
                        startCell = null;
                    }
                });

                grid.appendChild(cell);
            }
        }

        // 初始化数据
        connections = [];
        currentCell = null;
        isDrawing = false;
        startCell = null;

        // 清除所有连接线
        document
            .querySelectorAll(".connection")
            .forEach((el) => el.remove());
    }

    // 处理选项按钮点击
    document.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', function () {
            const group = this.parentElement.dataset.group;
            const option = this.dataset.option;

            // 获取当前单元格数据
            const row = parseInt(currentCell.dataset.row);
            const col = parseInt(currentCell.dataset.col);
            const cellKey = `${row},${col}`;

            // 初始化表单数据
            if (!gridData[cellKey].formData) {
                gridData[cellKey].formData = {};
            }

            // 杂疑类型的特殊处理
            if (gridData[cellKey].type === 'zayi') {
                // 如果是选择了1/2题的选项
                if (group === 'more' || group === 'normal') {
                    // 清除同组其他选项的选中状态
                    this.parentElement.querySelectorAll('.option-button').forEach(btn => {
                        btn.classList.remove('selected');
                    });

                    // 如果选择了1/2题选项，需要取消结局节点
                    const endButton = document.querySelector('.form-section.zayi [data-group="end"] .option-button');
                    if (endButton.classList.contains('selected')) {
                        endButton.classList.remove('selected');
                        delete gridData[cellKey].formData.end;
                    }

                    // 保存当前选项
                    gridData[cellKey].formData[group] = option;
                }
                // 如果是选择了结局节点
                else if (group === 'end') {
                    // 清除1/2题所有选项的选中状态
                    document.querySelectorAll('.form-section.zayi [data-group="more"] .option-button').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    document.querySelectorAll('.form-section.zayi [data-group="normal"] .option-button').forEach(btn => {
                        btn.classList.remove('selected');
                    });

                    // 清除1/2题数据
                    delete gridData[cellKey].formData.more;
                    delete gridData[cellKey].formData.normal;

                    // 保存当前选项
                    gridData[cellKey].formData.end = option;
                }
            }
            // 其他类型的处理（保持原样）
            else {
                // 如果是分组选项，先清除同组其他选项
                if (group) {
                    // 清除同组其他选项的选中状态
                    this.parentElement.querySelectorAll('.option-button').forEach(btn => {
                        btn.classList.remove('selected');
                    });

                    // 保存当前选项
                    gridData[cellKey].formData[group] = option;
                } else {
                    // 非分组选项，清除所有选项
                    const buttonsContainer = this.closest('.option-buttons');
                    buttonsContainer.querySelectorAll('.option-button').forEach(btn => {
                        btn.classList.remove('selected');
                    });

                    // 保存当前选项
                    const sectionType = this.closest('.form-section').classList[1];
                    gridData[cellKey].formData[sectionType] = option;
                }
            }

            // 设置当前按钮为选中状态
            this.classList.add('selected');

            // 设置按钮颜色
            const typeColors = {
                huoluan: "var(--huoluan-color)",
                chuanshuo: "var(--chuanshuo-color)",
                zayi: "var(--zayi-color)",
                gusi: "var(--gusi-color)",
                changle: "var(--changle-color)",
                choumou: "var(--choumou-color)",
                shiyi: "var(--shiyi-color)",
                yiyu: "var(--yiyu-color)"
            };
            this.style.setProperty('--current-color', typeColors[gridData[cellKey].type] || "var(--unknown-color)");
        });
    });



    // 处理单元格鼠标按下事件
    function handleCellMouseDown(e) {
        const cell = e.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);


        // 左键点击 绘制
        if (e.button === 0) {
            isDragging = true; // 设置拖拽状态
            isDrawing = true;
            startCell = { row, col };
            currentCell = cell;

            e.preventDefault();
            e.stopPropagation();
        } else if (e.button === 2 && !cell.classList.contains("start")) {
            // 右键点击，则切换开关状态 
            currentCell = cell;
            toggleCurrentCell();

            e.preventDefault();
            e.stopPropagation();
        } else {
            return;
        }
    }

    function handleMouseMove(e) {
        if (!isDrawing) return;

        // 防止在拖动时选中文本
        e.preventDefault();
    }
    function handleMouseUp(e) {
        if (isDrawing) {
            isDrawing = false;
            isDragging = false; // 清除拖拽状态
            startCell = null;
            currentCell = null;

            e.preventDefault();
            e.stopPropagation();
        }
    }

    // 处理单元格鼠标进入事件
    function handleCellMouseEnter(e) {
        if (!isDrawing) return;

        const cell = e.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // 检查是否是相邻单元格
        if (
            Math.abs(row - startCell.row) +
            Math.abs(col - startCell.col) ===
            1
        ) {
            const connectionKey1 = `${startCell.row},${startCell.col}-${row},${col}`;
            const connectionKey2 = `${row},${col}-${startCell.row},${startCell.col}`;

            // 检查连接是否已存在
            const existingIndex = connections.findIndex(
                (conn) =>
                    conn.key === connectionKey1 ||
                    conn.key === connectionKey2
            );

            if (existingIndex >= 0) {
                // 移除连接
                connections.splice(existingIndex, 1);
                document
                    .querySelector(
                        `.connection[data-key="${connectionKey1}"], .connection[data-key="${connectionKey2}"]`
                    )
                    ?.remove();
            } else {
                // 添加新连接
                const connection = {
                    key: connectionKey1,
                    row1: startCell.row,
                    col1: startCell.col,
                    row2: row,
                    col2: col,
                };
                connections.push(connection);
                drawConnection(connection);
            }

            // 更新起始点为当前单元格
            startCell = { row, col };
        }
    }

    // 处理单元格鼠标滚轮事件
    function handleCellMouseWheel(event) {
        // 如果滚轮模式未启用，则返回
        if (
            !document.getElementById("cell-swithed-by-wheel")
                .checked
        ) {
            return;
        }

        // 获取当前单元格
        const cell = event.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellKey = `${row},${col}`;

        // 找到本类型的下一个类型
        let types = Object.keys(cellTypeNames);
        let index = types.indexOf(gridData[cellKey].type);
        // 如果没找到就返回
        if (index === -1) {
            return;
        }

        currentCell = cell;

        // 计算下一个类型的index
        index += event.deltaY > 0 ? 1 : -1;
        index = (index + types.length) % types.length;
        changeCurrentCellType(types[index]);

        event.preventDefault();
    }

    // 绘制连接线
    function drawConnection(connection) {
        const cellSize = parseInt(
            getComputedStyle(
                document.documentElement
            ).getPropertyValue("--grid-size")
        );
        const gapSize = parseInt(
            getComputedStyle(
                document.documentElement
            ).getPropertyValue("--grid-gap")
        );

        const line = document.createElement("div");
        line.className = "connection";
        line.dataset.key = connection.key;

        // 检查两个端点是否都是unknown类型
        const cell1Key = `${connection.row1},${connection.col1}`;
        const cell2Key = `${connection.row2},${connection.col2}`;
        const cell1Type = gridData[cell1Key]?.type;
        const cell2Type = gridData[cell2Key]?.type;

        if (cell1Type === 'unknown' && cell2Type === 'unknown') {
            line.style.backgroundColor = 'var(--line-color-unknown)';
        }

        if (connection.row1 === connection.row2) {
            // 水平连接
            line.classList.add("horizontal");
            const left = Math.min(connection.col1, connection.col2);
            const width = Math.abs(
                connection.col1 - connection.col2
            );

            line.style.left = `${(left - 1) * (cellSize + gapSize) + cellSize
                }px`;
            line.style.top = `${(connection.row1 - 1) * (cellSize + gapSize)
                }px`;
            line.style.width = `${width * (cellSize + gapSize) - cellSize + gapSize
                }px`;
        } else {
            // 垂直连接
            line.classList.add("vertical");
            const top = Math.min(connection.row1, connection.row2);
            const height = Math.abs(
                connection.row1 - connection.row2
            );

            line.style.left = `${(connection.col1 - 1) * (cellSize + gapSize)
                }px`;
            line.style.top = `${(top - 1) * (cellSize + gapSize) + cellSize
                }px`;
            line.style.height = `${height * (cellSize + gapSize) - cellSize + gapSize
                }px`;
        }

        gridContainer.appendChild(line);
    }

    // 处理单元格点击事件
    function handleCellClick(e) {
        const cell = e.currentTarget;

        // 起始点不可编辑
        if (cell.classList.contains("start")) return;

        // 停止绘制连接
        isDrawing = false;
        startCell = null;

        // 如果点击的是当前已选中的单元格，则关闭弹窗
        if (currentCell === cell) {
            saveCellData();
            popup.classList.add("hidden");
            currentCell = null;
            return;
        }

        // 先保存当前cell的数据并关闭popup
        if (currentCell) {
            saveCellData();
            if (!popup.classList.contains("hidden")) {
                popup.classList.add("hidden");
            }
            // 移除图片上传区域
            const imageSection = popup.querySelector(".image-upload-section");
            if (imageSection) {
                imageSection.remove();
            }
        }

        // 设置新的当前单元格
        currentCell = cell;

        // 显示新cell的弹窗
        showPopupForCell(cell);
    }

    function toggleCurrentCell() {
        // 立即更新数据
        const row = parseInt(currentCell.dataset.row);
        const col = parseInt(currentCell.dataset.col);
        const cellKey = `${row},${col}`;

        if (gridData[cellKey]) {
            gridData[cellKey].closed = !gridData[cellKey].closed;

            // 立即更新单元格外观
            updateCellAppearance(currentCell, gridData[cellKey]);

            // 更新开关颜色
            const slider =
                document.getElementById("cell-closed-silder");
            if (gridData[cellKey].closed) {
                slider.style.setProperty(
                    "--current-color",
                    "var(--closed-color)"
                );
            } else {
                const typeColors = {
                    huoluan: "var(--huoluan-color)",
                    chuanshuo: "var(--chuanshuo-color)",
                    zayi: "var(--zayi-color)",
                    gusi: "var(--gusi-color)",
                    changle: "var(--changle-color)",
                    choumou: "var(--choumou-color)",
                    shiyi: "var(--shiyi-color)",
                    yiyu: "var(--yiyu-color)",
                    unknown: "var(--unknown-color)",
                    blank: "var(--blank-color)",
                };
                slider.style.setProperty(
                    "--current-color",
                    typeColors[gridData[cellKey].type] ||
                    "var(--unknown-color)"
                );
            }
        }
    }

    // 重置表单
    function resetAllFormSections() {
        // 清除所有选项按钮的选中状态
        document.querySelectorAll('.option-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // 重置所有表单输入
        document.getElementById("cell-notes").value = "";
        document.getElementById("cell-closed").checked = true;
    }

    // 显示单元格的弹窗
    function showPopupForCell(cell) {

        // 重置所有表单状态
        resetAllFormSections();

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellKey = `${row},${col}`;

        // 先移除可能存在的旧图片区域
        const oldImageSection = popup.querySelector(".image-upload-section");
        if (oldImageSection) {
            oldImageSection.remove();
        }

        // 创建新的图片区域
        const previewId = `image-preview-${row}-${col}`;
        const fileInputId = `cell-image-${row}-${col}`;
        const imageSection = document.createElement("div");
        imageSection.className = "popup-section image-upload-section";
        imageSection.innerHTML = `<div class="paste-hint">截图快捷键：Win+Shift+S，截图后按Ctrl+V粘贴到笔记框内（仅限一张）<br><br><span style="color:#ea4c89;">鼠标<b>右键</b>可以快速关闭本笔记卡片。</span></div>
<div class="image-upload">
    <div class="image-preview" id="${previewId}"></div>
</div>`;

        // 插入到笔记区域之后
        const notesSection = popup.querySelector(".popup-section:has(#cell-notes)");
        if (notesSection) {
            notesSection.after(imageSection);
        }

        // 初始化图片显示
        const imagePreview = document.getElementById(previewId);
        if (gridData[cellKey]?.image) {
            imagePreview.style.display = "block";
            imagePreview.innerHTML = `<img src="${gridData[cellKey].image}">`;
        } else {
            imagePreview.style.display = "none";
            imagePreview.innerHTML = "";
        }

        // 设置文件上传事件
        const fileInput = document.getElementById(fileInputId);
        if (fileInput) {
            // 先移除旧的事件监听器
            fileInput.replaceWith(fileInput.cloneNode(true));
            // 添加新的事件监听器
            document
                .getElementById(fileInputId)
                .addEventListener("change", function (e) {
                    handleImageUpload(e.target.files[0], cellKey);
                });
        }

        // 修改粘贴事件监听
        document.addEventListener("paste", function (e) {
            if (popup.contains(document.activeElement)) {
                const activeCell = currentCell;
                if (activeCell) {
                    const row = activeCell.dataset.row;
                    const col = activeCell.dataset.col;
                    const cellKey = `${row},${col}`;

                    const items = e.clipboardData.items;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                            handleImageUpload(
                                items[i].getAsFile(),
                                cellKey
                            );
                            e.preventDefault();
                            break;
                        }
                    }
                }
            }
        });

        const cellData = gridData[cellKey];

        // 添加开关事件监听
        const toggleSwitch = document.getElementById("cell-closed");
        toggleSwitch.addEventListener("change", toggleCurrentCell);

        // 更新弹窗位置
        const rect = cell.getBoundingClientRect();

        // 更新弹窗标题
        document.getElementById(
            "popup-title"
        ).textContent = `编辑格点 (${row}, ${col})`;

        // 更新开关状态
        cellClosedCheckbox.checked = !cellData.closed;

        // 根据类型恢复表单数据
        switch (cellData.type) {
            case 'changle':
                if (cellData.formData?.changle) {
                    const button = document.querySelector(`.form-section.changle .option-button[data-option="${cellData.formData.changle}"]`);
                    if (button) {
                        button.classList.add('selected');
                        button.style.setProperty('--current-color', "var(--changle-color)");
                    }
                }
                break;

            case 'zayi':
                if (cellData.formData) {
                    // 恢复更多奖励选项
                    if (cellData.formData.more) {
                        const button = document.querySelector(`.form-section.zayi [data-group="more"] .option-button[data-option="${cellData.formData.more}"]`);
                        if (button) {
                            button.classList.add('selected');
                            button.style.setProperty('--current-color', "var(--zayi-color)");
                        }
                    }
                    // 恢复普通奖励选项
                    if (cellData.formData.normal) {
                        const button = document.querySelector(`.form-section.zayi [data-group="normal"] .option-button[data-option="${cellData.formData.normal}"]`);
                        if (button) {
                            button.classList.add('selected');
                            button.style.setProperty('--current-color', "var(--zayi-color)");
                        }
                    }
                    // 恢复结局节点选项
                    if (cellData.formData.end) {
                        const button = document.querySelector(`.form-section.zayi [data-group="end"] .option-button[data-option="${cellData.formData.end}"]`);
                        if (button) {
                            button.classList.add('selected');
                            button.style.setProperty('--current-color', "var(--zayi-color)");
                        }
                    }
                }
                break;

            case 'shiyi':
                if (cellData.formData?.shiyi) {
                    const button = document.querySelector(`.form-section.shiyi .option-button[data-option="${cellData.formData.shiyi}"]`);
                    if (button) {
                        button.classList.add('selected');
                        button.style.setProperty('--current-color', "var(--shiyi-color)");
                    }
                }
                break;
        }
        // 显示对应的表单部分
        formSections.forEach((section) => {
            section.classList.add("hidden");
        });
        document
            .querySelector(`.form-section.${cellData.type}`)
            ?.classList.remove("hidden");



        // 填充表单数据
        document.getElementById("cell-notes").value =
            cellData.notes || "";

        // 显示弹窗
        popup.classList.remove("hidden");
    }

    function handleImageUpload(file, cellKey) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const [row, col] = cellKey.split(",");
            const previewId = `image-preview-${row}-${col}`;
            const imagePreview = document.getElementById(previewId);

            if (imagePreview) {
                imagePreview.style.display = "block";
                imagePreview.innerHTML = `<img src="${e.target.result}">`;

                // 保存数据
                if (!gridData[cellKey]) gridData[cellKey] = {};
                gridData[cellKey].image = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }

    // 保存单元格数据
    function saveCellData() {
        if (!currentCell) return;

        const row = parseInt(currentCell.dataset.row);
        const col = parseInt(currentCell.dataset.col);
        const cellKey = `${row},${col}`;

        // 确保有数据
        if (!gridData[cellKey]) return;

        const cellData = gridData[cellKey];

        // 保存通用数据
        cellData.notes = document.getElementById("cell-notes").value;
        cellData.closed = !cellClosedCheckbox.checked;

        // 保存图片数据
        const previewId = `image-preview-${row}-${col}`;
        const imagePreview = document.getElementById(previewId);
        if (imagePreview && imagePreview.style.display === "block" && imagePreview.querySelector("img")) {
            gridData[cellKey].image = imagePreview.querySelector("img").src;
        } else {
            delete gridData[cellKey].image;
        }

        // 不需要额外保存表单数据，因为option-button的点击事件已经处理了
    }

    // 更新单元格外观
    function updateCellAppearance(cell, cellData) {
        // 移除所有类型类
        typeButtons.forEach((btn) => {
            cell.classList.remove(btn.dataset.type);
        });

        // 添加当前类型类
        cell.classList.add(cellData.type);

        // 更新关闭状态
        if (cellData.closed) {
            cell.classList.add("closed");
        } else {
            cell.classList.remove("closed");
        }

        // 更新标签
        const label = cell.querySelector(".grid-label");
        if (label) {
            label.textContent =
                cellTypeNames[cellData.type] || "未知";
        }

        // 更新图标
        const iconContainer = cell.querySelector(".grid-icon");
        // 更新图标 - 关闭状态下也保留原类型图标
        iconContainer.innerHTML =
            iconTemplates[cellData.type] || iconTemplates.unknown;

        // 设置开关颜色
        const slider =
            document.getElementById("cell-closed-silder");
        if (cellData.closed) {
            slider.style.setProperty(
                "--current-color",
                "var(--closed-color)"
            );
        } else {
            // 根据当前类型设置开关颜色
            const typeColors = {
                huoluan: "var(--huoluan-color)",
                chuanshuo: "var(--chuanshuo-color)",
                zayi: "var(--zayi-color)",
                gusi: "var(--gusi-color)",
                changle: "var(--changle-color)",
                choumou: "var(--choumou-color)",
                shiyi: "var(--shiyi-color)",
                yiyu: "var(--yiyu-color)",
                unknown: "var(--unknown-color)",
                blank: "var(--blank-color)",
            };
            slider.style.setProperty(
                "--current-color",
                typeColors[cellData.type] || "var(--unknown-color)"
            );
        }

        // 如果当前单元格有快捷菜单且正在显示，则更新菜单
        if (quickMenu.style.display === 'flex' &&
            currentCell === cell &&
            ['changle', 'zayi', 'shiyi'].includes(cellData.type)) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellKey = `${row},${col}`;
            showQuickMenu(cell, cellKey);
        }

        // 更新标记
        updateCellBadge(cell, cellData);

        // 更新相关连接线的颜色
        updateConnectedLinesColor(cell);
    }

    // 新增函数：更新与单元格相关的连接线颜色
    function updateConnectedLinesColor(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellKey = `${row},${col}`;
        const cellType = gridData[cellKey]?.type;

        // 查找所有与该单元格相关的连接线
        connections.forEach(conn => {
            const isConnected = (conn.row1 === row && conn.col1 === col) ||
                (conn.row2 === row && conn.col2 === col);

            if (isConnected) {
                const otherCellKey = (conn.row1 === row && conn.col1 === col) ?
                    `${conn.row2},${conn.col2}` :
                    `${conn.row1},${conn.col1}`;
                const otherCellType = gridData[otherCellKey]?.type;

                const line = document.querySelector(`.connection[data-key="${conn.key}"]`);
                if (line) {
                    if (cellType === 'unknown' && otherCellType === 'unknown') {
                        line.style.backgroundColor = 'var(--line-color-unknown)';
                    } else {
                        line.style.backgroundColor = 'var(--line-color)';
                    }
                }
            }
        });
    }

    // 事件监听器
    generateBtn.addEventListener("click", function () {
        const rows = parseInt(rowsInput.value) || 5;
        const cols = parseInt(colsInput.value) || 7;
        const startRow = parseInt(startRowInput.value) || 3;
        const startCol = parseInt(startColInput.value) || 4;

        initializeGrid(rows, cols, startRow, startCol);
    });

    resetBtn.addEventListener("click", function () {
        if (
            confirm(
                "确定要重置所有数据吗？这将清除所有格点信息和连接。"
            )
        ) {
            const rows = parseInt(rowsInput.value) || 5;
            const cols = parseInt(colsInput.value) || 7;
            const startRow = parseInt(startRowInput.value) || 3;
            const startCol = parseInt(startColInput.value) || 4;

            initializeGrid(rows, cols, startRow, startCol);
        }
    });

    // 修改recmapBtn的事件监听器
    recmapBtn.addEventListener("click", function () {
        document
            .getElementById("recmap-popup")
            .classList.remove("hidden");
    });

    // 添加粘贴事件监听
    document.addEventListener("paste", function (e) {
        const recmapPopup = document.getElementById("recmap-popup");
        if (!recmapPopup.classList.contains("hidden")) {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const file = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        recmapImageData = e.target.result;
                        const preview =
                            document.getElementById(
                                "recmap-preview"
                            );
                        preview.innerHTML = `<img src="${recmapImageData}">`;
                        preview.style.display = "block";
                    };
                    reader.readAsDataURL(file);
                    e.preventDefault();
                    break;
                }
            }
        }
    });

    // 确认识别按钮
    document
        .getElementById("confirm-recmap")
        .addEventListener("click", function () {
            if (!recmapImageData) {
                alert("请先粘贴地图截图");
                return;
            }

            // 异步调用识别函数
            recognizeGrid(recmapImageData)
                .then((recognitionResult) => {
                    console.log("识别结果:", recognitionResult);
                    // 在这里使用 recognitionResult 进行后续操作

                    // 根据识别结果更新网格
                    updateGridFromRecognition(recognitionResult);

                    // 关闭弹窗
                    document
                        .getElementById("recmap-popup")
                        .classList.add("hidden");
                })
                .catch((error) => {
                    console.error("识别失败:", error);
                });
        });

    // 取消按钮
    document
        .getElementById("cancel-recmap")
        .addEventListener("click", function () {
            document
                .getElementById("recmap-popup")
                .classList.add("hidden");
        });

    /**
     * 根据识别结果更新网格
     * param {Object} result - recognizeMap函数的返回结果
     */
    // 修改updateGridFromRecognition函数
    function updateGridFromRecognition(result) {
        const preserveData = document.getElementById("preserve-data").checked;

        if (!preserveData) {
            // 如果不保留现有数据，则完全重置
            rowsInput.value = result.grid.length;
            colsInput.value = result.grid[0].length;
            startRowInput.value = result.startPos[0];
            startColInput.value = result.startPos[1];

            // 重新初始化网格
            initializeGrid(
                result.grid.length,
                result.grid[0].length,
                result.startPos[0],
                result.startPos[1]
            );
        }

        // 设置格子类型和状态
        for (let r = 0; r < result.grid.length; r++) {
            for (let c = 0; c < result.grid[r].length; c++) {
                const cellKey = `${r + 1},${c + 1}`;

                if (preserveData) {
                    // 如果保留现有数据，只更新类型和开关状态
                    if (gridData[cellKey]) {
                        // 保存原有数据
                        const oldData = { ...gridData[cellKey] };
                        gridData[cellKey] = {
                            ...oldData, // 保留原有数据
                            type: result.grid[r][c], // 只更新类型
                            closed: result.stats[r][c] // 只更新开关状态
                        };
                    } else {
                        // 如果单元格不存在，创建新数据
                        gridData[cellKey] = {
                            type: result.grid[r][c],
                            closed: result.stats[r][c],
                            notes: "",
                            image: null,
                            formData: {}
                        };
                    }
                } else {
                    // 否则完全重置
                    gridData[cellKey] = {
                        type: result.grid[r][c],
                        closed: result.stats[r][c],
                        notes: "",
                        image: null,
                        formData: {}
                    };
                }

                // 更新单元格显示
                const cell = document.querySelector(
                    `.grid-cell[data-row="${r + 1}"][data-col="${c + 1}"]`
                );
                if (cell) {
                    updateCellAppearance(cell, gridData[cellKey]);
                }

                // 如果是起始点，强制设置为起始点样式
                if (
                    r + 1 === result.startPos[0] &&
                    c + 1 === result.startPos[1]
                ) {
                    cell.classList.add("start");
                    cell.style.backgroundColor = "black";
                    const label = cell.querySelector(".grid-label");
                    if (label) label.textContent = "起始点";
                }
            }
        }

        if (!preserveData) {
            // 如果不保留现有数据，则绘制新的连接线
            connections = [];
            document.querySelectorAll(".connection").forEach(el => el.remove());

            result.connections.forEach((conn) => {
                const [r1, c1, r2, c2] = conn;
                const connection = {
                    key: `${r1},${c1}-${r2},${c2}`,
                    row1: r1,
                    col1: c1,
                    row2: r2,
                    col2: c2,
                };
                connections.push(connection);
                drawConnection(connection);
            });
        }
    }

    // 设置当前单元格类型
    function changeCurrentCellType(cellType) {
        if (!currentCell) return;

        const row = parseInt(currentCell.dataset.row);
        const col = parseInt(currentCell.dataset.col);
        const cellKey = `${row},${col}`;
        const newType = cellType;

        // 保存当前数据
        saveCellData();

        // 更新类型
        if (!gridData[cellKey]) {
            gridData[cellKey] = {
                type: newType,
                closed: false,
                notes: "",
            };
        } else {
            // 如果切换到不同类型，清除旧类型的表单数据
            if (gridData[cellKey].type !== newType) {
                gridData[cellKey].formData = {};
            }
            gridData[cellKey].type = newType;
        }

        // 重置表单显示
        resetAllFormSections();

        // 显示对应的表单部分
        formSections.forEach((section) => {
            section.classList.add("hidden");
        });
        document.querySelector(`.form-section.${newType}`)?.classList.remove("hidden");

        // 更新单元格外观
        updateCellAppearance(currentCell, gridData[cellKey]);
    }

    typeButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            // 更改当前单元格类型
            changeCurrentCellType(btn.dataset.type);
        });
    });

    document.addEventListener("mousedown", function (e) {
        if (
            popup.contains(e.target) ||
            (currentCell && currentCell.contains(e.target))
        ) {
            return;
        }

        if (!popup.classList.contains("hidden")) {
            saveCellData();

            // 移除图片上传区域
            const imageSection = popup.querySelector(
                ".image-upload-section"
            );
            if (imageSection) {
                imageSection.remove();
            }

            popup.classList.add("hidden");
            currentCell = null;
        }
    });

    // 添加新的处理函数
    function handleCellMouseEnterForQuickMenu(e) {
        // 如果处于拖拽状态，则不显示菜单
        if (isDragging) return;

        const cell = e.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellKey = `${row},${col}`;

        if (!gridData[cellKey] ||
            !['changle', 'zayi', 'shiyi'].includes(gridData[cellKey].type) ||
            cell.classList.contains("start")) {
            return;
        }

        if (quickMenuTimeout) {
            clearTimeout(quickMenuTimeout);
        }

        quickMenuTimeout = setTimeout(() => {
            if (cell.matches(':hover') && !isDragging) { // 添加拖拽状态检查
                showQuickMenu(cell, cellKey);
            }
        }, 200);
    }

    function handleCellMouseLeaveForQuickMenu(e) {
        if (quickMenuTimeout) {
            clearTimeout(quickMenuTimeout);
        }

        // 只有当鼠标没有移动到菜单上时才隐藏
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !relatedTarget.closest('.quick-menu')) {
            quickMenu.style.display = 'none';
        }
    }

    function showQuickMenu(cell, cellKey) {
        // 清除菜单内容
        quickMenu.innerHTML = '';

        // 设置菜单位置
        const rect = cell.getBoundingClientRect();
        quickMenu.style.left = `${rect.right + 10}px`;
        quickMenu.style.top = `${rect.top}px`;

        // 根据单元格类型添加对应的选项按钮
        const cellData = gridData[cellKey];
        const type = cellData.type;

        // 获取对应类型的表单部分
        const formSection = document.querySelector(`.form-section.${type}`);
        if (!formSection) return;

        // 杂疑类型的特殊处理
        if (type === 'zayi') {
            // 更多奖励
            const moreButtons = formSection.querySelectorAll('[data-group="more"] .option-button');
            addButtonsToQuickMenu(moreButtons, "更多奖励", cell, cellKey, cellData.formData?.more);

            // 添加分割线
            const divider1 = document.createElement('div');
            divider1.className = 'quick-menu-divider';
            quickMenu.appendChild(divider1);

            // 普通奖励
            const normalButtons = formSection.querySelectorAll('[data-group="normal"] .option-button');
            addButtonsToQuickMenu(normalButtons, "普通奖励", cell, cellKey, cellData.formData?.normal);

            // 添加分割线
            const divider2 = document.createElement('div');
            divider2.className = 'quick-menu-divider';
            quickMenu.appendChild(divider2);

            // 结局节点
            const endButtons = formSection.querySelectorAll('[data-group="end"] .option-button');
            addButtonsToQuickMenu(endButtons, "结局节点", cell, cellKey, cellData.formData?.end);
        } else {
            // 其他类型正常处理
            const optionButtons = formSection.querySelectorAll('.option-button');
            const selectedOption = cellData.formData?.[type];
            addButtonsToQuickMenu(optionButtons, null, cell, cellKey, selectedOption);
        }





        // 显示菜单
        quickMenu.style.display = 'flex';
    }

    // 辅助函数：添加按钮到快捷菜单
    function addButtonsToQuickMenu(buttons, groupTitle, cell, cellKey, selectedOption) {
        if (groupTitle) {
            const title = document.createElement('div');
            title.className = 'quick-menu-title';
            title.textContent = groupTitle;
            title.style.fontSize = '11px';
            title.style.color = '#999';
            title.style.padding = '4px 8px';
            quickMenu.appendChild(title);
        }

        buttons.forEach(button => {
            const quickButton = document.createElement('button');
            quickButton.className = 'quick-menu-button';
            quickButton.textContent = button.textContent;

            // 根据当前单元格的实际数据设置按钮样式
            const option = button.dataset.option;
            const isSelected = selectedOption === option;

            // 设置按钮背景色
            const typeColors = {
                huoluan: "var(--huoluan-color)",
                chuanshuo: "var(--chuanshuo-color)",
                zayi: "var(--zayi-color)",
                gusi: "var(--gusi-color)",
                changle: "var(--changle-color)",
                choumou: "var(--choumou-color)",
                shiyi: "var(--shiyi-color)",
                yiyu: "var(--yiyu-color)"
            };
            const cellType = gridData[cellKey].type;
            const baseColor = typeColors[cellType] || "var(--unknown-color)";

            quickButton.style.backgroundColor = isSelected ? baseColor : "#444";

            quickButton.addEventListener('click', (e) => {
                e.stopPropagation();

                // 临时设置当前单元格
                const prevCurrentCell = currentCell;
                currentCell = cell;

                // 模拟点击原按钮
                button.click();

                // 更新单元格外观
                updateCellAppearance(cell, gridData[cellKey]);

                // 恢复之前的currentCell
                currentCell = prevCurrentCell;

                // 隐藏菜单
                //quickMenu.style.display = 'none';
            });

            quickMenu.appendChild(quickButton);
        });
    }

    // 确保菜单也能响应鼠标悬停
    quickMenu.addEventListener('mouseenter', () => {
        if (quickMenuTimeout) {
            clearTimeout(quickMenuTimeout);
        }
    });

    // 阻止菜单点击事件冒泡
    quickMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 修改 handleCellMouseLeaveForQuickMenu 函数
    function handleCellMouseLeaveForQuickMenu(e) {
        if (quickMenuTimeout) {
            clearTimeout(quickMenuTimeout);
        }

        // 只有当鼠标没有移动到菜单上时才设置延迟隐藏
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !relatedTarget.closest('.quick-menu')) {
            quickMenuTimeout = setTimeout(() => {
                // 再次检查鼠标是否在菜单或单元格上
                if (!quickMenu.matches(':hover') && !currentCell?.matches(':hover')) {
                    quickMenu.style.display = 'none';
                }
            }, 200); // 300ms的延迟
        }
    }

    // 添加菜单的 mouseleave 事件
    quickMenu.addEventListener('mouseleave', (e) => {
        if (quickMenuTimeout) {
            clearTimeout(quickMenuTimeout);
        }

        quickMenuTimeout = setTimeout(() => {
            // 检查鼠标是否在关联的单元格上
            if (!currentCell?.matches(':hover')) {
                quickMenu.style.display = 'none';
            }
        }, 200);
    });

    // 新增函数：更新单元格标记
    function updateCellBadge(cell, cellData) {
        // 移除旧标记
        const oldBadge = cell.querySelector('.cell-badge-container');
        if (oldBadge) {
            oldBadge.remove();
        }

        // 如果没有选中选项或单元格已关闭，则不显示标记
        if (!cellData.formData || cellData.closed) {
            return;
        }

        // 根据类型获取需要显示的图标
        let icons = [];
        const type = cellData.type;

        if (type === 'changle' && cellData.formData.changle) {
            icons.push(cellData.formData.changle);
        }
        else if (type === 'zayi') {
            // 杂疑类型可能有多个选项
            if (cellData.formData.more) {
                icons.push(cellData.formData.more);
            }
            if (cellData.formData.normal) {
                icons.push(cellData.formData.normal);
            }
            if (cellData.formData.end) {
                icons.push(cellData.formData.end);
            }
        }
        else if (type === 'shiyi' && cellData.formData.shiyi) {
            icons.push(cellData.formData.shiyi);
        }

        // 如果有需要显示的图标
        if (icons.length > 0) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'cell-badge-container';

            icons.forEach(iconName => {
                if (RewardIcons[iconName]) {
                    const badge = document.createElement('div');
                    badge.className = 'cell-badge';
                    badge.innerHTML = RewardIcons[iconName];
                    badgeContainer.appendChild(badge);
                }
            });

            cell.appendChild(badgeContainer);
        }
    }

    // 识别地图的示例函数
    /**
     * 识别地图函数示例
     * @param {string} imageData - 图片的Base64数据URL
     * @returns {Object} 识别结果对象，包含:
     * {
     *   grid: Array<Array<string>>, // 二维数组，表示每个格子的类型
     *   connections: Array<[number, number, number, number]>, // 连接线数组，每个元素是[r1,c1,r2,c2]
     *   startPos: [number, number] // 起始位置[row, col]
     * }
     */
    /*function recognizeMap(imageData) {
    // 这里只是示例，实际应该调用图像识别算法
    console.log("识别图片:", imageData);

    // 示例返回数据 - 5x7网格，起始点在(3,4)
    return {
        grid: [
            ['unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'],
            ['unknown', 'huoluan', 'chuanshuo', 'zayi', 'gusi', 'changle', 'unknown'],
            ['unknown', 'choumou', 'shiyi', 'unknown', 'yiyu', 'unknown', 'unknown'],
            ['unknown', 'unknown', 'unknown', 'huoluan', 'chuanshuo', 'zayi', 'unknown'],
            ['unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown']
        ],
        stats: [
            [false, false, false, false, false, false, false, ],
            [false, false, false, true, false, false, false, ],
            [false, false, false, false, true, false, false, ],
            [false, false, false, false, false, false, false, ],
            [false, false, false, false, false, false, false, ]
        ],
        connections: [
            [2, 2, 2, 3], // 祸乱(2,2)连接到传说(2,3)
            [2, 3, 2, 4], // 传说(2,3)连接到杂疑(2,4)
            [2, 4, 2, 5], // 杂疑(2,4)连接到故肆(2,5)
            [2, 5, 3, 5], // 故肆(2,5)连接到易与(3,5)
            [3, 2, 3, 3], // 筹谋(3,2)连接到起始点(3,3)
        ],
        startPos: [3, 4] // 起始点在(3,4)
    };
}*/

    // 初始化默认网格
    initializeGrid(5, 7, 3, 4);
});