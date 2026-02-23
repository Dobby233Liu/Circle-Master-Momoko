import "./index.css";
import { initI18n, setTextLocalizable } from "./i18n.js";

if (import.meta.env.DEV) {
    import("./fa.js");
}

const canvas = document.getElementById('gameCanvas');
const container = document.getElementById('canvas-container');
const ctx = canvas.getContext('2d');
const resultOverlay = document.getElementById('result-overlay');
const scoreLabel = document.getElementById('score-label');
const scoreDiv = document.getElementById('score');
const messageDiv = document.getElementById('message');
const guideBtn = document.getElementById('guide-toggle');
const guideBtnIcon = document.getElementById('guide-toggle-icon');
const guideBtnText = document.getElementById('guide-toggle-text');

let isDrawing = false;
let points = [];
let canvasSize = 0;
let isGuideMode = false;
let currentScore = 0;
let currentMessage = "";

const MIN_POINT_COUNT = 20;

// Dynamic styles based on size
let lineWidthUser = 12;
let lineWidthGuide = 24;
const THICKNESS_RATIO = 0.10; 

async function init() {
    guideBtn.addEventListener("click", toggleGuide);
    document.getElementById("share-on-twitter").addEventListener("click", shareTwitter);
    document.getElementById("reset-game").addEventListener("click", resetGame);
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener("contextrestored", redrawCanvas);
    
    // Pointer events
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', endDrawing);
    canvas.addEventListener('pointerout', endDrawing);
    
    await initI18n();
}
document.addEventListener("DOMContentLoaded", init);

function toggleGuide() {
    isGuideMode = !isGuideMode;
    if (isGuideMode) {
        guideBtnIcon.className = "fa-solid fa-check-circle text-orange-500";
        guideBtnText.className = "text-orange-500";
        setTextLocalizable(guideBtnText, "guideToggleLabel", { context: "on" });
        guideBtn.classList.add('border-orange-200', 'bg-orange-50');
    } else {
        guideBtnIcon.className = "fa-regular fa-circle";
        guideBtnText.className = "";
        setTextLocalizable(guideBtnText, "guideToggleLabel", { context: "off" });
        guideBtn.classList.remove('border-orange-200', 'bg-orange-50');
    }
    resetGame();
}

function resizeCanvas() {
    const I_PREFER_MY_STUPID_ANIMATION_OVER_CORRECTNESS = false;
    if (I_PREFER_MY_STUPID_ANIMATION_OVER_CORRECTNESS) {
        const header = document.getElementById('header-area');
        const footer = document.getElementById('footer-area');
        
        // Calculate available space
        const windowDims = document.documentElement.getBoundingClientRect();
        
        // Subtract body padding + vertical UI element heights + vertical margin of canvas
        const uiHeight = 16 + header.getBoundingClientRect().height + footer.getBoundingClientRect().height + 16;
        const availableHeight = windowDims.height - uiHeight;
        
        // Determine the maximum possible square size
        canvasSize = Math.min(windowDims.width, availableHeight);
    } else {
        // We rely on the browser's layout engine to calculate available space
        canvas.classList.add("hidden");
        canvasSize = container.getBoundingClientRect().width;
        canvas.classList.remove("hidden");
    }
    
    // Update styling params
    // Adjusted: Made the lines thinner relative to canvas size for a cleaner look
    lineWidthUser = Math.max(6, canvasSize * 0.02); 
    lineWidthGuide = lineWidthUser * 2;

    let resized = false;
    const dpr = window.devicePixelRatio || 1;
    const realCanvasSize = Math.round(canvasSize * (dpr > 1 ? dpr : 1));
    if (canvas.width != realCanvasSize || canvas.height != realCanvasSize) {
        canvas.width = realCanvasSize;
        canvas.height = realCanvasSize;
        resized = true;
    }
    
    // Set style dimensions
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    if (I_PREFER_MY_STUPID_ANIMATION_OVER_CORRECTNESS) {
        container.style.width = `${canvasSize}px`;
        container.style.height = `${canvasSize}px`;
    }

    if (dpr > 1) {
        ctx.scale(dpr, dpr);
        canvas.classList.add("game-canvas-downscaled");
    } else {
        canvas.classList.remove("game-canvas-downscaled");
    }
    
    if (resized) {
        redrawCanvas();
    }
}

function redrawCanvas() {
    if (!isDrawing && points.length >= MIN_POINT_COUNT) {
        setupUserBrush();
        showResultGraphics();
    } else {
        drawHint();
        setupUserBrush();
        drawUserPainting(true);
    }
}

function drawHint(results) {
    if (isGuideMode) {
        ctx.beginPath();
        ctx.strokeStyle = results ? '#FFF7ED' : '#FED7AA'; 
        ctx.lineWidth = lineWidthGuide; 
        ctx.arc(canvasSize/2, canvasSize/2, canvasSize/3, 0, Math.PI * 2);
        ctx.stroke();
    }
}

class CircleGamePoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    static /*@__MANGLE_PROP__*/ fromPhysicalCanvasPos(x, y) {
        return new this(x / canvasSize, y / canvasSize);
    }
    
    static /*@__MANGLE_PROP__*/ fromPointerEvent({ clientX, clientY }) {
        const rect = canvas.getBoundingClientRect();
        return this.fromPhysicalCanvasPos(clientX - rect.left, clientY - rect.top);
    }
    
    /*@__MANGLE_PROP__*/ toCanvasPos() {
        return [this.x * canvasSize, this.y * canvasSize];
    }
}

function setupUserBrush() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#EFB864'; 
    ctx.lineWidth = lineWidthUser;
}
function clearCanvas() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
}

let startDrawingDebounceTimer = null;
function startStartDrawingDebounce() {
    endStartDrawingDebounce();
    startDrawingDebounceTimer = setTimeout(endStartDrawingDebounce, 50);
}
function endStartDrawingDebounce() {
    clearTimeout(startDrawingDebounceTimer);
    startDrawingDebounceTimer = null;
}

let currentPointer = -1;

function startDrawing(e) {
    currentPointer = e.pointerId;
    
    if (!resultOverlay.classList.contains('hidden')) {
        if (startDrawingDebounceTimer) return;
        resetGame();
    }
    endStartDrawingDebounce();
    isDrawing = true;
    points = [];
    resultOverlay.classList.remove('flex');
    resultOverlay.classList.remove('animate-fade-in-and-slide-up');
    resultOverlay.classList.add('hidden');
    clearCanvas();
    drawHint(); 
    
    setupUserBrush();
    ctx.beginPath();
    const pos = CircleGamePoint.fromPointerEvent(e);
    points.push(pos);
    ctx.moveTo(...pos.toCanvasPos());
}

function draw(e) {
    if (!isDrawing) return;
    if (currentPointer != e.pointerId) return;
    
    const pos = CircleGamePoint.fromPointerEvent(e);
    points.push(pos);
    ctx.lineTo(...pos.toCanvasPos());
    ctx.stroke();
}

function endDrawing(ev) {
    if (!isDrawing) return;
    if (currentPointer != ev.pointerId) return;
    
    isDrawing = false;
    if (points.length < MIN_POINT_COUNT) return;
    evaluateCircle();
}

function drawUserPainting(strokeImmediately) {
    if (points.length <= 0) return;
    ctx.beginPath();
    ctx.moveTo(...points[0].toCanvasPos());
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(...points[i].toCanvasPos());
        if (strokeImmediately)
            ctx.stroke();
    }
    if (!strokeImmediately)
        ctx.stroke();
}

function evaluateCircle() {
    let sumX = 0, sumY = 0;
    points.forEach(p => { sumX += p.x; sumY += p.y; });
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    const distances = points.map(p => Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2));
    const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;

    const safeZoneHalfWidth = avgRadius * (THICKNESS_RATIO / 2); 
    
    let errorSum = 0;
    distances.forEach(d => {
        const diff = Math.abs(d - avgRadius);
        const adjustedDiff = Math.max(0, diff - safeZoneHalfWidth);
        errorSum += adjustedDiff;
    });
    
    const errorRate = errorSum / distances.length / avgRadius;

    const start = points[0];
    const end = points[points.length - 1];
    const gap = Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
    const adjustedGap = Math.max(0, gap - (avgRadius * THICKNESS_RATIO));
    const gapPenalty = (adjustedGap / avgRadius) * 0.1; 

    let rawScore = 100 - (errorRate * 250 + gapPenalty * 100); 
    let score = Math.round(rawScore);
    score = Math.max(0, Math.min(100, score));

    showResult(score, centerX, centerY, avgRadius);
}

let [resultCx, resultCy, resultR] = [0, 0, 0];
function showResultGraphics(cx, cy, r) {
    resultCx = cx ?? resultCx;
    resultCy = cy ?? resultCy;
    resultR = r ?? resultR;
    cx = resultCx * canvasSize;
    cy = resultCy * canvasSize;
    r = resultR * canvasSize;
    
    clearCanvas();
    drawHint(true);

    const visualThickness = r * THICKNESS_RATIO;
    ctx.strokeStyle = 'rgba(239, 184, 100, 0.4)';
    ctx.lineWidth = visualThickness;
    
    // 1. Ideal "Thick" Circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 2. XOR with User's Drawing
    ctx.globalCompositeOperation = 'xor';
    drawUserPainting();
    ctx.globalCompositeOperation = 'source-over';
    
    // --- OUTLINE LAYER ---
    ctx.beginPath();
    ctx.strokeStyle = '#F8A5C2'; 
    ctx.lineWidth = lineWidthUser * 0.4;
    ctx.setLineDash([lineWidthUser, lineWidthUser]);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = lineWidthUser * 0.6;
    drawUserPainting();
}

function showResult(score, cx, cy, r) {
    currentScore = score;
    startStartDrawingDebounce();

    showResultGraphics(cx, cy, r);

    // Update Text
    setTextLocalizable(scoreLabel, "resultScoreLabel", {
        interpolation: { count: score }
    });
    setTextLocalizable(scoreDiv, "resultScoreDisplay", {
        interpolation: { count: score }
    });
    
    let msgContext = 0;
    let colorClass = "text-gray-600";

    // Note that we assume 5 entries...
    const msgIndex = Math.floor(Math.random() * 5);
    if (score == 100) {
        msgContext = 100;
        colorClass = "text-orange-500";
        triggerConfetti(score); 
    } else if (score >= 90) {
        msgContext = 90;
        colorClass = "text-orange-400";
        triggerConfetti(score); 
    } else if (score >= 80) {
        msgContext = 80;
    } else if (score >= 60) {
        msgContext = 60;
    } else {
        msgContext = 0;
    }

    const msg = "resultComment" + msgContext + "." + msgIndex;
    currentMessage = msg;
    setTextLocalizable(messageDiv, msg);
    messageDiv.className = `font-bold whitespace-normal break-words leading-tight text-lg md:text-xl ${colorClass}`;
    
    resultOverlay.classList.remove('hidden');
    resultOverlay.classList.add('flex');
    resultOverlay.classList.add('animate-fade-in-and-slide-up');
}

function shareTwitter() {
    const text = i18next.t("shareTweetText", {
        score: currentScore,
        message: currentMessage
    });
    const url = window.location.href; 
    const twitterUrl = new URL("https://twitter.com/intent/tweet");
    twitterUrl.searchParams.set("text", text);
    twitterUrl.searchParams.set("url", url);
    window.open(twitterUrl, '_blank');
}

function resetGame() {
    endStartDrawingDebounce();
    isDrawing = false;
    points = [];
    resultOverlay.classList.add('hidden');
    resultOverlay.classList.remove('animate-fade-in-and-slide-up');
    clearCanvas();
    drawHint();
}

const confettiContainer = document.getElementById("confetti-container");
function triggerConfetti(score) {
    const colors = ['#EFB864', '#F8A5C2', '#60A5FA', '#FCD34D', '#FFFFFF']; // TODO: unhardcode these?
    const count = 100; 
    
    const newConfettis = [];
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'dvw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        confetti.style.setProperty("--tw-rotate-z", `rotateZ(${Math.random() * 360}deg)`);
        
        let shapes = ['confetti-triangle'];
        if (score >= 100) {
            shapes = ['confetti-circle', 'confetti-square', 'confetti-triangle'];
        } else if (score >= 90) {
            shapes = ['confetti-square', 'confetti-triangle'];
        }
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.classList.add(shape);

        newConfettis.push(confetti);
        confettiContainer.appendChild(confetti);
    }
    setTimeout(() => newConfettis.forEach(i => i.remove()), 3500);
}