/**
 * Project: Narezka3TG — Telegram Mini App
 * File: app.js
 * Version: 1.0.4
 */

// Telegram Mini Apps API. В обычном браузере приложение продолжает работать.
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
const isTelegramMiniApp = Boolean(tg);

function tgHaptic(type = 'light') {
    try {
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(type);
    } catch (_) {}
}

function tgShowAlert(message) {
    if (tg && typeof tg.showAlert === 'function') tg.showAlert(message);
    else alert(message);
}

function setupTelegramApp() {
    if (!tg) return;
    tg.ready();
    tg.expand();
    if (typeof tg.enableClosingConfirmation === 'function') tg.enableClosingConfirmation();
    document.documentElement.style.setProperty('--tg-bg-color', tg.backgroundColor || '#667eea');
    document.documentElement.style.setProperty('--tg-secondary-bg-color', tg.secondaryBackgroundColor || '#f8f9ff');
    document.documentElement.style.setProperty('--tg-text-color', tg.themeParams?.text_color || '#333333');
    document.documentElement.style.setProperty('--tg-hint-color', tg.themeParams?.hint_color || '#666666');
    tg.onEvent('themeChanged', () => {
        document.documentElement.style.setProperty('--tg-bg-color', tg.backgroundColor || '#667eea');
        document.documentElement.style.setProperty('--tg-secondary-bg-color', tg.secondaryBackgroundColor || '#f8f9ff');
        document.documentElement.style.setProperty('--tg-text-color', tg.themeParams?.text_color || '#333333');
        document.documentElement.style.setProperty('--tg-hint-color', tg.themeParams?.hint_color || '#666666');
    });
    if (tg.BackButton) {
        tg.BackButton.onClick(() => {
            tgHaptic('light');
            if (previewSection.classList.contains('active')) {
                previewSection.classList.remove('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (imageLoaded) {
                resetView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                tg.close();
            }
        });
    }
}

let originalImage = null;
let splitImages = [];
let currentZoom = 1;
let panX = 0;
let panY = 0;
let rotation = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let imageLoaded = false;
let currentRowPadding = 5;
let currentColPadding = 5;
let smoothingEnabled = true;
let rowPaddings = [];
let colPaddings = [];
let useDetailedPaddings = false;

const canvas = document.getElementById('editCanvas');
const ctx = canvas.getContext('2d');

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const imageEditor = document.getElementById('imageEditor');
const canvasContainer = document.getElementById('canvasContainer');
const gridOverlay = document.getElementById('gridOverlay');
const previewSection = document.getElementById('previewSection');
const gridPreview = document.getElementById('gridPreview');
const splitBtn = document.getElementById('splitBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const zoomInput = document.getElementById('zoomInput');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const changeImageBtn = document.getElementById('changeImageBtn');
const gridSize = document.getElementById('gridSize');
const customRows = document.getElementById('customRows');
const customCols = document.getElementById('customCols');
const useCustomGrid = document.getElementById('useCustomGrid');
const rowPaddingInput = document.getElementById('rowPaddingInput');
const colPaddingInput = document.getElementById('colPaddingInput');
const rowPaddingDirection = document.getElementById('rowPaddingDirection');
const colPaddingDirection = document.getElementById('colPaddingDirection');
const detailedPaddings = document.getElementById('detailedPaddings');
const rowPaddingsContainer = document.getElementById('rowPaddings');
const colPaddingsContainer = document.getElementById('colPaddings');
const useDetailedPaddingsCheckbox = document.getElementById('useDetailedPaddings');
const useDetailedRowPaddings = document.getElementById('useDetailedRowPaddings');
const useDetailedColPaddings = document.getElementById('useDetailedColPaddings');
const rotationSlider = document.getElementById('rotationSlider');
const rotationValue = document.getElementById('rotationValue');
const rotateLeft90Btn = document.getElementById('rotateLeft90');
const rotateRight90Btn = document.getElementById('rotateRight90');
const resetRotationBtn = document.getElementById('resetRotation');
const smoothingToggle = document.getElementById('smoothingToggle');
const smoothingStatus = document.getElementById('smoothingStatus');
const offlineIndicator = document.getElementById('offlineIndicator');

function init() {
    setupTelegramApp();
    if (isTelegramMiniApp) document.body.classList.add('telegram-mini-app');
    setupEventListeners();
    checkOnlineStatus();
    updateSmoothingStatus();
}

function checkOnlineStatus() {
    offlineIndicator.style.display = navigator.onLine ? 'none' : 'flex';
}

window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

function setupCanvas() {
    const rect = canvasContainer.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        updateCanvasTransform();
    }
}

function updateCanvasTransform() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (originalImage) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(currentZoom, currentZoom);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(panX, panY);
        ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
        ctx.restore();
    }
}

function setupEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());
    changeImageBtn.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    
    zoomInBtn.addEventListener('click', () => zoom(0.05));
    zoomOutBtn.addEventListener('click', () => zoom(-0.05));
    resetViewBtn.addEventListener('click', resetView);
    
    zoomInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value)) value = 100;
        value = Math.max(10, Math.min(500, value));
        e.target.value = value;
        currentZoom = value / 100;
        updateCanvasTransform();
    });
    zoomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') e.target.blur(); });
    
    rowPaddingInput.addEventListener('input', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 0) value = 0;
        if (value > 50) value = 50;
        currentRowPadding = value;
        if (previewSection.classList.contains('active')) updateGridPreviewGap();
    });
    
    colPaddingInput.addEventListener('input', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 0) value = 0;
        if (value > 50) value = 50;
        currentColPadding = value;
        if (previewSection.classList.contains('active')) updateGridPreviewGap();
    });
    
    useDetailedPaddingsCheckbox.addEventListener('change', (e) => {
        useDetailedPaddings = e.target.checked;
        if (useDetailedPaddings) {
            createDetailedPaddingInputs();
        } else {
            detailedPaddings.style.display = 'none';
        }
    });
    
    rotationSlider.addEventListener('input', (e) => {
        rotation = parseInt(e.target.value);
        rotationValue.textContent = rotation + '°';
        updateCanvasTransform();
    });
    
    rotateLeft90Btn.addEventListener('click', () => {
        rotation = (rotation - 90 + 360) % 360;
        if (rotation > 180) rotation -= 360;
        rotationSlider.value = rotation;
        rotationValue.textContent = rotation + '°';
        updateCanvasTransform();
    });
    
    rotateRight90Btn.addEventListener('click', () => {
        rotation = (rotation + 90) % 360;
        if (rotation > 180) rotation -= 360;
        rotationSlider.value = rotation;
        rotationValue.textContent = rotation + '°';
        updateCanvasTransform();
    });
    
    resetRotationBtn.addEventListener('click', () => {
        rotation = 0;
        rotationSlider.value = 0;
        rotationValue.textContent = '0°';
        updateCanvasTransform();
    });
    
    smoothingToggle.addEventListener('change', (e) => {
        smoothingEnabled = e.target.checked;
        updateSmoothingStatus();
    });
    
    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('wheel', handleWheel, {passive: false});
    
    canvas.addEventListener('touchstart', handleTouchStart, {passive: false});
    canvas.addEventListener('touchmove', handleTouchMove, {passive: false});
    canvas.addEventListener('touchend', endDrag);
    
    splitBtn.addEventListener('click', () => {
        tgHaptic('medium');
        splitImage();
    });
    downloadPngBtn.addEventListener('click', () => {
        tgHaptic('light');
        downloadAllAsPng();
    });
    
    gridSize.addEventListener('change', () => { updateGrid(); if (useDetailedPaddings) createDetailedPaddingInputs(); });
    customRows.addEventListener('input', () => { if (useCustomGrid.checked) { updateGrid(); if (useDetailedPaddings) createDetailedPaddingInputs(); } });
    customCols.addEventListener('input', () => { if (useCustomGrid.checked) { updateGrid(); if (useDetailedPaddings) createDetailedPaddingInputs(); } });
    useCustomGrid.addEventListener('change', () => { updateGrid(); if (useDetailedPaddings && useCustomGrid.checked) createDetailedPaddingInputs(); });
    
    window.addEventListener('resize', () => {
        setupCanvas();
        if (originalImage) updateGrid();
    });
}

function updateSmoothingStatus() {
    const onIndicator = smoothingStatus.querySelector('.on');
    const offIndicator = smoothingStatus.querySelector('.off');
    if (smoothingEnabled) {
        onIndicator.style.display = 'inline-block';
        offIndicator.style.display = 'none';
    } else {
        onIndicator.style.display = 'none';
        offIndicator.style.display = 'inline-block';
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) { alert('Пожалуйста, загрузите изображение!'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage = new Image();
        originalImage.onload = () => {
            imageLoaded = true;
            uploadArea.style.display = 'none';
            imageEditor.style.display = 'block';
            requestAnimationFrame(() => {
                setupCanvas();
                resetView();
                splitBtn.disabled = false;
                updateGrid();
            });
        };
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function zoom(delta) {
    currentZoom = Math.max(0.1, Math.min(5, currentZoom + delta));
    zoomInput.value = Math.round(currentZoom * 100);
    updateCanvasTransform();
}

function resetView() {
    currentZoom = 1; panX = 0; panY = 0;
    zoomInput.value = 100;
    updateCanvasTransform();
}

function startDrag(e) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    canvas.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    panX += dx / currentZoom;
    panY += dy / currentZoom;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    updateCanvasTransform();
}

function endDrag() { isDragging = false; canvas.style.cursor = 'move'; }

function handleWheel(e) {
    e.preventDefault();
    zoom(e.deltaY > 0 ? -0.05 : 0.05);
}

let initialPinchDistance = null;
function handleTouchStart(e) {
    if (e.touches.length === 2) initialPinchDistance = getPinchDistance(e.touches);
    else if (e.touches.length === 1) startDrag(e.touches[0]);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = getPinchDistance(e.touches);
        zoom((currentDistance - initialPinchDistance) / 300);
        initialPinchDistance = currentDistance;
    } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - dragStartX;
        const dy = touch.clientY - dragStartY;
        panX += dx / currentZoom;
        panY += dy / currentZoom;
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        updateCanvasTransform();
    }
}

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getGridSize() {
    if (useCustomGrid.checked) return { rows: parseInt(customRows.value) || 2, cols: parseInt(customCols.value) || 2 };
    const val = parseInt(gridSize.value) || 2;
    return { rows: val, cols: val };
}

function createDetailedPaddingInputs() {
    const { rows, cols } = getGridSize();
    rowPaddingsContainer.innerHTML = '';
    colPaddingsContainer.innerHTML = '';
    detailedPaddings.style.display = 'block';
    
    for (let i = 0; i < rows - 1; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'padding-input-wrapper';
        const label = document.createElement('label');
        label.textContent = `Ряд ${i + 1}-${i + 2}`;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '50';
        input.value = rowPaddings[i] !== undefined ? rowPaddings[i] : currentRowPadding;
        input.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 0) value = 0;
            if (value > 50) value = 50;
            rowPaddings[i] = value;
        });
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        rowPaddingsContainer.appendChild(wrapper);
    }
    
    for (let i = 0; i < cols - 1; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'padding-input-wrapper';
        const label = document.createElement('label');
        label.textContent = `Столбец ${i + 1}-${i + 2}`;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '50';
        input.value = colPaddings[i] !== undefined ? colPaddings[i] : currentColPadding;
        input.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 0) value = 0;
            if (value > 50) value = 50;
            colPaddings[i] = value;
        });
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        colPaddingsContainer.appendChild(wrapper);
    }
}

function updateGrid() {
    if (!imageLoaded) return;
    const { rows, cols } = getGridSize();
    gridOverlay.innerHTML = '';
    previewSection.classList.add('active');
    
    const containerRect = canvasContainer.getBoundingClientRect();
    const cellWidth = containerRect.width / cols;
    const cellHeight = containerRect.height / rows;
    
    gridOverlay.style.width = containerRect.width + 'px';
    gridOverlay.style.height = containerRect.height + 'px';
    
    for (let i = 1; i < cols; i++) {
        const line = document.createElement('div');
        line.className = 'grid-line-v';
        line.style.left = (i * cellWidth - 1) + 'px';
        gridOverlay.appendChild(line);
    }
    for (let i = 1; i < rows; i++) {
        const line = document.createElement('div');
        line.className = 'grid-line-h';
        line.style.top = (i * cellHeight - 1) + 'px';
        gridOverlay.appendChild(line);
    }
    
    gridPreview.innerHTML = '';
    gridPreview.style.gridTemplateColumns = `repeat(${cols}, 100px)`;
    updateGridPreviewGap();
}

function updateGridPreviewGap() { 
    gridPreview.style.gap = `${currentRowPadding}px ${currentColPadding}px`;
}

function generateFileName(index) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `part_${index}_${day}${month}${year}${hours}${minutes}.png`;
}

function splitImage() {
    if (!originalImage) return;
    const { rows, cols } = getGridSize();
    const pieceSize = 100;
    const rowDir = rowPaddingDirection.value;
    const colDir = colPaddingDirection.value;
    const targetSize = cols * pieceSize;
    
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = targetSize;
    captureCanvas.height = targetSize;
    const cCtx = captureCanvas.getContext('2d');
    
    cCtx.drawImage(canvas, 0, 0, targetSize, targetSize);
    
    splitImages = [];
    gridPreview.innerHTML = '';
    let partIndex = 0;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = pieceSize;
            finalCanvas.height = pieceSize;
            const finalCtx = finalCanvas.getContext('2d');
            
            finalCtx.imageSmoothingEnabled = smoothingEnabled;
            finalCtx.imageSmoothingQuality = 'high';
            
            let topPad = 0, bottomPad = 0, leftPad = 0, rightPad = 0;
            
            // Вертикальные отступы (строки)
            const useDetailedRows = useDetailedPaddings && useDetailedRowPaddings.checked;
            
            if (useDetailedRows) {
                if (rowDir === 'between') {
                    if (row === 0) {
                        topPad = 0;
                        bottomPad = rowPaddings[0] !== undefined ? rowPaddings[0] : currentRowPadding;
                    } else if (row === rows - 1) {
                        topPad = rowPaddings[row - 2] !== undefined ? rowPaddings[row - 2] : currentRowPadding;
                        bottomPad = 0;
                    } else {
                        topPad = rowPaddings[row - 1] !== undefined ? rowPaddings[row - 1] : currentRowPadding;
                        bottomPad = rowPaddings[row] !== undefined ? rowPaddings[row] : currentRowPadding;
                    }
                } else if (rowDir === 'top') {
                    topPad = rowPaddings[row] !== undefined ? rowPaddings[row] : currentRowPadding;
                    bottomPad = 0;
                } else if (rowDir === 'bottom') {
                    topPad = 0;
                    bottomPad = rowPaddings[row] !== undefined ? rowPaddings[row] : currentRowPadding;
                }
            } else {
                if (rowDir === 'between') {
                    if (row === 0) { topPad = 0; bottomPad = currentRowPadding; }
                    else if (row === rows - 1) { topPad = currentRowPadding; bottomPad = 0; }
                    else { topPad = currentRowPadding; bottomPad = currentRowPadding; }
                } else if (rowDir === 'top') {
                    topPad = currentRowPadding; bottomPad = 0;
                } else if (rowDir === 'bottom') {
                    topPad = 0; bottomPad = currentRowPadding;
                }
            }
            
            // Горизонтальные отступы (столбцы)
            const useDetailedCols = useDetailedPaddings && useDetailedColPaddings.checked;
            
            if (useDetailedCols) {
                if (colDir === 'between') {
                    if (col === 0) {
                        leftPad = 0;
                        rightPad = colPaddings[0] !== undefined ? colPaddings[0] : currentColPadding;
                    } else if (col === cols - 1) {
                        leftPad = colPaddings[col - 2] !== undefined ? colPaddings[col - 2] : currentColPadding;
                        rightPad = 0;
                    } else {
                        leftPad = colPaddings[col - 1] !== undefined ? colPaddings[col - 1] : currentColPadding;
                        rightPad = colPaddings[col] !== undefined ? colPaddings[col] : currentColPadding;
                    }
                } else if (colDir === 'left') {
                    leftPad = colPaddings[col] !== undefined ? colPaddings[col] : currentColPadding;
                    rightPad = 0;
                } else if (colDir === 'right') {
                    leftPad = 0;
                    rightPad = colPaddings[col] !== undefined ? colPaddings[col] : currentColPadding;
                }
            } else {
                if (colDir === 'between') {
                    if (col === 0) { leftPad = 0; rightPad = currentColPadding; }
                    else if (col === cols - 1) { leftPad = currentColPadding; rightPad = 0; }
                    else { leftPad = currentColPadding; rightPad = currentColPadding; }
                } else if (colDir === 'left') {
                    leftPad = currentColPadding; rightPad = 0;
                } else if (colDir === 'right') {
                    leftPad = 0; rightPad = currentColPadding;
                }
            }
            
            const x = col * pieceSize;
            const y = row * pieceSize;
            const srcWidth = Math.max(0, pieceSize - leftPad - rightPad);
            const srcHeight = Math.max(0, pieceSize - topPad - bottomPad);
            
            finalCtx.drawImage(captureCanvas, x + leftPad, y + topPad, srcWidth, srcHeight, leftPad, topPad, srcWidth, srcHeight);
            
            const dataUrl = finalCanvas.toDataURL('image/png');
            splitImages.push({ dataUrl, name: generateFileName(partIndex), index: partIndex });
            
            const wrapper = document.createElement('div');
            wrapper.className = 'part-wrapper';
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = `Часть ${partIndex}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.index = partIndex;
            checkbox.title = `Часть ${partIndex}`;
            
            wrapper.appendChild(img);
            wrapper.appendChild(checkbox);
            gridPreview.appendChild(wrapper);
            partIndex++;
        }
    }
    
    downloadPngBtn.disabled = false;
    updateGridPreviewGap();
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function downloadAllAsPng() {
    if (splitImages.length === 0) return;

    const checkboxes = gridPreview.querySelectorAll('input[type="checkbox"]');
    const selectedIndices = new Set();
    checkboxes.forEach(cb => { if (cb.checked) selectedIndices.add(parseInt(cb.dataset.index)); });

    if (selectedIndices.size === 0) {
        alert('Пожалуйста, выберите хотя бы одну часть для скачивания!');
        return;
    }

    const selectedImages = splitImages.filter(img => selectedIndices.has(img.index));

    if (navigator.share && navigator.canShare) {
        try {
            const files = [];
            for (const img of selectedImages) {
                const byteString = atob(img.dataUrl.split(',')[1]);
                const mimeString = img.dataUrl.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                files.push(new File([ab], img.name, { type: mimeString }));
            }
            if (navigator.canShare({ files })) {
                await navigator.share({ files: files, title: 'Нарезанные изображения' });
                return;
            }
        } catch (err) {
            console.log('Share API failed, falling back to standard download', err);
        }
    }

    alert('Нажмите "Разрешить", если браузер спросит разрешение на скачивание нескольких файлов.');
    for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        const link = document.createElement('a');
        link.download = img.name;
        link.href = img.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (i < selectedImages.length - 1) await new Promise(resolve => setTimeout(resolve, 500));
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW error:', err));
    });
}

document.addEventListener('DOMContentLoaded', init);