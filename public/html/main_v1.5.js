document.addEventListener("DOMContentLoaded", function () {
    // 全局变量
    let gridData = {};
    let connections = [];
    let currentCell = null;
    let isDrawing = false;
    let startCell = null;
    let imageData = {};
    // 识别用的地图
    let recmapImageData = null;
    //悬浮菜单超时
    let quickMenu = document.getElementById("quick-menu");
    let quickMenuTimeout = null;
    // 拖拽状态超时时关闭悬浮菜单
    let dragStartTime = 0;
    const DRAG_THRESHOLD = 200; // 200ms后关闭菜单
    //笔记是否正在编辑（悬浮菜单）
    let isEditingNotes = false;
    // 是否正在拖拽
    let isDragging = false;

    // 初始化 IndexedDB
    IndexedDBManager.openDatabase()
        .then(() => {
            console.log('IndexedDB 初始化成功');
            // 初始化应用
            initializeApp();
        })
        .catch(error => {
            console.error('IndexedDB 初始化失败:', error);
            showTemporaryMessage('存储系统初始化失败，数据可能无法保存', 'error');
            // 即使数据库初始化失败，也继续执行应用初始化
            initializeApp();
        });

    function initializeApp() {
        // =============== IndexedDB 存储功能 START ===============

        // 保存数据到 IndexedDB
        function saveToLocalStorage() {
            try {
                const dataToSave = {
                    gridData: gridData,
                    connections: connections,
                    candleValue: document.getElementById('candle')?.value || 0,
                    gridConfig: {
                        rows: parseInt(document.getElementById('rows')?.value) || 5,
                        cols: parseInt(document.getElementById('cols')?.value) || 7,
                        startRow: parseInt(document.getElementById('start-row')?.value) || 3,
                        startCol: parseInt(document.getElementById('start-col')?.value) || 4
                    }
                };

                IndexedDBManager.saveToIndexedDB(dataToSave)
                    .then(() => {
                        const timeStr = new Date().toLocaleString('zh-CN');
                        showExtraInfo(`数据自动保存：${timeStr}`)
                    })
                    .catch(error => {
                        console.error('保存数据到 IndexedDB 失败:', error);
                        if (error.name === 'QuotaExceededError') {
                            showExtraInfo('⚠ 空间不足，可能图片过多导致数据无法自动保存 ⚠');
                        } else {
                            showExtraInfo(`⚠ 保存数据到 IndexedDB 失败: ${error} ⚠`);
                        }
                    });
            } catch (error) {
                console.error('保存数据时发生错误:', error);
                showExtraInfo(`⚠ 保存数据时发生错误: ${error} ⚠`);
            }
        }

        // 从 IndexedDB 加载数据
        function loadFromLocalStorage() {
            return IndexedDBManager.loadFromIndexedDB()
                .then(data => data)
                .catch(error => {
                    console.error('从 IndexedDB 加载数据失败:', error);
                    return null;
                });
        }

        // 恢复数据到界面
        function restoreData(data) {
            if (!data) return false;

            try {
                // 恢复网格配置
                if (data.gridConfig) {
                    document.getElementById('rows').value = data.gridConfig.rows;
                    document.getElementById('cols').value = data.gridConfig.cols;
                    document.getElementById('start-row').value = data.gridConfig.startRow;
                    document.getElementById('start-col').value = data.gridConfig.startCol;
                }

                // 恢复烛火值
                if (data.candleValue !== undefined) {
                    document.getElementById('candle').value = data.candleValue;
                }

                // 重新初始化网格
                const rows = data.gridConfig?.rows || 5;
                const cols = data.gridConfig?.cols || 7;
                const startRow = data.gridConfig?.startRow || 3;
                const startCol = data.gridConfig?.startCol || 4;

                initializeGrid(rows, cols, startRow, startCol);

                // 恢复网格数据
                if (data.gridData) {
                    gridData = data.gridData;

                    // 更新每个格子的显示
                    Object.keys(gridData).forEach(cellKey => {
                        const [row, col] = cellKey.split(',').map(Number);
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (cell && gridData[cellKey]) {
                            const cellData = gridData[cellKey];

                            // 更新格子类型
                            updateCellType(cell, cellData.type);

                            // 更新关闭状态
                            if (cellData.closed) {
                                cell.classList.add('closed');
                            } else {
                                cell.classList.remove('closed');
                            }

                            // 更新收藏状态
                            if (cellData.favorite) {
                                updateStarAppearance(cell, true);
                            }

                            // 更新标记显示
                            if (cellData.formData || cellData.type === 'huoluan') {
                                updateCellBadge(cell, cellData);
                            }

                            // 设置起始点
                            if (row == startRow && col == startCol) {
                                cell.classList.add("start");
                                cell.classList.remove("unknown");
                                cell.style.backgroundColor = "black";
                                cell.style.cursor = "default";
                                const label = cell.querySelector(".grid-label");
                                if (label) {
                                    label.textContent = "起始点";
                                }
                            }
                        }
                    });
                }

                // 恢复连接线
                if (data.connections) {
                    connections = data.connections;
                    redrawConnections();
                }

                return true;
            } catch (error) {
                console.error('恢复数据时出错:', error);
                return false;
            }
        }

        // 清除 IndexedDB 数据
        function clearLocalStorage() {
            return IndexedDBManager.clearIndexedDB()
                .then(() => {
                    console.log('IndexedDB 数据已清除');
                })
                .catch(error => {
                    console.error('清除 IndexedDB 数据失败:', error);
                });
        }

        // 检查gridData是否所有元素都处于初始状态
        function isAllGridDataInInitialState(gridData) {
            if (!gridData || Object.keys(gridData).length === 0) {
                return true; // 空数据算全部初始状态
            }

            return Object.values(gridData).every(cellData =>
                cellData &&
                cellData.type === 'unknown' &&
                cellData.closed === false &&
                cellData.notes === '' &&
                cellData.image === null &&
                cellData.favorite === false
            );
        }

        // 检查是否有历史数据并提示用户
        function checkForHistoryData() {
            loadFromLocalStorage().then(savedData => {
                if (savedData && savedData.timestamp) {
                    // 检查是否所有gridData都处于初始状态，如果是则不使用历史数据
                    if (savedData.gridData && isAllGridDataInInitialState(savedData.gridData)) {
                        clearLocalStorage();
                        return;
                    }

                    const saveTime = new Date(savedData.timestamp);
                    const timeStr = saveTime.toLocaleString('zh-CN');

                    /*const shouldRestore = confirm(
                        `检测到本地保存的进度数据（保存时间：${timeStr}）\n\n是否要恢复上次的进度？\n\n点击"确定"恢复进度，点击"取消"开始新的记录。`
                    );*/

                    // 修改为总是自动更新已储存数据：

                    const restored = restoreData(savedData);
                    if (restored) {
                        showTemporaryMessage('✓ 已恢复历史进度', 'success');
                        showExtraInfo(`已读取本地保存的进度：（保存时间：${timeStr}）`)
                    } else {
                        showTemporaryMessage('⚠ 恢复历史进度失败，将开始新的记录', 'warning');
                        showExtraInfo(` --- 暂无已保存进度 ---`)
                    }

                }
            });
        }
        function showExtraInfo(message) {
            // 显示额外信息
            const extraInfo = document.querySelector('.ex-info')

            extraInfo.innerHTML = ''
            extraInfo.innerHTML = message
            extraInfo.style.animation = 'flashOnce 0.5s ease-in';
            setTimeout(() => {
                extraInfo.style.animation = '';
            }, 500);

        }

        // 消息通知，显示临时消息
        function showTemporaryMessage(message, type = 'info') {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 20px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                opacity: 0.9;
                transition: opacity 0.3s ease;
            `;

            switch (type) {
                case 'success':
                    messageDiv.style.backgroundColor = '#4caf50';
                    break;
                case 'warning':
                    messageDiv.style.backgroundColor = '#ff9800';
                    break;
                case 'error':
                    messageDiv.style.backgroundColor = '#f44336';
                    break;
                default:
                    messageDiv.style.backgroundColor = '#2196f3';
            }

            messageDiv.textContent = message;
            document.body.appendChild(messageDiv);

            setTimeout(() => {
                messageDiv.style.opacity = '0';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }, 3000);
        }

        // 自动保存触发器，500ms防抖
        function triggerAutoSave() {
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(saveToLocalStorage, 500);

            const timeStr = new Date().toLocaleString('zh-CN');
            showExtraInfo(`数据自动保存：${timeStr}`)
        }

        // 使用本地数据时更新格子类型的辅助函数
        function updateCellType(cell, type) {
            if (!cell) return;

            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellKey = `${row},${col}`;

            if (gridData[cellKey]) {
                gridData[cellKey].type = type;
                updateCellAppearance(cell, gridData[cellKey]);
            }
        }

        // 使用本地数据时重绘所有连接线的函数
        function redrawConnections() {
            // 清除现有连接线
            document.querySelectorAll('.connection').forEach(el => el.remove());

            // 重绘每个连接线
            connections.forEach(connection => {
                drawConnection(connection);
            });
        }
        // =============== IndexedDB 存储功能 END ===============


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

        const huoluanStage = {
            S1: {
                name: "地有四难",
                variants: ["四奖励一敌人", "一奖励四敌人（刺箱）"]
            },
            S2: {
                name: "忘形",
                variants: ["得意 + 飞天马桶", "魂灵涡流 + 萨科塔"]
            },
            S3: {
                name: "奇谭",
                variants: ["弹药敌人", "动力装甲"]
            },
            S4: {
                name: "破局",
                variants: ["飞天马桶", "萨科塔"]
            },
            S5: {
                name: "凭器",
                variants: ["飞天马桶 + 圣杯", "倾轧者 + 沙滩车", "萨卡兹 + 赏金猎人（减费）"]
            },
            S6: {
                name: "贪妄",
                variants: ["食人花"]
            },
            S7: {
                name: "不鉴",
                variants: ["腐败 + 凋零骑士", "三杰刘关张"]
            },
            S8: {
                name: "靡靡之音",
                variants: ["巨像 + 颂偶", "骑士团精锐"]
            },
            S9: {
                name: "愠怒",
                variants: ["遗弃者 + 囚犯", "圣堂保育员 + 弹药敌人", "隐身狙 + 大锤"]
            },
            S10: {
                name: "迷惘",
                variants: ["三杰刘关张 + 人间烟火", "遗忘战士 + 魂灵涡流"]
            },

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
            //重置烛火
            resetCandle();


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

                    // 添加星星元素
                    const star = document.createElement("div");
                    star.className = "cell-star";
                    star.innerHTML = "★";
                    star.addEventListener("click", function (e) {
                        e.stopPropagation();
                        toggleFavorite(cell);
                    });
                    cell.appendChild(star);

                    // 在这里定义 cellKey
                    const cellKey = `${r},${c}`;
                    gridData[cellKey] = {
                        type: "unknown",
                        closed: false,
                        notes: "",
                        image: null,
                        favorite: false // 格子收藏状态
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

        // 添加切换收藏状态的函数
        function toggleFavorite(cell) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellKey = `${row},${col}`;

            if (gridData[cellKey]) {
                gridData[cellKey].favorite = !gridData[cellKey].favorite;
                updateStarAppearance(cell, gridData[cellKey].favorite);
                // 触发自动保存
                triggerAutoSave();
            }
        }

        // 更新星星显示状态的函数
        function updateStarAppearance(cell, isFavorite) {
            const star = cell.querySelector(".cell-star");
            if (star) {
                star.classList.toggle("favorite", isFavorite);
                if (isFavorite) {
                    star.style.opacity = "1";
                }
            }
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
                // 祸乱类型的特殊处理
                else if (gridData[cellKey].type === 'huoluan') {
                    // 如果选择了关卡名

                    if (group === 'stage') {
                        // 清除同组其他选项的选中状态
                        this.parentElement.querySelectorAll('.option-button').forEach(btn => {
                            btn.classList.remove('selected');
                        });

                        // 删除已选变体
                        delete gridData[cellKey].formData.variant

                        // 保存当前选项
                        gridData[cellKey].formData[group] = option;

                        // 更新变体菜单
                        updateVariantOptions(option, cellKey)
                    }

                    if (group === 'variant') {
                        // 如果分组是变体

                        // 清除同组其他选项的选中状态
                        this.parentElement.querySelectorAll('.option-button').forEach(btn => {
                            btn.classList.remove('selected');
                        });

                        // 保存当前选项
                        gridData[cellKey].formData[group] = option;

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

                // 触发自动保存
                triggerAutoSave();
            });
        });



        // 修改handleCellMouseDown函数
        function handleCellMouseDown(e) {
            const cell = e.currentTarget;
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            // 左键点击 绘制
            if (e.button === 0) {
                isDragging = true; // 设置拖拽状态
                dragStartTime = Date.now(); // 记录拖拽开始时间
                isDrawing = true;
                startCell = { row, col };
                currentCell = cell;

                // 检查是否应该关闭菜单
                setTimeout(() => {
                    if (isDragging && Date.now() - dragStartTime >= DRAG_THRESHOLD) {
                        quickMenu.style.display = 'none';
                    }
                }, DRAG_THRESHOLD);

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
                dragStartTime = 0;
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
                // 触发自动保存
                triggerAutoSave();
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

            //滚轮后更新快捷菜单
            showQuickMenu(cell, cellKey);

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

                // 触发自动保存
                triggerAutoSave();
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

                case 'huoluan':
                    if (cellData.formData?.stage) {
                        const button = document.querySelector(`.form-section.huoluan [data-group="stage"] .option-button[data-option="${cellData.formData.stage}"]`);
                        if (button) {
                            button.classList.add('selected');
                            button.style.setProperty('--current-color', "var(--huoluan-color)");

                            // 更新变体选项
                            updateVariantOptions(cellData.formData.stage, cellKey);

                            // 如果有选中的变体，恢复选中状态
                            if (cellData.formData.variant) {
                                const variantButton = document.querySelector(`.form-section.huoluan [data-group="variant"] .option-button[data-option="${cellData.formData.variant}"]`);
                                if (variantButton) {
                                    variantButton.classList.add('selected');
                                    variantButton.style.setProperty('--current-color', "var(--huoluan-color)");
                                }
                            }
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
                // 压缩图片
                compressImage(e.target.result, 0.7, function (compressedDataUrl) {
                    const [row, col] = cellKey.split(",");
                    const previewId = `image-preview-${row}-${col}`;
                    const imagePreview = document.getElementById(previewId);

                    if (imagePreview) {
                        imagePreview.style.display = "block";
                        imagePreview.innerHTML = `<img src="${compressedDataUrl}">`;


                        // 保存压缩后的数据
                        if (!gridData[cellKey]) gridData[cellKey] = {};
                        gridData[cellKey].image = compressedDataUrl;



                        // 触发自动保存
                        triggerAutoSave();
                    }
                });
            };
            reader.readAsDataURL(file);
        }
        // 新增图片压缩函数
        function compressImage(src, quality, callback) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = function () {
                // 设置最大宽度和高度以进一步减小文件大小
                const maxWidth = 1024;
                const maxHeight = 960;
                let width = img.width;
                let height = img.height;

                // 按比例缩放
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height *= maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width *= maxHeight / height));
                        height = maxHeight;
                    }
                }

                // 设置canvas尺寸
                canvas.width = width;
                canvas.height = height;

                // 在canvas上绘制图片
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为base64并调用回调函数
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                callback(dataUrl);
            };

            img.src = src;
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

            // 触发自动保存
            triggerAutoSave();
        }

        // 更新单元格外观
        function updateCellAppearance(cell, cellData) {
            // 移除所有类型类
            typeButtons.forEach((btn) => {
                cell.classList.remove(btn.dataset.type);
            });

            // 添加当前类型类
            cell.classList.add(cellData.type);

            // 更新收藏星星状态
            updateStarAppearance(cell, cellData.favorite);

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
                ['changle', 'zayi', 'shiyi', 'huoluan'].includes(cellData.type)) {
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
                    "确定要重置所有数据吗？这将清除所有格点信息、连接和本地保存的数据。"
                )
            ) {
                const rows = parseInt(rowsInput.value) || 5;
                const cols = parseInt(colsInput.value) || 7;
                const startRow = parseInt(startRowInput.value) || 3;
                const startCol = parseInt(startColInput.value) || 4;

                // 清除本地存储
                clearLocalStorage();

                initializeGrid(rows, cols, startRow, startCol);

                showTemporaryMessage('已重置所有数据', 'info');
                showExtraInfo(`--- 暂无已保存记录 ---`)
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

                        // 自动储存
                        triggerAutoSave();

                        // 关闭弹窗
                        document
                            .getElementById("recmap-popup")
                            .classList.add("hidden");
                    })
                    .catch((error) => {
                        console.error("识别失败:", error);
                        alert(("识别失败: " + error.message || "未知错误") + "\n\n请尽量确保截图只包含地图节点，而不包含游戏界面。（参照示例图）");
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

        // 监听是否勾选"保留数据"改变提示文档
        // 获取复选框状态
        const preserveData_hint = document.getElementById("preserve-data").checked;

        // 获取两个提示元素
        const noPreserveHint = document.getElementById("no-preserve-hint");
        const preserveHint = document.getElementById("preserve-hint");

        // 根据复选框状态显示/隐藏提示
        noPreserveHint.style.display = preserveData_hint ? "none" : "inline";
        preserveHint.style.display = preserveData_hint ? "inline" : "none";

        // 如果需要动态响应复选框变化，可以添加事件监听器
        document.getElementById("preserve-data").addEventListener("change", function () {
            const isChecked = this.checked;
            noPreserveHint.style.display = isChecked ? "none" : "inline";
            preserveHint.style.display = isChecked ? "inline" : "none";
        });

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
                resetCandle();
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
                                formData: {},
                                favorite: false
                            };
                        }
                    } else {
                        // 否则完全重置
                        gridData[cellKey] = {
                            type: result.grid[r][c],
                            closed: result.stats[r][c],
                            notes: "",
                            image: null,
                            formData: {},
                            favorite: false
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

            //绘制连接线   

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
            } else {
                // 如果保留现有数据，检查并添加defaultConnections中不存在于connections的连接
                // 默认连接：上下左右
                const defaultConnections = [
                    [3, 4, 3, 3],
                    [3, 4, 2, 4],
                    [3, 4, 3, 5],
                    [3, 4, 4, 4]
                ];

                defaultConnections.forEach((conn) => {
                    const [r1, c1, r2, c2] = conn;
                    const key = `${r1},${c1}-${r2},${c2}`;
                    const reverseKey = `${r2},${c2}-${r1},${c1}`;

                    // 检查是否已存在该连接（正向或反向）
                    const exists = connections.some(c => c.key === key || c.key === reverseKey);

                    if (!exists) {
                        const connection = {
                            key: key,
                            row1: r1,
                            col1: c1,
                            row2: r2,
                            col2: c2,
                        };
                        connections.push(connection);
                        drawConnection(connection);
                    }
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

            // 触发自动保存
            triggerAutoSave();
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

            // 确保星星在悬浮时可见
            // FIXME: 感觉把收藏星星塞在这个函数里不太好
            const star = cell.querySelector(".cell-star");
            if (star && !star.classList.contains("favorite")) {
                star.style.opacity = "0.5";
            }

            if (!gridData[cellKey] || cell.classList.contains("start")) {
                return;
            }

            if (quickMenuTimeout) {
                clearTimeout(quickMenuTimeout);
            }

            quickMenuTimeout = setTimeout(() => {
                if (cell.matches(':hover') && !isDragging) {
                    // 如果菜单已经显示且是同一个单元格，则不重复显示
                    if (quickMenu.style.display === 'flex' && quickMenu.dataset.cellKey === cellKey) {
                        return;
                    }
                    showQuickMenu(cell, cellKey);
                }
            }, 200);
        }

        function showQuickMenu(cell, cellKey) {
            // 清除菜单内容
            quickMenu.innerHTML = '';

            // 设置菜单位置
            const rect = cell.getBoundingClientRect();
            const [row, col] = cellKey.split(',').map(Number); // 解析行列号

            if (col >= 5) {
                quickMenu.style.left = `${rect.left}px`;  // 对齐 cell 左边缘
                quickMenu.style.transform = "translateX(-100%)";  // 向左移动自身宽度
            } else {
                // 默认显示在右侧
                quickMenu.style.left = `${rect.right}px`;  // 对齐 cell 右边缘
                quickMenu.style.transform = "none";  // 清除之前的 transform
            }
            // 显示在下侧
            quickMenu.style.top = `${rect.top}px`;


            const cellData = gridData[cellKey];
            const type = cellData.type;

            // 添加截图区域
            const imageContainer = document.createElement('div');
            if (cellData.image) {
                imageContainer.className = 'quick-menu-image';
                imageContainer.innerHTML = `<img src="${cellData.image}">`;
            } else {
                imageContainer.className = 'quick-menu-image-placeholder';
                imageContainer.textContent = '在笔记框内按Ctrl+V粘贴截图';
            }
            quickMenu.appendChild(imageContainer);

            // 添加笔记编辑框
            const noteSection = document.createElement('div');
            noteSection.className = 'quick-menu-note';
            noteSection.contentEditable = true;
            noteSection.textContent = cellData.notes || '';
            noteSection.addEventListener('input', function () {
                // 实时保存笔记内容
                gridData[cellKey].notes = this.textContent;
                triggerAutoSave()
            });
            quickMenu.appendChild(noteSection);


            // 添加焦点事件监听
            noteSection.addEventListener('focus', () => {
                isEditingNotes = true;
            });

            // 添加失去焦点事件监听
            noteSection.addEventListener('blur', () => {
                isEditingNotes = false;
                // 失去焦点后延迟检查是否需要隐藏
                setTimeout(() => {
                    if (!quickMenu.matches(':hover') && !currentCell?.matches(':hover')) {
                        quickMenu.style.display = 'none';
                    }
                }, 300);
            });



            // 根据单元格类型添加对应的选项按钮
            if (['changle', 'zayi', 'shiyi', 'huoluan'].includes(type)) {
                // 获取对应类型的表单部分
                const formSection = document.querySelector(`.form-section.${type}`);

                // 创建适用特殊表单的子菜单，后续操作均添加到subquickMenu
                const subQuickMenu = document.createElement('div');
                subQuickMenu.className = 'quick-menu-subs'
                quickMenu.appendChild(subQuickMenu);

                const subQmenu = document.querySelector(`.quick-menu-subs`)

                if (formSection) {
                    // 杂疑类型的特殊处理
                    if (type === 'zayi') {
                        // 更多奖励
                        const moreButtons = formSection.querySelectorAll('[data-group="more"] .option-button');
                        addButtonsToQuickMenu(moreButtons, "更多奖励", cell, cellKey, cellData.formData?.more);

                        // 添加分割线
                        const divider1 = document.createElement('div');
                        divider1.className = 'quick-menu-divider';
                        subQmenu.appendChild(divider1);

                        // 普通奖励
                        const normalButtons = formSection.querySelectorAll('[data-group="normal"] .option-button');
                        addButtonsToQuickMenu(normalButtons, "普通奖励", cell, cellKey, cellData.formData?.normal);

                        // 添加分割线
                        const divider2 = document.createElement('div');
                        divider2.className = 'quick-menu-divider';
                        subQmenu.appendChild(divider2);

                        // 结局节点
                        const endButtons = formSection.querySelectorAll('[data-group="end"] .option-button');
                        addButtonsToQuickMenu(endButtons, "结局节点", cell, cellKey, cellData.formData?.end);

                    } else if (type === 'huoluan') {
                        // 关卡选择
                        const stageButtons = formSection.querySelectorAll('[data-group="stage"] .option-button');
                        addButtonsToQuickMenu(stageButtons, "关卡选择", cell, cellKey, cellData.formData?.stage);

                        // 如果有选中的关卡，显示变体选项
                        if (cellData.formData?.stage) {
                            const variantButtons = formSection.querySelectorAll('[data-group="variant"] .option-button');
                            if (variantButtons.length > 0) {
                                // 添加分割线
                                const divider = document.createElement('div');
                                divider.className = 'quick-menu-divider';
                                subQmenu.appendChild(divider);

                                addButtonsToQuickMenu(variantButtons, "变体选择", cell, cellKey, cellData.formData?.variant);
                            }
                        }
                    }

                    else {
                        // 其他类型正常处理
                        const optionButtons = formSection.querySelectorAll('.option-button');
                        const selectedOption = cellData.formData?.[type];
                        addButtonsToQuickMenu(optionButtons, null, cell, cellKey, selectedOption);
                    }
                }
            }

            // 显示菜单
            quickMenu.style.display = 'flex';

            // 添加粘贴事件监听
            const handlePaste = function (e) {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        const file = items[i].getAsFile();
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            // 压缩图片
                            compressImage(e.target.result, 0.7, function (compressedDataUrl) {
                                gridData[cellKey].image = compressedDataUrl;
                                imageContainer.className = 'quick-menu-image';
                                imageContainer.innerHTML = `<img src="${compressedDataUrl}">`;

                            });


                        };
                        reader.readAsDataURL(file);
                        e.preventDefault();
                        break;
                    }
                }
                triggerAutoSave();
            };

            // 添加事件监听器
            quickMenu.addEventListener('paste', handlePaste);

            // 保存当前单元格引用
            quickMenu.dataset.cellKey = cellKey;

            // 在菜单关闭时移除事件监听
            // 修改 showQuickMenu 函数中的检查逻辑
            const checkMenuClose = function () {
                if (!quickMenu.matches(':hover') && !cell.matches(':hover')) {
                    quickMenu.style.display = 'none';
                    quickMenu.removeEventListener('paste', handlePaste);
                    document.removeEventListener('mousemove', checkMenuClose);
                }
            };

            document.addEventListener('mousemove', checkMenuClose);
        }

        // 辅助函数：更新祸乱变体选项的函数
        function updateVariantOptions(stageKey, cellKey) {
            const variantSection = document.querySelector('.form-section.huoluan .variant-buttons');
            const variantTitle = document.querySelector('.form-section.huoluan .variant-title');

            // 清除旧选项
            variantSection.innerHTML = '';

            // 如果有选中的关卡，显示变体选项
            if (stageKey && huoluanStage[stageKey]) {
                variantTitle.classList.remove('hidden');

                huoluanStage[stageKey].variants.forEach((variant, index) => {
                    const button = document.createElement('button');
                    button.className = 'option-button';
                    button.dataset.option = `V${index + 1}`;
                    button.textContent = variant;
                    button.style.setProperty('--current-color', "var(--huoluan-color)");

                    // 如果之前已经选中了这个变体，恢复选中状态
                    if (gridData[cellKey]?.formData?.variant === `V${index + 1}`) {
                        button.classList.add('selected');
                    }

                    button.addEventListener('click', function () {
                        // 清除同组其他选项的选中状态
                        this.parentElement.querySelectorAll('.option-button').forEach(btn => {
                            btn.classList.remove('selected');
                        });

                        // 设置当前按钮为选中状态
                        this.classList.add('selected');

                        // 保存当前选项
                        gridData[cellKey].formData.variant = this.dataset.option;
                    });

                    variantSection.appendChild(button);
                });
            } else {
                variantTitle.classList.add('hidden');
            }
        }

        // 辅助函数：添加按钮到快捷菜单
        function addButtonsToQuickMenu(buttons, groupTitle, cell, cellKey, selectedOption) {
            const subQmenu = document.querySelector(`.quick-menu-subs`)

            if (groupTitle) {
                const title = document.createElement('div');
                title.className = 'quick-menu-title';
                title.textContent = groupTitle;
                title.style.fontSize = '11px';
                title.style.color = '#999';
                title.style.padding = '4px 8px';
                subQmenu.appendChild(title);
            }

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

            buttons.forEach(button => {
                const quickButton = document.createElement('button');
                quickButton.className = 'quick-menu-button';
                quickButton.textContent = button.textContent;

                // 根据当前单元格的实际数据设置按钮样式
                const option = button.dataset.option;
                const isSelected = selectedOption === option;


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

                subQmenu.appendChild(quickButton);
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

            // 如果正在编辑笔记，则不隐藏菜单
            if (isEditingNotes) return;

            // 恢复星星状态
            const cell = e.currentTarget;
            const star = cell.querySelector(".cell-star");
            if (star && !star.classList.contains("favorite")) {
                star.style.opacity = "0";
            }

            // 只有当鼠标没有移动到菜单上时才设置延迟隐藏
            const relatedTarget = e.relatedTarget;
            if (!relatedTarget || !(relatedTarget === quickMenu || relatedTarget.closest('.quick-menu'))) {
                quickMenuTimeout = setTimeout(() => {
                    // 再次检查鼠标是否在菜单或单元格上
                    if (!quickMenu.matches(':hover') && !currentCell?.matches(':hover')) {
                        quickMenu.style.display = 'none';
                    }
                }, 200); // 200ms的延迟
            }
        }
        // 添加菜单的 mouseleave 事件
        // 修改 quickMenu 的 mouseleave 事件
        quickMenu.addEventListener('mouseleave', (e) => {
            if (quickMenuTimeout) {
                clearTimeout(quickMenuTimeout);
            }

            // 如果正在编辑笔记，则不隐藏菜单
            if (isEditingNotes) return;

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
            else if (type === 'huoluan' && cellData.formData.stage) {
                // {stage: 'S3', variant: 'V2'}
                // 关卡名:
                const stage = `${huoluanStage[cellData.formData.stage].name.substring(0, 2)}`
                let mark = ``

                if (cellData.formData.variant) {
                    // 如果有变体选项
                    const variant = huoluanStage[cellData.formData.stage].variants[parseInt(cellData.formData.variant.substring(1), 10) - 1];
                    mark = `huoluan_${stage}/${variant.substring(0, 2)}`;

                } else {

                    mark = `huoluan_${stage}`;
                }

                icons.push(mark)


                // 祸乱类型显示关卡和变体
                // 当选中祸乱关卡时，在右上角显示关卡名。当同时选中变体时，增加显示1,2……
                // 如只选中“地有四难”时，显示p: 地
                // 选中地有四难和变体“四奖励一敌人”时，显示p: 地/四（第一个字）
                // 数据来自const huoluanStage = {
                //S1: {
                //    name: "地有四难",
                //    variants: ["四奖励一敌人", "一隐藏四敌人（刺箱）"]
                //},

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

                    } else if (iconName.includes('huoluan_')) {

                        // 显示祸乱字符串
                        const badge = document.createElement('div');
                        badge.className = 'cell-badge-text';
                        badge.innerHTML = iconName.substring(8) // 删去huoluan_
                        badgeContainer.appendChild(badge);
                    }
                });

                cell.appendChild(badgeContainer);
            }
        }

        // ----------------------------------------------------------------//
        // 炎干员速查
        const toggleBtn = document.getElementById('yanchecker-toggle-btn');
        const closeBtn = document.getElementById('yanchecker-close-btn');
        const card = document.getElementById('yanchecker-card');
        const table = document.getElementById('yanchecker-table');

        // 当前选中的筛选条件
        let currentClass = 'all';
        let currentRarity = 'all';

        // 切换卡片显示/隐藏
        function toggleCard() {
            if (card.style.display === 'block') {
                card.style.display = 'none';
            } else {
                card.style.display = 'block';
            }
        }

        // 初始化筛选按钮事件
        function initFilterButtons() {
            const classBtns = document.querySelectorAll('.yanchecker-class-btn');
            const rarityBtns = document.querySelectorAll('.yanchecker-rarity-btn');

            classBtns.forEach(btn => {
                btn.addEventListener('click', function () {
                    // 移除所有class按钮的active类
                    classBtns.forEach(b => b.classList.remove('active'));
                    // 给当前按钮添加active类
                    this.classList.add('active');
                    // 更新当前选中的职业
                    currentClass = this.getAttribute('data-class');
                    // 应用筛选
                    applyFilters();
                });
            });

            rarityBtns.forEach(btn => {
                btn.addEventListener('click', function () {
                    // 移除所有rarity按钮的active类
                    rarityBtns.forEach(b => b.classList.remove('active'));
                    // 给当前按钮添加active类
                    this.classList.add('active');
                    // 更新当前选中的星级
                    currentRarity = this.getAttribute('data-rarity');
                    // 应用筛选
                    applyFilters();
                });
            });

            // 默认选中"全部"
            document.querySelector('.yanchecker-class-btn[data-class="all"]').classList.add('active');
            document.querySelector('.yanchecker-rarity-btn[data-rarity="all"]').classList.add('active');
        }

        // 应用筛选条件
        function applyFilters() {
            const cells = document.querySelectorAll('.yanchecker-cell');
            const headers = document.querySelectorAll('.yanchecker-rarity-header');
            const rarityCells = document.querySelectorAll('.yanchecker-rarity-cell');

            // 先全部显示
            cells.forEach(cell => {
                cell.classList.remove('yanchecker-hidden');
                cell.parentElement.classList.remove('yanchecker-hidden');
            });

            headers.forEach(header => {
                header.classList.remove('yanchecker-hidden');
                header.parentElement.classList.remove('yanchecker-hidden');
            });

            rarityCells.forEach(cell => {
                cell.classList.remove('yanchecker-hidden');
                cell.parentElement.classList.remove('yanchecker-hidden');
            });

            // 应用职业筛选
            if (currentClass !== 'all') {

                cells.forEach(cell => {
                    if (cell.getAttribute('data-class') !== currentClass) {
                        cell.classList.add('yanchecker-hidden');
                        // 如果整行都隐藏了，隐藏行
                        const row = cell.parentElement;
                        const visibleCells = row.querySelectorAll('.yanchecker-cell:not(.yanchecker-hidden)');
                        if (visibleCells.length === 0) {
                            row.classList.add('yanchecker-hidden');
                        }
                    }
                });
            }

            // 应用星级筛选
            if (currentRarity !== 'all') {
                headers.forEach(header => {
                    if (header.getAttribute('data-rarity') !== currentRarity &&
                        header.getAttribute('data-rarity') !== 'all') {
                        header.classList.add('yanchecker-hidden');
                    }
                });


                rarityCells.forEach(cell => {
                    if (cell.getAttribute('data-rarity') !== currentRarity) {
                        cell.classList.add('yanchecker-hidden');
                    }
                });

                cells.forEach(cell => {
                    if (cell.getAttribute('data-rarity') !== currentRarity) {
                        cell.classList.add('yanchecker-hidden');
                        // 如果整行都隐藏了，隐藏行
                        const row = cell.parentElement;
                        const visibleCells = row.querySelectorAll('.yanchecker-cell:not(.yanchecker-hidden)');
                        if (visibleCells.length === 0) {
                            row.classList.add('yanchecker-hidden');
                        }
                    }
                });
            }

            // 调整列宽
            adjustColumnWidths();
        }

        // 调整列宽
        function adjustColumnWidths() {
            const visibleHeaders = document.querySelectorAll('.yanchecker-class-header:not(.yanchecker-hidden)');

            if (visibleHeaders.length === 1) {
                visibleHeaders[0].classList.add('yanchecker-full-width');
            } else {
                visibleHeaders.forEach(header => {
                    header.classList.remove('yanchecker-full-width');
                });
            }
        }

        // 初始化
        initFilterButtons();

        // 事件监听
        toggleBtn.addEventListener('click', toggleCard);

        closeBtn.addEventListener('click', function () {
            card.style.display = 'none';
        });

        // 为容器添加鼠标移入移出事件
        const container = document.querySelector('.yanchecker-container');

        container.addEventListener('mouseenter', function () {
            card.style.display = 'block';
        });

        container.addEventListener('mouseleave', function () {
            card.style.display = 'none';
        });

        // 保持原有的点击按钮切换功能
        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // 阻止事件冒泡
            toggleCard();
        });

        //------------------------------------------------------------//
        // 烛火计数
        // 获取烛火输入框
        const candleInput = document.getElementById('candle');

        // 监听直接修改数字的情况
        candleInput.addEventListener('change', function () {
            // 非负整数验证
            let value = parseInt(this.value);
            if (isNaN(value) || value < 0) {
                this.value = 0;
            } else {
                this.value = value; // 确保是整数
            }
            // 触发自动保存
            triggerAutoSave();
        });

        // 重置函数 - 可以被其他函数调用
        window.resetCandle = function () {
            candleInput.value = 0;
            // 触发自动保存
            triggerAutoSave();
        };

        // 改变烛火值的函数
        window.changeCandle = function (amount) {
            let current = parseInt(candleInput.value);
            if (isNaN(current)) current = 0;
            candleInput.value = current + amount;
            // 触发自动保存
            triggerAutoSave();
        };


        //------------------------------------------------------------//

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

        // 检查历史数据
        checkForHistoryData();

        // 如果没有历史数据或用户选择不恢复，则初始化默认网格
        loadFromLocalStorage().then(savedData => {
            if (!savedData || !savedData.timestamp) {
                initializeGrid(5, 7, 3, 4);
            }
        });
    }
});
