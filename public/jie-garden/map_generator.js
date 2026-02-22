
const CANVAS_W = 1400;
const CANVAS_H = 680;

const ASSET_BASE = 'UI/';
const BG_BASE = 'BG/';
const EUI_BASE = 'EUI/';

const NODE_SPRITES = {
    chaos: 'spnode_battle.png',
    legend: 'spnode_inv_boss_only.png',
    misc: 'spnode_gate.png',
    story: 'spnode_market.png',
    pickup_in: 'spnode_treasure.png',
    pickup_out: 'spnode_treasure.png',
    encounter: 'spnode_shop.png',
    joy: 'spnode_enter.png',
    plan: 'spnode_sac.png',
    choice: 'spnode_inc.png',
    start: 'spnode_origin.png',
};

const NODE_SPRITES_INVALID = {
    chaos: 'spnode_battle_invalid.png',
    misc: 'spnode_gate_invalid.png',
    pickup_in: 'spnode_treasure_invalid.png',
    pickup_out: 'spnode_treasure_invalid.png',
    legend: 'spnode_inv_invalid.png',
    choice: 'spnode_inc_invalid.png',
};

const ASSETS = {
    bgShifei: BG_BASE + 'rogue_5_map_0.png',
    bgJinxi: BG_BASE + 'rogue_5_map_sky_2.png',
    lineDark: ASSET_BASE + 'tl_node_line_dark.png',
    lineLight: ASSET_BASE + 'tl_node_line_light.png',
    lineH: EUI_BASE + '横着的.png',
    lineV: EUI_BASE + '竖着的.png',
    nodeCloud: ASSET_BASE + 'node_fx_cloud.png',
    cursor: ASSET_BASE + 'spnode_origin.png',
    nodeGlow: ASSET_BASE + 'bg_node_small_active.png',
    locked: ASSET_BASE + 'locked.png',
    candle0: EUI_BASE + 'candle0.png',
    candle1: EUI_BASE + 'candle1.png',
    candle2: EUI_BASE + 'candle2.png',
    candle3: EUI_BASE + 'candle3.png',
    candle4: EUI_BASE + 'candle4.png',
};

const loadedImages = {};
let totalToLoad = 0, totalLoaded = 0, firstRenderDone = false;

function loadImage(src) {
    if (loadedImages[src]) return loadedImages[src];
    const img = new Image();
    img.src = src;
    totalToLoad++;
    img.onload = () => { totalLoaded++; if (totalLoaded >= totalToLoad && firstRenderDone) redraw(); };
    img.onerror = () => { totalLoaded++; };
    loadedImages[src] = img;
    return img;
}
function isReady(img) { return img && img.complete && img.naturalWidth > 0; }

function preloadAssets() {
    for (const k of Object.keys(NODE_SPRITES)) loadImage(ASSET_BASE + NODE_SPRITES[k]);
    for (const k of Object.keys(NODE_SPRITES_INVALID)) loadImage(ASSET_BASE + NODE_SPRITES_INVALID[k]);
    for (const k of Object.keys(ASSETS)) loadImage(ASSETS[k]);
}

const SHIFEI_NODE_DEFS = {
    chaos: { name: '祸乱', color: '#9040a0', bgColor: '#2a1838' },
    legend: { name: '传说', color: '#1ab8b8', bgColor: '#0a2838' },
    misc: { name: '杂疑', color: '#1ab8b8', bgColor: '#1a3838' },
    story: { name: '故肆', color: '#1ab8b8', bgColor: '#1a3838' },
    pickup_in: { name: '拾遗', color: '#1a9868', bgColor: '#0a2828' },
    pickup_out: { name: '拾遗', color: '#1a9868', bgColor: '#0a2828' },
    encounter: { name: '易与', color: '#1a9848', bgColor: '#0a2818' },
    joy: { name: '常乐', color: '#1ab8b8', bgColor: '#182818' },
    plan: { name: '筹谋', color: '#40c8c8', bgColor: '#1a3848' },
    choice: { name: '抉择', color: '#1ab8b8', bgColor: '#282010' },
};

const REPEATABLE_TYPES = new Set(['encounter', 'joy', 'plan', 'story']);

function getNodeDef(typeId) {
    const d = SHIFEI_NODE_DEFS[typeId];
    return d ? { id: typeId, ...d } : { id: typeId, name: typeId, color: '#888', bgColor: '#222' };
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i);[a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

let currentMapState = null;
let currentMode = 'shifei';
let stepCount = 0;

let historyStack = [];
let historyIndex = -1;

function saveHistory() {
    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }

    const stateCopy = JSON.parse(JSON.stringify({
        grid: currentMapState.grid,
        stepCount: stepCount
    }));

    historyStack.push(stateCopy);
    historyIndex++;
    updateButtonStates();
}

function restoreHistory(index) {
    if (index >= 0 && index < historyStack.length) {
        const state = historyStack[index];
        for (const key in state.grid) {
            if (currentMapState.grid[key]) {
                currentMapState.grid[key].state = state.grid[key].state;
            }
        }
        stepCount = state.stepCount;
        historyIndex = index;
        updateButtonStates();
        redraw();
    }
}

function undo() {
    if (historyIndex > 0) restoreHistory(historyIndex - 1);
}

function redo() {
    if (historyIndex < historyStack.length - 1) restoreHistory(historyIndex + 1);
}

function updateButtonStates() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = historyIndex <= 0;
    if (btnRedo) btnRedo.disabled = historyIndex >= historyStack.length - 1;
}

function drawBackground(ctx, w, h) {
    const bgKey = currentMode === 'jinxi' ? ASSETS.bgJinxi : ASSETS.bgShifei;
    const bgImg = loadedImages[bgKey];
    if (isReady(bgImg)) {
        const cropTop = bgImg.naturalHeight * 0.15;
        const srcH = bgImg.naturalHeight - cropTop;
        const srcW = bgImg.naturalWidth;
        const scale = w / srcW;
        const dh = srcH * scale;
        if (dh < h) {
            const scale2 = h / srcH;
            const dw2 = srcW * scale2;
            ctx.drawImage(bgImg, 0, cropTop, srcW, srcH, (w - dw2) / 2, 0, dw2, h);
        } else {
            ctx.drawImage(bgImg, 0, cropTop, srcW, srcH, 0, 0, w, dh);
        }
    } else {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1a0828'); g.addColorStop(0.4, '#301838');
        g.addColorStop(0.7, '#201020'); g.addColorStop(1, '#0e0a14');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
}

function drawNode(ctx, x, y, size, nodeType, state) {
    const hs = size / 2;
    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.07)';
    ctx.shadowBlur = 18.7;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    const typeId = nodeType.id || 'misc';

    if (state === 'locked') {
        const lockedImg = loadedImages[ASSETS.locked];
        if (isReady(lockedImg)) {
            ctx.globalAlpha = 0.6;
            ctx.drawImage(lockedImg, x - hs, y - hs, size, size);
        }
        ctx.restore();
        const lw = 64, lh = 14;
        ctx.fillStyle = 'rgba(150, 140, 155, 0.45)';
        ctx.fillRect(x - lw / 2, (y + hs + 11) - lh / 2, lw, lh);
        return;
    }

    if (state === 'visited') {
        const sf = NODE_SPRITES_INVALID[typeId] || NODE_SPRITES[typeId];
        if (sf) {
            const img = loadedImages[ASSET_BASE + sf];
            if (isReady(img)) {
                if (!NODE_SPRITES_INVALID[typeId]) {
                    ctx.filter = 'grayscale(100%) brightness(50%) opacity(80%)';
                }
                ctx.drawImage(img, x - hs, y - hs, size, size);
                ctx.filter = 'none';
            }
        }
        ctx.restore();
        drawNodeLabel(ctx, x, y + hs + 11, nodeType.name, '#666');
        return;
    }

    const sf = NODE_SPRITES[typeId];
    if (sf) {
        const img = loadedImages[ASSET_BASE + sf];
        if (isReady(img)) {
            ctx.drawImage(img, x - hs, y - hs, size, size);
        } else {
            drawFallbackNode(ctx, x, y, size, nodeType, state);
        }
    } else {
        drawFallbackNode(ctx, x, y, size, nodeType, state);
    }

    ctx.restore();
    drawNodeLabel(ctx, x, y + hs + 11, nodeType.name, nodeType.color || '#1ab8b8');
}

function drawFallbackNode(ctx, x, y, size, nodeType, state) {
    const hs = size / 2;
    const bg = nodeType.bgColor || '#0a2828';
    const bc = nodeType.color || '#1ab8b8';
    roundRect(ctx, x - hs, y - hs, size, size, 4);
    ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = bc; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `bold ${size * 0.35}px "PingFang SC", sans-serif`;
    ctx.fillStyle = '#e0f0f0';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nodeType.name || '?', x, y);
    ctx.textBaseline = 'alphabetic';
}

function drawNodeLabel(ctx, x, y, text, color) {
    ctx.font = 'bold 12px "PingFang SC", sans-serif';
    const textW = ctx.measureText(text).width;
    const padX = 8;
    const lw = Math.max(textW + padX * 2, 64);
    const lh = 14;
    ctx.fillStyle = color;
    ctx.fillRect(x - lw / 2, y - lh / 2, lw, lh);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y); ctx.textBaseline = 'alphabetic';
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawConnection(ctx, x1, y1, x2, y2, isH, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const capLen = 3;
    if (isH) {
        ctx.beginPath();
        ctx.moveTo(x1, y1 - capLen); ctx.lineTo(x1, y1 + capLen);
        ctx.moveTo(x2, y2 - capLen); ctx.lineTo(x2, y2 + capLen);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(x1 - capLen, y1); ctx.lineTo(x1 + capLen, y1);
        ctx.moveTo(x2 - capLen, y2); ctx.lineTo(x2 + capLen, y2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawCrosshair(ctx, x, y) {
    const img = loadedImages[ASSETS.cursor];
    if (isReady(img)) {
        ctx.drawImage(img, x - 20, y - 20, 40, 40);
    } else {
        ctx.strokeStyle = 'rgba(220,80,120,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    }
}

function generateInnerEdges(startKey, startDirs, startR, startC, innerRows, innerCols) {
    const targetConns = Math.random() < 0.03 ? 28 : 27;
    const edgeSet = new Set();
    const finalEdges = [];

    function ek(a, b) { return [a, b].sort().join('|'); }
    function addEdge(a, b) {
        const k = ek(a, b);
        if (edgeSet.has(k)) return false;
        edgeSet.add(k);
        const isH = a.split(',')[0] === b.split(',')[0];
        finalEdges.push({ key1: a, key2: b, isH });
        return true;
    }

    const allH = [], allV = [];
    for (let r = 0; r < innerRows; r++) {
        for (let c = 0; c < innerCols; c++) {
            if (c < innerCols - 1) allH.push([`${r},${c}`, `${r},${c + 1}`]);
            if (r < innerRows - 1) allV.push([`${r},${c}`, `${r + 1},${c}`]);
        }
    }

    const inTree = new Set([startKey]);
    for (const dir of startDirs) {
        const nk = `${startR + dir[0]},${startC + dir[1]}`;
        addEdge(startKey, nk);
        inTree.add(nk);
    }
    while (inTree.size < innerRows * innerCols) {
        const hCandidates = [];
        const vCandidates = [];
        for (const e of allH) {
            if (edgeSet.has(ek(e[0], e[1]))) continue;
            const aIn = inTree.has(e[0]), bIn = inTree.has(e[1]);
            if (aIn !== bIn) hCandidates.push(e);
        }
        for (const e of allV) {
            if (edgeSet.has(ek(e[0], e[1]))) continue;
            const aIn = inTree.has(e[0]), bIn = inTree.has(e[1]);
            if (aIn !== bIn) vCandidates.push(e);
        }
        if (hCandidates.length === 0 && vCandidates.length === 0) break;
        const curH = finalEdges.filter(e => e.isH).length;
        const curV = finalEdges.length - curH;
        let chosen;
        if (hCandidates.length > 0 && (curH < curV || vCandidates.length === 0)) {
            chosen = pick(hCandidates);
        } else if (vCandidates.length > 0) {
            chosen = pick(vCandidates);
        } else {
            chosen = pick(hCandidates);
        }
        addEdge(chosen[0], chosen[1]);
        inTree.add(chosen[0]);
        inTree.add(chosen[1]);
    }

    let hCount = finalEdges.filter(e => e.isH).length;
    let vCount = finalEdges.filter(e => !e.isH).length;

    const unusedH = shuffle(allH.filter(e => !edgeSet.has(ek(e[0], e[1]))));
    const unusedV = shuffle(allV.filter(e => !edgeSet.has(ek(e[0], e[1]))));

    let hi = 0;
    while (hCount < 10 && finalEdges.length < targetConns && hi < unusedH.length) {
        if (addEdge(unusedH[hi][0], unusedH[hi][1])) hCount++;
        hi++;
    }
    let vi = 0;
    while (vCount < 10 && finalEdges.length < targetConns && vi < unusedV.length) {
        if (addEdge(unusedV[vi][0], unusedV[vi][1])) vCount++;
        vi++;
    }

    const remaining = shuffle([
        ...unusedH.slice(hi), ...unusedV.slice(vi),
    ].filter(e => !edgeSet.has(ek(e[0], e[1]))));
    for (const e of remaining) {
        if (finalEdges.length >= targetConns) break;
        addEdge(e[0], e[1]);
    }

    return finalEdges;
}

function generateShifeiNodeTypes() {
    const counts = {
        chaos: rand(5, 9), legend: rand(4, 6), misc: rand(3, 6),
        pickup_in: rand(1, 4), encounter: rand(2, 4), joy: rand(1, 3),
        plan: 1, story: 1, choice: 1,
    };
    let pool = [];
    for (const [type, count] of Object.entries(counts))
        for (let i = 0; i < count; i++) pool.push(type);

    while (pool.length > 24) {
        const cur = {};
        for (const t of pool) cur[t] = (cur[t] || 0) + 1;
        const mins = { chaos: 5, legend: 4, misc: 3, pickup_in: 1, encounter: 2, joy: 1, plan: 1, story: 1, choice: 1 };
        const shrinkable = Object.entries(cur).filter(([t, n]) => n > mins[t]);
        if (shrinkable.length === 0) break;
        shrinkable.sort((a, b) => b[1] - a[1]);
        pool.splice(pool.lastIndexOf(shrinkable[0][0]), 1);
    }
    while (pool.length < 24) pool.push(pick(['chaos', 'legend', 'misc', 'encounter']));

    pool = shuffle(pool);
    const startOk = pool.filter(t => t === 'legend' || t === 'pickup_in' || t === 'encounter');
    const startNo = pool.filter(t => t !== 'legend' && t !== 'pickup_in' && t !== 'encounter');
    const startAssigned = [];
    for (let i = 0; i < 4; i++)
        startAssigned.push(i < startOk.length ? startOk[i] : pick(['legend', 'pickup_in', 'encounter']));
    return { startAssigned, innerAssigned: shuffle([...startOk.slice(4), ...startNo]).slice(0, 20) };
}

function generateShifeiMap() {
    const nodeSize = 56, gapX = 115, gapY = 105;
    const innerRows = 5, innerCols = 5;
    const centerR = 2, centerC = 2;

    const outerPositions = [];
    for (let r = 0; r < innerRows; r++) {
        if (Math.random() < 0.6) outerPositions.push({ r, c: -1 });
        if (Math.random() < 0.6) outerPositions.push({ r, c: innerCols });
    }

    const totalCols = innerCols + 2;
    const offsetX = (CANVAS_W - (totalCols - 1) * gapX) / 2;
    const offsetY = 30;
    function gridToPixel(r, c) {
        return { x: offsetX + (c + 1) * gapX, y: offsetY + (r + 0.5) * gapY };
    }

    const { startAssigned, innerAssigned } = generateShifeiNodeTypes();
    const grid = {};
    const startDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const startNodes = [];

    startDirs.forEach((dir, i) => {
        const nr = centerR + dir[0], nc = centerC + dir[1];
        const key = `${nr},${nc}`;
        const pos = gridToPixel(nr, nc);
        grid[key] = { key, r: nr, c: nc, ...pos, type: getNodeDef(startAssigned[i]), state: 'active' };
        startNodes.push(grid[key]);
    });

    const centerKey = `${centerR},${centerC}`;
    const cp = gridToPixel(centerR, centerC);
    grid[centerKey] = {
        key: centerKey, r: centerR, c: centerC, ...cp,
        type: { id: 'start', name: '起点', color: '#ff6888', bgColor: '#200818' }, state: 'start'
    };

    let idx = 0;
    for (let r = 0; r < innerRows; r++) {
        for (let c = 0; c < innerCols; c++) {
            const key = `${r},${c}`;
            if (grid[key]) continue;
            const pos = gridToPixel(r, c);
            const tid = idx < innerAssigned.length ? innerAssigned[idx] : pick(['chaos', 'legend', 'misc']);
            idx++;
            grid[key] = { key, r, c, ...pos, type: getNodeDef(tid), state: 'locked' };
        }
    }

    const pickupOutCount = rand(2, 6);
    const selOuter = shuffle(outerPositions).slice(0, pickupOutCount);
    for (const op of selOuter) {
        const key = `${op.r},${op.c}`;
        const pos = gridToPixel(op.r, op.c);
        grid[key] = { key, r: op.r, c: op.c, ...pos, type: getNodeDef('pickup_out'), state: 'locked' };
    }

    const innerEdges = generateInnerEdges(centerKey, startDirs, centerR, centerC, innerRows, innerCols);
    const allConnections = innerEdges.map(e => ({ key1: e.key1, key2: e.key2 }));
    const edgeSet = new Set(allConnections.map(e => [e.key1, e.key2].sort().join('|')));
    function addOuterEdge(k1, k2) {
        const ek = [k1, k2].sort().join('|');
        if (edgeSet.has(ek)) return;
        edgeSet.add(ek);
        allConnections.push({ key1: k1, key2: k2 });
    }
    for (const op of selOuter) {
        const ok = `${op.r},${op.c}`;
        const adjC = op.c === -1 ? 0 : innerCols - 1;
        addOuterEdge(ok, `${op.r},${adjC}`);
    }
    for (let i = 0; i < selOuter.length; i++) {
        for (let j = i + 1; j < selOuter.length; j++) {
            const a = selOuter[i], b = selOuter[j];
            if (a.c === b.c && Math.abs(a.r - b.r) === 1 && Math.random() < 0.5)
                addOuterEdge(`${a.r},${a.c}`, `${b.r},${b.c}`);
        }
    }

    const adjacency = {};
    for (const conn of allConnections) {
        if (!adjacency[conn.key1]) adjacency[conn.key1] = [];
        if (!adjacency[conn.key2]) adjacency[conn.key2] = [];
        adjacency[conn.key1].push(conn.key2);
        adjacency[conn.key2].push(conn.key1);
    }

    const firstLevelKeys = new Set();
    for (const sn of startNodes) {
        if (adjacency[sn.key]) {
            for (const adjKey of adjacency[sn.key]) {
                if (adjKey !== centerKey && !startNodes.find(n => n.key === adjKey)) {
                    firstLevelKeys.add(adjKey);
                }
            }
        }
    }

    const choiceKey = Object.keys(grid).find(k => grid[k].type && grid[k].type.id === 'choice');
    if (choiceKey && firstLevelKeys.has(choiceKey)) {
        const candidates = Object.keys(grid).filter(k =>
            grid[k].c >= 0 && grid[k].c < innerCols &&
            k !== centerKey &&
            !startNodes.find(n => n.key === k) &&
            !firstLevelKeys.has(k)
        );
        if (candidates.length > 0) {
            const swapKey = pick(candidates);
            const tempType = grid[choiceKey].type;
            grid[choiceKey].type = grid[swapKey].type;
            grid[swapKey].type = tempType;
        }
    }

    return { grid, allConnections, adjacency, startNodes, centerKey, nodeSize };
}

function generateJinxiMap() {
    const nodeSize = 56, gapX = 115, gapY = 105;
    const innerRows = 5, innerCols = 5;
    const startR = 2, startC = 0;

    const offsetX = (CANVAS_W - (innerCols - 1) * gapX) / 2;
    const offsetY = 30;
    function gridToPixel(r, c) {
        return { x: offsetX + c * gapX, y: offsetY + (r + 0.5) * gapY };
    }

    const grid = {};
    const startKey = `${startR},${startC}`;
    const sp = gridToPixel(startR, startC);
    grid[startKey] = {
        key: startKey, r: startR, c: startC, ...sp,
        type: { id: 'start', name: '起点', color: '#ff6888', bgColor: '#200818' }, state: 'start'
    };

    const startDirs = [[-1, 0], [1, 0], [0, 1]];
    const startNodes = [];
    let startTypes;
    if (Math.random() < 0.1098) {
        startTypes = ['misc', 'misc', 'misc'];
    } else {
        startTypes = shuffle(['story', 'misc', 'misc']);
    }

    startDirs.forEach((dir, i) => {
        const nr = startR + dir[0], nc = startC + dir[1];
        const key = `${nr},${nc}`;
        const pos = gridToPixel(nr, nc);
        grid[key] = { key, r: nr, c: nc, ...pos, type: getNodeDef(startTypes[i]), state: 'active' };
        startNodes.push(grid[key]);
    });

    const usedMisc = startTypes.filter(t => t === 'misc').length;
    const usedStory = startTypes.filter(t => t === 'story').length;

    const innerEdges = generateInnerEdges(startKey, startDirs, startR, startC, innerRows, innerCols);
    const allConnections = innerEdges.map(e => ({ key1: e.key1, key2: e.key2 }));

    const adjacency = {};
    for (const conn of allConnections) {
        if (!adjacency[conn.key1]) adjacency[conn.key1] = [];
        if (!adjacency[conn.key2]) adjacency[conn.key2] = [];
        adjacency[conn.key1].push(conn.key2);
        adjacency[conn.key2].push(conn.key1);
    }

    const firstLevelKeys = new Set();
    for (const sn of startNodes) {
        if (adjacency[sn.key]) {
            for (const adjKey of adjacency[sn.key]) {
                if (adjKey !== startKey && !startNodes.find(n => n.key === adjKey)) {
                    firstLevelKeys.add(adjKey);
                }
            }
        }
    }

    let remainingFirstLevel = Array.from({ length: firstLevelKeys.size }, () => Math.random() < 0.5 ? 'chaos' : 'misc');
    let chaosUsed = remainingFirstLevel.filter(t => t === 'chaos').length;
    let miscUsed = remainingFirstLevel.filter(t => t === 'misc').length;

    const remaining = [];
    for (let i = 0; i < 7 - chaosUsed; i++) remaining.push('chaos');
    for (let i = 0; i < 2; i++) remaining.push('legend');
    for (let i = 0; i < 12 - usedMisc - miscUsed; i++) remaining.push('misc');
    for (let i = 0; i < 1 - usedStory; i++) remaining.push('story');
    remaining.push('encounter');
    remaining.push('plan');
    const shuffledRemaining = shuffle(remaining);

    for (let r = 0; r < innerRows; r++) {
        for (let c = 0; c < innerCols; c++) {
            const key = `${r},${c}`;
            if (grid[key]) continue;
            const pos = gridToPixel(r, c);
            let tid;
            if (firstLevelKeys.has(key)) {
                tid = remainingFirstLevel.pop();
            } else {
                tid = shuffledRemaining.length > 0 ? shuffledRemaining.pop() : 'misc';
            }
            grid[key] = { key, r, c, ...pos, type: getNodeDef(tid), state: 'locked' };
        }
    }

    return { grid, allConnections, adjacency, startNodes, centerKey: startKey, nodeSize };
}

function renderMap(ctx) {
    const state = currentMapState;
    if (!state) return;
    const { grid, allConnections, centerKey, nodeSize } = state;
    const center = grid[centerKey];

    for (const conn of allConnections) {
        const n1 = grid[conn.key1], n2 = grid[conn.key2];
        if (!n1 || !n2) continue;
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;
        const isH = n1.r === n2.r;
        if (isH) {
            const off = nodeSize / 2 + 2;
            const ux = dx / len, uy = dy / len;
            const lit1 = n1.state === 'start' || n1.state === 'active' || n1.state === 'visited';
            const lit2 = n2.state === 'start' || n2.state === 'active' || n2.state === 'visited';
            const lineColor = (lit1 && lit2) ? 'rgba(230, 80, 130, 0.8)' : 'rgba(200, 200, 200, 0.60)';
            drawConnection(ctx, n1.x + ux * off, n1.y, n2.x - ux * off, n2.y, isH, lineColor);
        } else {
            const upperN = n1.y < n2.y ? n1 : n2;
            const lowerN = n1.y < n2.y ? n2 : n1;
            const isUpperStart = upperN.state === 'start';
            const fromY = isUpperStart
                ? upperN.y + nodeSize / 2 + 4
                : upperN.y + nodeSize / 2 + 11 + 7 + 4;
            const toY = lowerN.y - nodeSize / 2 - 4;
            const cx = (n1.x + n2.x) / 2;
            const lit1 = upperN.state === 'start' || upperN.state === 'active' || upperN.state === 'visited';
            const lit2 = lowerN.state === 'start' || lowerN.state === 'active' || lowerN.state === 'visited';
            const lineColor = (lit1 && lit2) ? 'rgba(230, 80, 130, 0.8)' : 'rgba(150, 140, 155, 0.45)';
            drawConnection(ctx, cx, fromY, cx, toY, isH, lineColor);
        }
    }

    for (const key of Object.keys(grid)) {
        const node = grid[key];
        if (node.state === 'start') continue;
        drawNode(ctx, node.x, node.y, nodeSize, node.type, node.state);
    }

    drawCrosshair(ctx, center.x, center.y);

    drawCandle(ctx);
}

function handleCanvasClick(e) {
    if (!currentMapState) return;
    const canvas = document.getElementById('mapCanvas');
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { grid, adjacency, nodeSize } = currentMapState;
    const hitR = nodeSize / 2 + 5;

    for (const key of Object.keys(grid)) {
        const node = grid[key];
        if (node.state !== 'active') continue;
        const dx = mx - node.x, dy = my - node.y;
        if (dx * dx + dy * dy < hitR * hitR) {
            if (!REPEATABLE_TYPES.has(node.type.id)) {
                node.state = 'visited';
            }
            for (const nk of (adjacency[key] || [])) {
                if (grid[nk] && grid[nk].state === 'locked') grid[nk].state = 'active';
            }
            stepCount++;
            saveHistory();
            redraw();
            break;
        }
    }
}

function drawCandle(ctx) {
    let candleKey;
    if (stepCount === 0) candleKey = ASSETS.candle0;
    else if (stepCount === 1) candleKey = ASSETS.candle1;
    else if (stepCount === 2) candleKey = ASSETS.candle2;
    else if (stepCount === 3) candleKey = ASSETS.candle3;
    else candleKey = ASSETS.candle4;

    const candleImg = loadedImages[candleKey];
    const size = 130;
    const cx = CANVAS_W - size / 2 - 60;
    const cy = size / 2 + 15;

    if (isReady(candleImg)) {
        ctx.drawImage(candleImg, cx - size / 2, cy - size / 2, size, size);
    }

    ctx.save();
    ctx.font = 'bold 32px "Novecento Normal", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(stepCount.toString(), cx, cy - 12);

    ctx.font = '12px "PingFang SC", sans-serif';
    ctx.fillStyle = '#dcdcdc';
    ctx.shadowColor = 'transparent';
    ctx.fillText("已用烛火", cx, cy + 18);
    ctx.restore();
}

function generateNewMap() {
    stepCount = 0;
    historyStack = [];
    historyIndex = -1;
    if (currentMode === 'shifei') {
        currentMapState = generateShifeiMap();
    } else {
        currentMapState = generateJinxiMap();
    }
    saveHistory();
}

function redraw() {
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr; canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`; canvas.style.height = `${CANVAS_H}px`;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground(ctx, CANVAS_W, CANVAS_H);
    renderMap(ctx);
}

function render() { generateNewMap(); redraw(); }

document.getElementById('btn-shifei').addEventListener('click', () => {
    currentMode = 'shifei';
    document.getElementById('btn-shifei').classList.add('active');
    document.getElementById('btn-jinxi').classList.remove('active');
    render();
});
document.getElementById('btn-jinxi').addEventListener('click', () => {
    currentMode = 'jinxi';
    document.getElementById('btn-jinxi').classList.add('active');
    document.getElementById('btn-shifei').classList.remove('active');
    render();
});
document.getElementById('btn-regenerate').addEventListener('click', render);

document.getElementById('btn-random-reveal').addEventListener('click', () => {
    if (!currentMapState) return;
    const { grid } = currentMapState;
    const locked = Object.keys(grid).filter(k => grid[k].state === 'locked');
    if (locked.length === 0) return;
    const key = locked[Math.floor(Math.random() * locked.length)];
    grid[key].state = 'active';
    saveHistory();
    redraw();
});

document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);

function revealByTypes(typeIds) {
    if (!currentMapState) return;
    const { grid } = currentMapState;
    let revealed = 0;
    for (const key of Object.keys(grid)) {
        const node = grid[key];
        if (node.state === 'locked' && typeIds.includes(node.type.id)) {
            node.state = 'active';
            revealed++;
        }
    }
    if (revealed > 0) {
        saveHistory();
        redraw();
    }
}

document.getElementById('btn-ziwujian').addEventListener('click', () => revealByTypes(['chaos']));
document.getElementById('btn-wushangshuo').addEventListener('click', () => revealByTypes(['encounter']));
document.getElementById('btn-shenzhulin').addEventListener('click', () => revealByTypes(['joy']));
document.getElementById('btn-yinshihu').addEventListener('click', () => revealByTypes(['legend', 'choice']));

document.getElementById('btn-reveal').addEventListener('click', () => {
    if (!currentMapState) return;
    const { grid } = currentMapState;
    for (const key of Object.keys(grid)) {
        if (grid[key].state === 'locked') grid[key].state = 'active';
    }
    saveHistory();
    redraw();
});

document.getElementById('mapCanvas').addEventListener('click', handleCanvasClick);

window.addEventListener('load', () => {
    preloadAssets();
    setTimeout(() => { render(); firstRenderDone = true; }, 200);
});
