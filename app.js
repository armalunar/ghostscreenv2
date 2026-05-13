const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const MIN_STEP_DURATION = 8000;
const NOTIFICATION_VISIBLE_MS = 7200;
const AI_SCAN_DELAY_MS = 2200;
const AI_PROTECT_DELAY_MS = 4300;
const AI_NOTIFICATION_DELAY_MS = 5200;

/* Lock screen wallpapers — add images to assets/wallpapers/ and list them here. */
const WALLPAPERS = [
    "assets/wallpapers/wallpaper1.jpg",
    "assets/wallpapers/wallpaper2.webp",
    "assets/wallpapers/wallpaper3.jpg"
];

/* Neutral screen images — add images to assets/telaneutra/ and list them here. */
const DEFAULT_NEUTRAL_IMAGE = "assets/telaneutra/telaneutra.png";
const NEUTRAL_IMAGES = [
    DEFAULT_NEUTRAL_IMAGE,
    "assets/telaneutra/eyes.gif",
    "assets/telaneutra/gorila.png"
];

const elements = {
    clock: $("#clock"),
    stack: $("#notification-stack"),
    appContent: $("#app-content"),
    overlay: $("#simulation-overlay"),
    simulationLabel: $("#simulation-label"),
    simulationStep: $("#simulation-step"),
    simulationAlert: $("#simulation-alert"),
    simulationProgress: $("#simulation-progress"),
    mockApp: $("#mock-app"),
    islandCopy: $("#island-copy"),
    riskPill: $("#risk-pill"),
    radarScore: $("#radar-score"),
    assistantCopy: $("#assistant-copy"),
    liveEvent: $("#live-event"),
    lastScan: $("#last-scan"),
    activeModules: $("#active-modules"),
    reactionTime: $("#reaction-time"),
    attemptCount: $("#attempt-count"),
    activationCount: $("#activation-count"),
    reportUpdated: $("#report-updated"),
    remoteState: $("#remote-state"),
    remoteCopy: $("#remote-copy"),
    sensitivity: $("#sensitivity"),
    sensitivityLabel: $("#sensitivity-label"),
    blurLevel: $("#blur-level"),
    blurLabel: $("#blur-label"),
    dimLevel: $("#dim-level"),
    dimLabel: $("#dim-label"),
    brightnessLevel: $("#brightness-level"),
    brightnessLabel: $("#brightness-label"),
    fakeScreen: $("#fake-screen"),
    lockWallpaper: $("#lock-wallpaper"),
    scenarioSelect: $("#scenario-select"),
    remotePassword: $("#remote-password"),
    saveRemotePassword: $("#save-remote-password"),
    soundToggle: $("#sound-toggle")
};

const appState = {
    attempts: 31,
    activations: 46,
    cadence: 1,
    demoToken: 0,
    progressFrame: 0,
    soundOn: true,
    audioContext: null,
    enabledDemoSteps: new Set(["messages", "risk", "antiSpy", "banking", "ambient", "vault", "video"]),
    remotePasswordSet: false,
    blurLevel: 7,
    dimLevel: 0.62,
    brightnessLevel: 0.8,
    paused: false,
    pauseStart: null,
    pausedTotal: 0,
    neutralImage: DEFAULT_NEUTRAL_IMAGE,
    wallpaper: "assets/wallpapers/wallpaper1.jpg"
};

const icon = (id, className = "icon") =>
    `<svg class="${className}" aria-hidden="true"><use href="#${id}"></use></svg>`;

function isPhoneRuntime() {
    const ua = navigator.userAgent || "";
    const uaDataPhone = Boolean(navigator.userAgentData && navigator.userAgentData.mobile);
    const userAgentPhone = /iPhone|iPod|Windows Phone|IEMobile|Opera Mini|Android.+Mobile/i.test(ua);
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const narrowViewport = window.matchMedia("(max-width: 767px)").matches;

    return uaDataPhone || userAgentPhone || (coarsePointer && narrowViewport);
}

function syncRuntimeDeviceMode() {
    const phoneRuntime = isPhoneRuntime();
    const root = document.documentElement;
    const shell = $(".phone-shell");
    const hint = $(".power-hint span");

    root.classList.toggle("is-phone-runtime", phoneRuntime);
    root.dataset.runtimeDevice = phoneRuntime ? "phone" : "desktop";

    if (shell) {
        if (phoneRuntime) {
            shell.removeAttribute("src");
        } else if (!shell.getAttribute("src")) {
            shell.src = shell.dataset.shellSrc || "assets/phone-shell.png";
        }
    }

    if (hint) {
        hint.textContent = phoneRuntime ? "Toque para ligar" : "Pressione para ligar";
    }
}

function setupRuntimeDeviceMode() {
    syncRuntimeDeviceMode();
    window.addEventListener("resize", syncRuntimeDeviceMode);
    window.addEventListener("orientationchange", () => window.setTimeout(syncRuntimeDeviceMode, 120));
}

function isPhoneRuntimeMode() {
    return document.documentElement.classList.contains("is-phone-runtime");
}

/* Apply selected wallpaper to the lock screen */
function applyWallpaper(src) {
    const el = elements.lockWallpaper || $("#lock-wallpaper");
    if (!el) return;
    if (src) {
        el.style.backgroundImage = `url('${src}')`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.dataset.hasWallpaper = "true";
    } else {
        el.style.backgroundImage = "";
        el.style.backgroundSize = "";
        el.style.backgroundPosition = "";
        delete el.dataset.hasWallpaper;
    }
}

/* Render a thumb grid and return its HTML, wiring up click events after insertion */
function buildImageGrid(containerId, images, currentSrc, onSelect) {
    const grid = $(`#${containerId}`);
    if (!grid) return;
    if (images.length === 0) return;
    grid.innerHTML = images.map((src, i) => `
        <div class="neutral-thumb${currentSrc === src ? " is-selected" : ""}" data-src="${src}">
            <img src="${src}" alt="Imagem ${i + 1}" loading="lazy">
        </div>
    `).join("");
    $$(".neutral-thumb", grid).forEach((thumb) => {
        thumb.addEventListener("click", () => {
            $$(".neutral-thumb", grid).forEach((t) => t.classList.remove("is-selected"));
            thumb.classList.add("is-selected");
            onSelect(thumb.dataset.src);
        });
    });
}

/* Render the wallpaper picker panels */
function renderWallpaperPicker() {
    const noWp = $("#wp-no-wallpapers");
    const noNt = $("#wp-no-telaneutra");

    if (WALLPAPERS.length === 0) {
        if (noWp) noWp.hidden = false;
    } else {
        if (noWp) noWp.hidden = true;
        buildImageGrid("wp-grid-wallpapers", WALLPAPERS, appState.wallpaper, (src) => {
            appState.wallpaper = src;
            applyWallpaper(src);
        });
    }

    if (NEUTRAL_IMAGES.length === 0) {
        if (noNt) noNt.hidden = false;
    } else {
        if (noNt) noNt.hidden = true;
        buildImageGrid("wp-grid-telaneutra", NEUTRAL_IMAGES, appState.neutralImage, (src) => {
            appState.neutralImage = src;
        });
    }
}

/* Pause-aware timeout: if simulation is paused when the delay fires,
   it waits (polling every 100ms) until unpaused before calling fn.
   If token is supplied and no longer matches, fn is skipped. */
function safeTimeout(fn, delay, token) {
    function tryExecute() {
        if (token !== undefined && token !== appState.demoToken) return;
        if (appState.paused) {
            window.setTimeout(tryExecute, 100);
            return;
        }
        fn();
    }
    window.setTimeout(tryExecute, delay);
}

const modules = [
    {
        icon: "icon-chat",
        demoKeys: ["messages"],
        title: "Mensagens",
        description: "Privacidade forte com blur automático em nomes, prévias e conversas abertas.",
        level: "Forte"
    },
    {
        icon: "icon-bank",
        demoKeys: ["banking"],
        title: "Banco e carteira",
        description: "Blackout lateral máximo com mascaramento de saldo, cartão e transferências.",
        level: "Máxima"
    },
    {
        icon: "icon-eye",
        demoKeys: ["risk", "antiSpy"],
        title: "Modo Anti-espião",
        description: "A câmera frontal combina múltiplos rostos e ângulo de visão antes da resposta.",
        level: "Tempo real"
    },
    {
        icon: "icon-lock",
        demoKeys: ["vault"],
        title: "Modo Cofre Visual",
        description: "Se o risco persiste, o app bloqueia, oculta ou troca para uma tela falsa.",
        level: "Configurável"
    },
    {
        icon: "icon-video",
        demoKeys: ["video"],
        title: "Vídeo e streaming",
        description: "Proteção reduzida para manter conforto visual em YouTube, Netflix e aulas.",
        level: "Leve"
    },
    {
        icon: "icon-sun",
        demoKeys: ["ambient"],
        title: "Luz ambiente",
        description: "A película aumenta a privacidade em locais claros e suaviza em baixa luz.",
        level: "Adaptativa"
    }
];

const protectedApps = [
    ["Mensagens", 94],
    ["Banco", 88],
    ["E-mail", 71],
    ["Instagram", 54],
    ["YouTube", 28]
];

const feedItems = [
    {
        icon: "icon-eye",
        title: "Olhar lateral detectado",
        detail: "Mensagens recebeu blur forte",
        time: "09:46"
    },
    {
        icon: "icon-bank",
        title: "Blackout máximo",
        detail: "Banco protegido em ambiente claro",
        time: "09:38"
    },
    {
        icon: "icon-lock",
        title: "Cofre Visual pronto",
        detail: "Tela falsa definida como Calculadora",
        time: "09:21"
    }
];

/* ============================================================
   FACE SVG BUILDERS
   ============================================================ */
function buildPrimaryFace() {
    return `<svg class="face-svg" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="pgr" cx="45%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#5ac8fa"/>
                <stop offset="100%" stop-color="#007aff"/>
            </radialGradient>
        </defs>
        <circle cx="22" cy="22" r="22" fill="url(#pgr)"/>
        <g class="eye-blink-primary" style="transform-box:fill-box;transform-origin:center">
            <ellipse cx="15" cy="17" rx="4.5" ry="5.5" fill="#00204d"/>
            <ellipse cx="15" cy="17" rx="2.6" ry="3.2" fill="#1a4db8"/>
            <circle cx="16.8" cy="15.2" r="1.9" fill="white" opacity="0.92"/>
        </g>
        <g class="eye-blink-primary-2" style="transform-box:fill-box;transform-origin:center">
            <ellipse cx="29" cy="17" rx="4.5" ry="5.5" fill="#00204d"/>
            <ellipse cx="29" cy="17" rx="2.6" ry="3.2" fill="#1a4db8"/>
            <circle cx="30.8" cy="15.2" r="1.9" fill="white" opacity="0.92"/>
        </g>
        <path d="M14 27 Q22 33 30 27" stroke="white" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <circle cx="22" cy="22" r="21" fill="none" stroke="#30d158" stroke-width="1.5" opacity="0.85"/>
    </svg>`;
}

function buildEvilFace(id, color1, color2) {
    return `<svg class="face-svg" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="egr${id}" cx="45%" cy="35%" r="65%">
                <stop offset="0%" stop-color="${color1}"/>
                <stop offset="100%" stop-color="${color2}"/>
            </radialGradient>
        </defs>
        <circle cx="17" cy="17" r="17" fill="url(#egr${id})"/>
        <path d="M5 9 L13 14" stroke="#1a0000" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M29 9 L21 14" stroke="#1a0000" stroke-width="2.4" stroke-linecap="round"/>
        <g class="eye-blink" style="transform-box:fill-box;transform-origin:center">
            <ellipse cx="11" cy="19" rx="4" ry="5" fill="#1a0000"/>
            <ellipse cx="11" cy="19" rx="2.2" ry="2.8" fill="#cc0000"/>
            <circle cx="12.4" cy="17.3" r="1.4" fill="white" opacity="0.82"/>
        </g>
        <g class="eye-blink-2" style="transform-box:fill-box;transform-origin:center">
            <ellipse cx="23" cy="19" rx="4" ry="5" fill="#1a0000"/>
            <ellipse cx="23" cy="19" rx="2.2" ry="2.8" fill="#cc0000"/>
            <circle cx="24.4" cy="17.3" r="1.4" fill="white" opacity="0.82"/>
        </g>
        <path d="M8 28 Q17 22.5 26 28" stroke="#1a0000" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <circle cx="17" cy="17" r="16" fill="none" stroke="#ff3b30" stroke-width="1.5" opacity="0.9"/>
    </svg>`;
}

/* ============================================================
   STEP LIBRARY
   ============================================================ */
const stepLibrary = {
    calibration: {
        key: "calibration",
        className: "state-calibration",
        label: "Calibragem neural da película",
        title: "Sensores sincronizados",
        body: "Câmera frontal, luminosidade e toque da película entram no mesmo ciclo de leitura.",
        island: "Calibrando",
        duration: 9000,
        sound: "scan",
        notification: {
            title: "Película conectada",
            body: "Película V2 conectada ao app e sensores calibrados.",
            icon: "icon-scan"
        },
        stats: {
            pill: "Blindado",
            pillClass: "success",
            score: 96,
            copy: "IA monitorando olhares, conteúdo, luz ambiente e ângulo lateral em tempo real.",
            event: "Sensores alinhados com a câmera frontal e a película adaptativa."
        },
        render: renderCalibration
    },
    messages: {
        key: "messages",
        className: "state-messages",
        label: "Privacidade forte em mensagens",
        title: "Conteúdo sensível em foco",
        body: "A IA identifica conversa privada e aplica blur nas áreas que expõem dados pessoais.",
        island: "Blur ativo",
        duration: 10500,
        sound: "notification",
        notification: {
            title: "Proteção em Mensagens",
            body: "Blur inteligente aplicado em trechos sensíveis da conversa.",
            icon: "icon-chat"
        },
        stats: {
            pill: "Protegendo",
            pillClass: "warn",
            score: 92,
            copy: "Mensagens entram em modo forte, com blur localizado e visual ainda utilizável.",
            event: "Prévia de conversa protegida por contexto de aplicativo."
        },
        reportBump: true,
        render: renderMessages
    },
    risk: {
        key: "risk",
        className: "state-risk",
        label: "Detecção de múltiplos olhares",
        title: "Segundo rosto no campo de visão",
        body: "O app cruza câmera frontal e sensores laterais para medir risco sem ação manual.",
        island: "Risco lateral",
        duration: 11000,
        sound: "alert",
        notification: {
            title: "Risco de exposição",
            body: "Mais de um olhar detectado diante da tela.",
            icon: "icon-eye"
        },
        stats: {
            pill: "Risco",
            pillClass: "warn",
            score: 78,
            copy: "A proteção sobe de nível enquanto a IA mede persistência do olhar lateral.",
            event: "Múltiplos olhares detectados em ambiente compartilhado."
        },
        reportBump: true,
        render: renderRisk
    },
    antiSpy: {
        key: "antiSpy",
        className: "state-anti-spy",
        label: "Modo Anti-espião Inteligente",
        title: "Escurecimento lateral ativado",
        body: "As bordas escurecem para reduzir ângulo de visão sem esconder o centro da tela.",
        island: "Anti-espião",
        duration: 12000,
        sound: "shield",
        notification: {
            title: "Anti-espião ativo",
            body: "Escurecimento lateral inteligente protegendo o conteúdo principal.",
            icon: "icon-shield"
        },
        stats: {
            pill: "Blindado",
            pillClass: "success",
            score: 89,
            copy: "Escurecimento lateral ativo com centro preservado para o usuário principal.",
            event: "Película limitou o ângulo de visão automaticamente."
        },
        reportBump: true,
        render: renderAntiSpy
    },
    banking: {
        key: "banking",
        className: "state-banking",
        label: "Banco com blackout máximo",
        title: "Dados financeiros ocultados",
        body: "Saldo, cartão e transferências recebem blackout lateral e blur de alta intensidade.",
        island: "Banco seguro",
        duration: 11500,
        sound: "shield",
        notification: {
            title: "Banco protegido",
            body: "Blackout lateral máximo e blur de saldo foram aplicados.",
            icon: "icon-bank"
        },
        stats: {
            pill: "Máximo",
            pillClass: "success",
            score: 97,
            copy: "Apps bancários entram no perfil de proteção máxima automaticamente.",
            event: "Saldo e dados bancários protegidos contra leitura lateral."
        },
        reportBump: true,
        render: renderBanking
    },
    ambient: {
        key: "ambient",
        className: "state-ambient",
        label: "Película adaptativa",
        title: "Luz ambiente recalculada",
        body: "A IA ajusta privacidade e conforto visual conforme a intensidade de luz ao redor.",
        island: "Adaptando",
        duration: 9500,
        sound: "scan",
        notification: {
            title: "Conforto visual",
            body: "Proteção lateral ajustada ao nível de luminosidade do ambiente.",
            icon: "icon-sun"
        },
        stats: {
            pill: "Adaptando",
            pillClass: "info",
            score: 91,
            copy: "A película reduz agressividade em baixa luz e aumenta barreira em locais claros.",
            event: "Privacidade recalibrada com base na luz ambiente."
        },
        render: renderAmbient
    },
    video: {
        key: "video",
        className: "state-video",
        label: "Proteção em vídeo e streaming",
        title: "Streaming com privacidade leve",
        body: "Proteção reduzida mantém conforto visual no YouTube, Netflix e aulas online.",
        island: "Vídeo seguro",
        duration: 10000,
        sound: "notification",
        notification: {
            title: "Modo Streaming",
            body: "Proteção leve ativa: lateral monitorada sem afetar a imagem central.",
            icon: "icon-video"
        },
        stats: {
            pill: "Streaming",
            pillClass: "info",
            score: 85,
            copy: "Proteção reduzida mantém conforto visual durante streaming e aulas online.",
            event: "Modo streaming ativado com monitoramento lateral leve."
        },
        reportBump: true,
        render: renderVideo
    },
    vault: {
        key: "vault",
        className: "state-vault",
        label: "Modo Cofre Visual",
        title: "Risco persistente confirmado",
        body: "A interface real é ocultada e substituída por uma tela falsa configurada no app.",
        island: "Cofre Visual",
        duration: 14000,
        sound: "vault",
        notification: {
            title: "Cofre Visual",
            body: "Tela falsa ativada para encobrir o conteúdo real.",
            icon: "icon-lock"
        },
        stats: {
            pill: "Cofre",
            pillClass: "warn",
            score: 99,
            copy: "Risco persistente acionou ocultação do conteúdo real e tela falsa configurável.",
            event: "Modo Cofre Visual acionado por persistência de risco."
        },
        reportBump: true,
        render: renderVaultReal
    },
    report: {
        key: "report",
        className: "state-calibration",
        label: "Registro no aplicativo",
        title: "Relatório atualizado",
        body: "Tentativa, app protegido, resposta da IA e nível aplicado entram no histórico.",
        island: "Relatório",
        duration: 10000,
        sound: "notification",
        notification: {
            title: "Relatório salvo",
            body: "Tentativa de espionagem registrada no histórico do Ghost Screen.",
            icon: "icon-chart"
        },
        stats: {
            pill: "Blindado",
            pillClass: "success",
            score: 96,
            copy: "Relatórios mostram ativações, apps protegidos e padrões de risco ao longo do dia.",
            event: "Histórico do aplicativo recebeu um novo evento de proteção."
        },
        render: renderReport
    }
};

const sequences = {
    full: ["calibration", "messages", "risk", "antiSpy", "banking", "ambient", "video", "vault", "report"],
    messages: ["messages", "risk", "antiSpy", "report"],
    banking: ["banking", "risk", "vault", "report"],
    antiSpy: ["risk", "antiSpy", "ambient", "report"],
    vault: ["risk", "vault", "report"],
    video: ["video", "ambient", "report"]
};

function getSequence(sequenceName) {
    const names = sequences[sequenceName] || sequences.full;

    if (sequenceName !== "full") {
        return names;
    }

    return names.filter((name) => (
        name === "calibration"
        || name === "report"
        || appState.enabledDemoSteps.has(name)
    ));
}

/* ============================================================
   CLOCK
   ============================================================ */
function formatClock(date) {
    return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date);
}

function clockText() {
    return formatClock(new Date());
}

function updateClock() {
    const text = clockText();
    if (elements.clock) elements.clock.textContent = text;
    $$(".js-clock").forEach((node) => { node.textContent = text; });
    $$(".js-lock-clock").forEach((node) => { node.textContent = text; });
}

function updateLockDate() {
    const el = $("#lock-date");
    if (!el) return;
    const now = new Date();
    const date = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).format(now);
    el.textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

function startClock() {
    updateClock();
    updateLockDate();
    window.setInterval(() => {
        updateClock();
        if (elements.reportUpdated) {
            elements.reportUpdated.textContent = clockText();
        }
    }, 1000);
}

/* ============================================================
   AUDIO
   ============================================================ */
function ensureAudioContext() {
    if (!appState.audioContext) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        appState.audioContext = new AC();
    }
    if (appState.audioContext.state === "suspended") {
        appState.audioContext.resume();
    }
    return appState.audioContext;
}

function scheduleTone(ctx, start, frequency, duration, gain, type = "sine") {
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    vol.gain.setValueAtTime(0.0001, start);
    vol.gain.exponentialRampToValueAtTime(gain, start + 0.025);
    vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.04);
}

function playSound(kind = "notification") {
    if (!appState.soundOn) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.015;

    if (kind === "alert") {
        scheduleTone(ctx, now, 330, 0.18, 0.045, "triangle");
        scheduleTone(ctx, now + 0.16, 392, 0.22, 0.04, "triangle");
        return;
    }
    if (kind === "shield") {
        scheduleTone(ctx, now, 440, 0.12, 0.035, "sine");
        scheduleTone(ctx, now + 0.1, 660, 0.2, 0.036, "sine");
        scheduleTone(ctx, now + 0.24, 880, 0.24, 0.028, "sine");
        return;
    }
    if (kind === "vault") {
        scheduleTone(ctx, now, 220, 0.26, 0.04, "sine");
        scheduleTone(ctx, now + 0.2, 165, 0.34, 0.034, "triangle");
        return;
    }
    if (kind === "scan") {
        scheduleTone(ctx, now, 520, 0.16, 0.026, "sine");
        scheduleTone(ctx, now + 0.14, 740, 0.18, 0.026, "sine");
        return;
    }
    if (kind === "ring") {
        scheduleTone(ctx, now, 880, 0.18, 0.04, "sine");
        scheduleTone(ctx, now + 0.22, 880, 0.18, 0.04, "sine");
        scheduleTone(ctx, now + 0.44, 988, 0.2, 0.04, "sine");
        return;
    }
    scheduleTone(ctx, now, 587, 0.12, 0.034, "sine");
    scheduleTone(ctx, now + 0.11, 784, 0.2, 0.032, "sine");
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function clearAllNotifications(immediate = false) {
    $$(".notification", elements.stack).forEach((node) => {
        removeNotification(node, immediate ? 0 : 100);
    });
}

function pushNotification({ title, body, icon: iconId = "icon-bell", hold = NOTIFICATION_VISIBLE_MS }) {
    const item = document.createElement("div");
    item.className = "notification is-new";
    item.innerHTML = `
        <div class="notification-card">
            <span class="notification-icon">${icon(iconId)}</span>
            <span class="notification-copy">
                <span class="notification-meta">
                    <strong>Ghost Screen AI</strong>
                    <span>agora</span>
                </span>
                <b>${title}</b>
                <span>${body}</span>
            </span>
        </div>
    `;

    elements.stack.prepend(item);
    layoutNotifications();
    window.setTimeout(() => item.classList.remove("is-new"), 720);
    playSound("notification");

    const notifications = $$(".notification", elements.stack);
    notifications.slice(2).forEach((node) => removeNotification(node, 300));

    window.setTimeout(() => removeNotification(item), Math.max(NOTIFICATION_VISIBLE_MS, hold));
}

function removeNotification(node, delay = 0) {
    if (!node || node.classList.contains("leaving")) return;

    window.setTimeout(() => {
        node.classList.add("leaving");
        window.setTimeout(() => {
            node.remove();
            layoutNotifications();
        }, 460);
    }, delay);
}

function layoutNotifications() {
    requestAnimationFrame(() => {
        let y = 0;
        const gap = 8;
        $$(".notification", elements.stack).forEach((node, index) => {
            node.style.top = `${y}px`;
            node.style.zIndex = String(30 - index);
            node.style.setProperty("--notification-scale", index === 0 ? "1" : "0.986");
            node.style.setProperty("--notification-alpha", index === 0 ? "1" : "0.94");
            y += node.offsetHeight + gap;
        });
    });
}

/* ============================================================
   RENDER VIEWS
   ============================================================ */
function renderModules() {
    const root = $("#module-list");
    if (!root) return;
    root.innerHTML = modules.map((module, index) => {
        const active = module.demoKeys.length === 0 || module.demoKeys.every((key) => appState.enabledDemoSteps.has(key));
        const disabled = module.demoKeys.length === 0 ? "disabled" : "";
        return `
        <article class="module-item">
            <span class="module-item-icon">${icon(module.icon)}</span>
            <div>
                <h2>${module.title}</h2>
                <p>${module.description}</p>
            </div>
            <label class="module-toggle" aria-label="Mostrar ${module.title} na demo completa">
                <input type="checkbox" data-module-index="${index}" ${active ? "checked" : ""} ${disabled}>
                <span></span>
            </label>
        </article>
    `;
    }).join("");

    if (elements.activeModules) {
        elements.activeModules.textContent = modules.filter((m) => (
            m.demoKeys.length === 0 || m.demoKeys.every((key) => appState.enabledDemoSteps.has(key))
        )).length;
    }
}

function renderProtectedApps() {
    const root = $("#protected-apps");
    if (!root) return;
    root.innerHTML = protectedApps.map(([name, value]) => `
        <div class="chart-row">
            <span>${name}</span>
            <div class="chart-track"><span style="width:${value}%"></span></div>
            <strong>${value}%</strong>
        </div>
    `).join("");
}

function renderEventFeed(extraItem) {
    if (extraItem) {
        feedItems.unshift(extraItem);
        if (feedItems.length > 4) feedItems.pop();
    }

    const root = $("#event-feed");
    if (!root) return;
    root.innerHTML = feedItems.map((item) => `
        <div class="feed-item">
            <span class="feed-icon">${icon(item.icon)}</span>
            <div>
                <strong>${item.title}</strong>
                <span>${item.detail}</span>
            </div>
            <time>${item.time}</time>
        </div>
    `).join("");
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function navigateTo(view) {
    $$(".nav-item").forEach((button) => {
        button.classList.toggle("active", button.dataset.nav === view);
    });
    $$(".app-view").forEach((section) => {
        section.classList.toggle("active", section.dataset.view === view);
    });
    elements.appContent.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   DEMO ENGINE
   ============================================================ */
function applyStats(stats) {
    if (!stats) return;
    elements.riskPill.textContent = stats.pill;
    elements.riskPill.className = `pill ${stats.pillClass}`;
    elements.radarScore.textContent = stats.score;
    elements.assistantCopy.textContent = stats.copy;
    if (elements.liveEvent) elements.liveEvent.textContent = stats.event;
    if (elements.lastScan) elements.lastScan.textContent = clockText();
}

function updateReports(step) {
    if (!step.reportBump) return;
    appState.attempts += 1;
    appState.activations += step.key === "risk" ? 1 : 2;
    if (elements.attemptCount) elements.attemptCount.textContent = appState.attempts;
    if (elements.activationCount) elements.activationCount.textContent = appState.activations;
    if (elements.reportUpdated) elements.reportUpdated.textContent = clockText();

    renderEventFeed({
        icon: step.notification.icon,
        title: step.title,
        detail: step.label,
        time: clockText()
    });
}

async function runDemo(sequenceName) {
    const names = getSequence(sequenceName);
    const steps = names.map((name) => stepLibrary[name]);
    const token = ++appState.demoToken;

    ensureAudioContext();
    navigateTo("home");
    elements.overlay.hidden = false;
    elements.overlay.className = "simulation-overlay is-running";
    elements.simulationProgress.style.width = "0%";

    for (let index = 0; index < steps.length; index += 1) {
        if (token !== appState.demoToken) break;
        await playStep(steps[index], index, steps.length, token);
    }

    if (token === appState.demoToken) {
        elements.islandCopy.textContent = "Protegendo";
        pushNotification({
            title: "Ghost Screen ativo",
            body: "Sequência concluída e histórico atualizado no aplicativo.",
            icon: "icon-shield",
            hold: 8800
        });
        closeOverlay();
    }
}

function clearStepClasses() {
    elements.overlay.className = "simulation-overlay is-running";
}

function playStep(step, index, total, token) {
    clearStepClasses();
    clearAllNotifications(true);

    elements.simulationLabel.textContent = step.label;
    elements.simulationStep.textContent = `${index + 1}/${total}`;
    renderStepAlert(step, "before");

    // Vault step: show real sensitive content first, then transition to fake screen
    if (step.key === "vault") {
        elements.mockApp.innerHTML = renderVaultReal();
    } else {
        elements.mockApp.innerHTML = step.render();
    }

    elements.islandCopy.textContent = "Tela normal";
    elements.simulationProgress.style.width = "0%";
    updateClock();
    applyStats(step.stats);
    playSound("scan");

    safeTimeout(() => {
        elements.overlay.classList.add("is-scanning");
        elements.islandCopy.textContent = "IA analisando";
        renderStepAlert(step, "scan");
        playSound("scan");
    }, AI_SCAN_DELAY_MS, token);

    safeTimeout(() => {
        elements.overlay.classList.add("is-protecting", step.className);
        elements.islandCopy.textContent = step.island;
        renderStepAlert(step, "protect");
        playSound(step.sound);

        // Vault: after protection kicks in, fade to fake screen
        if (step.key === "vault") {
            safeTimeout(() => {
                const mockApp = elements.mockApp;
                mockApp.style.transition = "opacity 700ms ease";
                mockApp.style.opacity = "0";
                window.setTimeout(() => {
                    if (token === appState.demoToken) {
                        mockApp.innerHTML = renderVaultFake();
                        mockApp.style.opacity = "1";
                    }
                }, 700);
            }, 1800, token);
        }
    }, AI_PROTECT_DELAY_MS, token);

    safeTimeout(() => {
        pushNotification(step.notification);
        updateReports(step);
    }, AI_NOTIFICATION_DELAY_MS, token);

    appState.paused = false;
    appState.pauseStart = null;
    appState.pausedTotal = 0;

    return new Promise((resolve) => {
        const duration = Math.max(MIN_STEP_DURATION, step.duration);
        const start = performance.now();

        function frame(now) {
            if (token !== appState.demoToken) {
                resolve();
                return;
            }
            if (appState.paused) {
                appState.progressFrame = requestAnimationFrame(frame);
                return;
            }
            const elapsed = (now - start) - appState.pausedTotal;
            const pct = Math.min(elapsed / duration, 1);
            elements.simulationProgress.style.width = `${pct * 100}%`;
            if (pct < 1) {
                appState.progressFrame = requestAnimationFrame(frame);
            } else {
                resolve();
            }
        }

        appState.progressFrame = requestAnimationFrame(frame);
    });
}

function toggleSimulationPause() {
    const overlay = elements.overlay;
    if (!overlay || overlay.hidden) return;

    const pauseBtn = $("#pause-demo");
    const pauseIcon = $("#pause-icon");
    const playIcon = $("#play-icon");
    const pauseLabel = $("#pause-label");
    const banner = $("#sim-pause-banner");

    if (appState.paused) {
        appState.pausedTotal += performance.now() - appState.pauseStart;
        appState.pauseStart = null;
        appState.paused = false;
        overlay.classList.remove("is-paused");
        if (banner) banner.hidden = true;
        if (pauseIcon) pauseIcon.style.display = "";
        if (playIcon) playIcon.style.display = "none";
        if (pauseLabel) pauseLabel.textContent = "Pausar";
    } else {
        appState.paused = true;
        appState.pauseStart = performance.now();
        overlay.classList.add("is-paused");
        if (banner) banner.hidden = false;
        if (pauseIcon) pauseIcon.style.display = "none";
        if (playIcon) playIcon.style.display = "";
        if (pauseLabel) pauseLabel.textContent = "Continuar";
    }
}

function renderStepAlert(step, phase) {
    const content = {
        before: {
            title: "Tela antes da proteção",
            body: "Conteúdo original visível. A IA ainda não aplicou blur, blackout ou tela falsa."
        },
        scan: {
            title: "IA analisando a exposição",
            body: "Câmera, sensores e contexto do app estão sendo cruzados antes da reação automática."
        },
        protect: {
            title: step.title,
            body: step.body
        }
    }[phase];

    elements.simulationAlert.innerHTML = `
        <span class="notification-icon">${icon(step.notification.icon)}</span>
        <span>
            <strong>${content.title}</strong>
            <span>${content.body}</span>
        </span>
    `;
}

function closeOverlay() {
    elements.overlay.classList.add("closing");
    elements.mockApp.style.transition = "";
    elements.mockApp.style.opacity = "";
    window.setTimeout(() => {
        elements.overlay.hidden = true;
        elements.overlay.className = "simulation-overlay";
        elements.simulationProgress.style.width = "0%";
        elements.mockApp.innerHTML = "";
    }, 720);
}

function cancelDemo() {
    appState.demoToken += 1;
    appState.paused = false;
    appState.pauseStart = null;
    appState.pausedTotal = 0;
    cancelAnimationFrame(appState.progressFrame);
    clearAllNotifications(true);
    const banner = $("#sim-pause-banner");
    if (banner) banner.hidden = true;
    const overlay = elements.overlay;
    if (overlay) overlay.classList.remove("is-paused");
    const pauseIcon = $("#pause-icon");
    const playIcon = $("#play-icon");
    const pauseLabel = $("#pause-label");
    if (pauseIcon) pauseIcon.style.display = "";
    if (playIcon) playIcon.style.display = "none";
    if (pauseLabel) pauseLabel.textContent = "Pausar";
    elements.islandCopy.textContent = "Protegendo";
    elements.mockApp.style.transition = "";
    elements.mockApp.style.opacity = "";
    window.setTimeout(() => {
        pushNotification({
            title: "Demo encerrada",
            body: "A proteção continua ativa em segundo plano.",
            icon: "icon-shield",
            hold: 8200
        });
    }, 500);
    closeOverlay();
}

/* ============================================================
   MOCK APP RENDERERS
   ============================================================ */
function renderCalibration() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Ghost Screen AI</strong>
                    <span>sensores em tempo real</span>
                </div>
                <span class="js-clock">${clockText()}</span>
            </header>
            <div class="mock-body">
                <div class="scanner-ring"></div>
                <div class="mock-grid">
                    <article class="scan-card">
                        <strong>97%</strong>
                        <span>câmera frontal</span>
                    </article>
                    <article class="scan-card">
                        <strong>0,42s</strong>
                        <span>latência IA</span>
                    </article>
                </div>
                <div class="scan-line-inline" style="margin-top:12px"><span></span></div>
            </div>
        </section>
    `;
}

function renderMessages() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Mensagens</strong>
                    <span>privacidade forte</span>
                </div>
                ${icon("icon-chat")}
            </header>
            <div class="mock-body chat-list">
                <div class="chat-meta">Hoje, <span class="js-clock">${clockText()}</span></div>
                <div class="chat-bubble">Pode confirmar o endereço da entrega?</div>
                <div class="chat-bubble me">Rua <span class="sensitive">Primavera, 184</span>. Chego em 20 minutos.</div>
                <div class="chat-bubble">O código de acesso é <span class="sensitive">4917</span>. Não mostra para ninguém.</div>
                <div class="chat-bubble me">Recebido. A película entrou em modo forte.</div>
            </div>
        </section>
    `;
}

function renderRisk() {
    const primaryFace = buildPrimaryFace();
    const leftFace = buildEvilFace("A", "#c0392b", "#7b0000");
    const rightFace = buildEvilFace("B", "#922b35", "#6b0000");

    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Anti-espião</strong>
                    <span>múltiplos olhares</span>
                </div>
                ${icon("icon-eye")}
            </header>
            <div class="mock-body">
                <div class="risk-faces">
                    <span class="face-dot primary">${primaryFace}</span>
                    <span class="face-dot left">${leftFace}</span>
                    <span class="face-dot right">${rightFace}</span>
                </div>
                <p class="risk-copy">Rosto principal centralizado. Dois rostos laterais detectados e permanecem no campo de visão.</p>
                <div class="ambient-meter">
                    <div class="meter-row">
                        <span>persistência</span>
                        <span class="meter-track"><span style="width:78%"></span></span>
                        <strong>78%</strong>
                    </div>
                    <div class="meter-row">
                        <span>ângulo</span>
                        <span class="meter-track"><span style="width:64%"></span></span>
                        <strong>34°</strong>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderAntiSpy() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Rede social</strong>
                    <span>proteção moderada</span>
                </div>
                ${icon("icon-shield")}
            </header>
            <div class="mock-body social-feed">
                <article class="social-card">
                    <span class="social-avatar"></span>
                    <div>
                        <strong>Perfil privado</strong>
                        <span>área central preservada para leitura</span>
                    </div>
                </article>
                <article class="social-card sensitive">
                    <span class="social-avatar"></span>
                    <div>
                        <strong>Mensagem recebida</strong>
                        <span>prévia protegida pela película</span>
                    </div>
                </article>
                <article class="social-card">
                    <span class="social-avatar"></span>
                    <div>
                        <strong>Feed</strong>
                        <span>escurecimento lateral inteligente</span>
                    </div>
                </article>
            </div>
        </section>
    `;
}

function renderBanking() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Banco</strong>
                    <span>blackout máximo</span>
                </div>
                ${icon("icon-bank")}
            </header>
            <div class="mock-body">
                <div class="bank-hero sensitive">
                    <span>saldo disponível</span>
                    <strong>R$ 8.742,90</strong>
                </div>
                <div class="bank-list">
                    <div class="bank-row sensitive">
                        <span>Cartão final 2048</span>
                        <strong>R$ 1.294,20</strong>
                    </div>
                    <div class="bank-row sensitive">
                        <span>Pix agendado</span>
                        <strong>R$ 640,00</strong>
                    </div>
                    <div class="bank-row">
                        <span>Proteção aplicada</span>
                        <strong>máxima</strong>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderAmbient() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Película adaptativa</strong>
                    <span>conforto visual</span>
                </div>
                ${icon("icon-sun")}
            </header>
            <div class="mock-body">
                <div class="mock-grid">
                    <article class="mini-card">
                        <strong>640 lux</strong>
                        <span>luz ambiente</span>
                    </article>
                    <article class="mini-card">
                        <strong>72%</strong>
                        <span>barreira lateral</span>
                    </article>
                </div>
                <div class="ambient-meter">
                    <div class="meter-row">
                        <span>privacidade</span>
                        <span class="meter-track"><span style="width:72%"></span></span>
                        <strong>72%</strong>
                    </div>
                    <div class="meter-row">
                        <span>conforto</span>
                        <span class="meter-track"><span style="width:84%"></span></span>
                        <strong>84%</strong>
                    </div>
                    <div class="meter-row">
                        <span>brilho</span>
                        <span class="meter-track"><span style="width:58%"></span></span>
                        <strong>58%</strong>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderVideo() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>YouTube</strong>
                    <span>streaming com proteção leve</span>
                </div>
                ${icon("icon-video")}
            </header>
            <div class="mock-body">
                <div class="video-player">
                    <div class="video-thumb">
                        <div class="video-play-btn">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg>
                        </div>
                        <span class="video-title">Como a IA protege sua privacidade em tempo real</span>
                    </div>
                    <div class="video-bar"><div class="video-bar-fill" style="animation: video-progress 10s linear forwards"></div></div>
                </div>
                <div class="video-list">
                    <div class="video-row">
                        <div class="video-row-thumb"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg></div>
                        <div class="video-row-info">
                            <strong>Película Ghost Screen – Tutorial</strong>
                            <span>248 mil visualizações</span>
                        </div>
                    </div>
                    <div class="video-row">
                        <div class="video-row-thumb"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg></div>
                        <div class="video-row-info">
                            <strong>Proteção no metrô – Demonstração</strong>
                            <span>91 mil visualizações</span>
                        </div>
                    </div>
                    <div class="video-row">
                        <div class="video-row-thumb"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg></div>
                        <div class="video-row-info">
                            <strong>Netflix – Série recomendada</strong>
                            <span>Película reduz visibilidade lateral</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

/* Vault: real sensitive content shown BEFORE protection kicks in */
function renderVaultReal() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Nubank</strong>
                    <span>conta digital</span>
                </div>
                ${icon("icon-bank")}
            </header>
            <div class="mock-body">
                <div class="bank-hero">
                    <span>saldo disponível</span>
                    <strong>R$ 12.340,87</strong>
                </div>
                <div class="bank-list">
                    <div class="bank-row">
                        <span>Cartão final 8421</span>
                        <strong>R$ 2.190,00</strong>
                    </div>
                    <div class="bank-row">
                        <span>Pix recebido — João</span>
                        <strong>R$ 850,00</strong>
                    </div>
                    <div class="bank-row">
                        <span>Chave Pix</span>
                        <strong>meu.email@gmail.com</strong>
                    </div>
                    <div class="bank-row">
                        <span>CPF vinculado</span>
                        <strong>•••.456.789-••</strong>
                    </div>
                </div>
            </div>
        </section>
    `;
}

/* Vault: fake screen shown AFTER protection kicks in */
function renderVaultFake() {
    const selected = elements.fakeScreen ? elements.fakeScreen.value : "calculator";

    if (selected === "notes") {
        return `
            <section class="mock-view">
                <div class="notes-fake">
                    <h2>Notas</h2>
                    <p class="note-text">Comprar: leite, pão integral e queijo minas antes de quinta.</p>
                    <p class="note-text">Lolzinho com mozão hoje ❤️</p>
                    <p class="note-text">Senha Wi-Fi da academia: ghost2024!</p>
                    <p class="note-text">Ligar para o dentista e remarcar consulta do mês.</p>
                    <p class="note-text">Ir para o Firjan amanhã 9h!</p>
                </div>
            </section>
        `;
    }

    if (selected === "neutral") {
        const neutralImage = appState.neutralImage || DEFAULT_NEUTRAL_IMAGE;
        return `
            <section class="neutral-fake neutral-fake--image" style="background-image:url('${neutralImage}')">
            </section>
        `;
    }

    const rows = [
        [
            { label: "AC", type: "func" },
            { label: "⁺∕₋", type: "func" },
            { label: "%",  type: "func" },
            { label: "÷",  type: "op"   }
        ],
        [
            { label: "7", type: "num" },
            { label: "8", type: "num" },
            { label: "9", type: "num" },
            { label: "×", type: "op"  }
        ],
        [
            { label: "4", type: "num" },
            { label: "5", type: "num" },
            { label: "6", type: "num" },
            { label: "−", type: "op"  }
        ],
        [
            { label: "1", type: "num" },
            { label: "2", type: "num" },
            { label: "3", type: "num" },
            { label: "+", type: "op"  }
        ]
    ];

    const normalBtns = rows.map((row) =>
        row.map((btn) =>
            `<div class="calc-btn ${btn.type}"><div class="calc-btn-inner">${btn.label}</div></div>`
        ).join("")
    ).join("");

    const bottomRow = `
        <div class="calc-btn num zero"><div class="calc-btn-inner">0</div></div>
        <div class="calc-btn num"><div class="calc-btn-inner">.</div></div>
        <div class="calc-btn op"><div class="calc-btn-inner">=</div></div>
    `;

    return `
        <section class="ios-calculator">
            <div class="ios-calc-display">1505</div>
            <div class="ios-calc-buttons">
                ${normalBtns}
                ${bottomRow}
            </div>
        </section>
    `;
}

function renderReport() {
    return `
        <section class="mock-view dark">
            <header class="mock-head">
                <div>
                    <strong>Relatório Ghost Screen</strong>
                    <span>atualizado às <span class="js-clock">${clockText()}</span></span>
                </div>
                ${icon("icon-chart")}
            </header>
            <div class="mock-body">
                <div class="mock-grid">
                    <article class="mini-card">
                        <strong>${appState.attempts}</strong>
                        <span>tentativas</span>
                    </article>
                    <article class="mini-card">
                        <strong>${appState.activations}</strong>
                        <span>ativações</span>
                    </article>
                </div>
                <div class="bank-list">
                    <div class="bank-row">
                        <span>App mais protegido</span>
                        <strong>Mensagens</strong>
                    </div>
                    <div class="bank-row">
                        <span>Resposta média</span>
                        <strong>0,42s</strong>
                    </div>
                    <div class="bank-row">
                        <span>Último modo</span>
                        <strong>Cofre Visual</strong>
                    </div>
                </div>
            </div>
        </section>
    `;
}

/* ============================================================
   THEME
   ============================================================ */
function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    $$(".theme-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.theme === theme);
    });
}

/* ============================================================
   SETTINGS — EFFECT LEVEL SYNC
   ============================================================ */
function syncBlurLevel(value) {
    appState.blurLevel = Number(value);
    document.documentElement.style.setProperty("--blur-level", `${value}px`);
    if (elements.blurLabel) elements.blurLabel.textContent = `${value}px`;
}

function syncDimLevel(value) {
    appState.dimLevel = Number(value) / 100;
    document.documentElement.style.setProperty("--dim-level", appState.dimLevel);
    if (elements.dimLabel) elements.dimLabel.textContent = `${value}%`;
}

function syncBrightnessLevel(value) {
    const normalized = Number(value) / 100;
    const dimOpacity = Math.pow(1 - normalized, 1.25) * 0.62;
    appState.brightnessLevel = normalized;
    document.documentElement.style.setProperty("--brightness-level", appState.brightnessLevel);
    document.documentElement.style.setProperty("--screen-dim-opacity", dimOpacity.toFixed(3));
    if (elements.brightnessLabel) elements.brightnessLabel.textContent = `${value}%`;
}

/* ============================================================
   REMOTE ACTIONS
   ============================================================ */
function handleRemoteAction(action) {
    ensureAudioContext();

    if (action === "ring") {
        playSound("ring");
        if (elements.remoteState) {
            elements.remoteState.textContent = "Alerta";
            elements.remoteState.className = "pill warn";
        }
        if (elements.remoteCopy) elements.remoteCopy.textContent = "Alerta remoto enviado. O painel do PC mostra o celular a menos de 1 metro.";
        pushNotification({ title: "Localizar celular", body: "Alerta remoto enviado para o aparelho.", icon: "icon-map" });
        return;
    }

    if (action === "lock") {
        playSound("vault");
        if (elements.remoteState) {
            elements.remoteState.textContent = "Bloqueado";
            elements.remoteState.className = "pill warn";
        }
        if (elements.remoteCopy) elements.remoteCopy.textContent = "Bloqueio remoto preparado pelo PC com ocultação de conteúdo sensível.";
        pushNotification({ title: "Bloqueio remoto", body: "Tela preparada para ocultar dados privados.", icon: "icon-lock" });
        return;
    }

    playSound("shield");
    if (elements.remoteState) {
        elements.remoteState.textContent = "Protegido";
        elements.remoteState.className = "pill success";
    }
    if (elements.remoteCopy) elements.remoteCopy.textContent = "Proteção remota ativa com película, IA e painel do PC sincronizados.";
    pushNotification({ title: "Proteção remota", body: "Camadas da película ativadas à distância.", icon: "icon-shield" });
}

/* ============================================================
   LEAFLET MAP
   ============================================================ */
let leafletMap = null;
let deviceMarker = null;

function initMap() {
    if (leafletMap) {
        window.setTimeout(() => leafletMap.invalidateSize(), 100);
        return;
    }

    const mapEl = document.getElementById("leaflet-map");
    if (!mapEl || typeof L === "undefined") return;

    const defaultCenter = [-23.5505, -46.6333];

    leafletMap = L.map(mapEl, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        keyboard: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        crossOrigin: true
    }).addTo(leafletMap);

    const pulseIcon = L.divIcon({
        className: "",
        html: `<div class="map-device-marker"><div class="map-device-dot"></div><div class="map-device-ring"></div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    deviceMarker = L.marker(defaultCenter, { icon: pulseIcon }).addTo(leafletMap);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const latlng = [pos.coords.latitude, pos.coords.longitude];
                leafletMap.setView(latlng, 16);
                deviceMarker.setLatLng(latlng);
            },
            null,
            { timeout: 8000, enableHighAccuracy: false }
        );
    }

    window.setTimeout(() => leafletMap.invalidateSize(), 200);
}

/* ============================================================
   LOCK SCREEN STATE MACHINE
   ============================================================ */
function setupLockScreen() {
    const phoneDevice = $("#phone-device");
    const lockScreen = $("#lock-screen");
    const powerBtn = $("#power-btn");
    const phoneScreen = phoneDevice ? phoneDevice.querySelector(".phone-screen") : null;

    if (!phoneDevice || !lockScreen || !powerBtn) return;

    const swipeKnob = $("#lock-swipe-knob");
    const swipeTrack = lockScreen.querySelector(".lock-swipe-track");
    let isDragging = false;
    let dragStartX = 0;
    let currentDX = 0;

    function powerOn() {
        applyWallpaper(appState.wallpaper);
        phoneDevice.dataset.phoneState = "locked";
        lockScreen.classList.add("lock-screen-enter");
        window.setTimeout(() => lockScreen.classList.remove("lock-screen-enter"), 600);
        if (swipeKnob) swipeKnob.style.transform = "";
        if (swipeTrack) swipeTrack.style.removeProperty("--swipe-pct");
        ensureAudioContext();
        playSound("scan");
    }

    function powerOff() {
        const currentState = phoneDevice.dataset.phoneState;
        if (currentState === "unlocked") {
            phoneDevice.dataset.phoneState = "off";
        } else if (currentState === "locked") {
            phoneDevice.dataset.phoneState = "off";
        }
    }

    function unlockPhone() {
        lockScreen.classList.add("lock-screen-exit");
        window.setTimeout(() => {
            phoneDevice.dataset.phoneState = "unlocked";
            lockScreen.classList.remove("lock-screen-exit");
            if (swipeKnob) swipeKnob.style.transform = "";
            if (swipeTrack) swipeTrack.style.removeProperty("--swipe-pct");
        }, 480);
        ensureAudioContext();
        playSound("shield");
    }

    powerBtn.addEventListener("click", () => {
        const state = phoneDevice.dataset.phoneState;
        if (state === "off") {
            powerOn();
        } else {
            powerOff();
        }
    });

    if (phoneScreen) {
        phoneScreen.addEventListener("click", (event) => {
            if (!isPhoneRuntimeMode() || phoneDevice.dataset.phoneState !== "off") return;
            event.preventDefault();
            powerOn();
        });
    }

    if (swipeKnob && swipeTrack) {
        function startDrag(clientX) {
            isDragging = true;
            dragStartX = clientX;
            currentDX = 0;
            swipeKnob.style.transition = "none";
        }

        function moveDrag(clientX) {
            if (!isDragging) return;
            const dx = Math.max(0, clientX - dragStartX);
            const trackWidth = swipeTrack.offsetWidth;
            const knobWidth = swipeKnob.offsetWidth;
            const maxX = trackWidth - knobWidth - 8;
            currentDX = Math.min(dx, maxX);
            swipeKnob.style.transform = `translateX(${currentDX}px)`;
            const pct = currentDX / maxX;
            swipeTrack.style.setProperty("--swipe-pct", pct);
        }

        function endDrag(clientX) {
            if (!isDragging) return;
            isDragging = false;
            const dx = clientX - dragStartX;
            const trackWidth = swipeTrack.offsetWidth;
            swipeKnob.style.transition = "";
            if (dx > trackWidth * 0.55) {
                unlockPhone();
            } else {
                swipeKnob.style.transform = "";
                swipeTrack.style.removeProperty("--swipe-pct");
            }
        }

        swipeKnob.addEventListener("mousedown", (e) => startDrag(e.clientX));
        swipeKnob.addEventListener("touchstart", (e) => startDrag(e.touches[0].clientX), { passive: true });

        document.addEventListener("mousemove", (e) => moveDrag(e.clientX));
        document.addEventListener("touchmove", (e) => moveDrag(e.touches[0].clientX), { passive: true });

        document.addEventListener("mouseup", (e) => endDrag(e.clientX));
        document.addEventListener("touchend", (e) => endDrag(e.changedTouches[0].clientX), { passive: true });
    }
}

/* ============================================================
   EVENT BINDING
   ============================================================ */
function bindEvents() {
    $$(".nav-item").forEach((button) => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.nav);
            if (button.dataset.nav === "locate") {
                window.setTimeout(initMap, 120);
            }
        });
    });

    $$("[data-run]").forEach((button) => {
        button.addEventListener("click", () => {
            const sequence = button.dataset.run === "selected"
                ? elements.scenarioSelect?.value || "full"
                : button.dataset.run;
            runDemo(sequence);
        });
    });

    const cancelBtn = $("#cancel-demo");
    if (cancelBtn) cancelBtn.addEventListener("click", cancelDemo);

    const pauseBtn = $("#pause-demo");
    if (pauseBtn) pauseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSimulationPause();
    });

    if (elements.overlay) {
        elements.overlay.addEventListener("click", (e) => {
            const isFooterBtn = e.target.closest("#cancel-demo, #pause-demo");
            if (!isFooterBtn) toggleSimulationPause();
        });
    }

    $$(".theme-btn").forEach((btn) => {
        btn.addEventListener("click", () => setTheme(btn.dataset.theme));
    });

    if (elements.sensitivity) {
        elements.sensitivity.addEventListener("input", () => {
            const value = Number(elements.sensitivity.value);
            if (elements.sensitivityLabel) elements.sensitivityLabel.textContent = `${value}%`;
            elements.radarScore.textContent = Math.min(99, Math.round(72 + value / 4));
            if (elements.reactionTime) {
                elements.reactionTime.textContent = value > 88 ? "0,31s" : value > 64 ? "0,42s" : "0,58s";
            }
        });
    }

    if (elements.blurLevel) {
        elements.blurLevel.addEventListener("input", () => syncBlurLevel(elements.blurLevel.value));
    }

    if (elements.dimLevel) {
        elements.dimLevel.addEventListener("input", () => syncDimLevel(elements.dimLevel.value));
    }

    if (elements.brightnessLevel) {
        elements.brightnessLevel.addEventListener("input", () => syncBrightnessLevel(elements.brightnessLevel.value));
    }

    const moduleList = $("#module-list");
    if (moduleList) {
        moduleList.addEventListener("change", (event) => {
            const input = event.target.closest("[data-module-index]");
            if (!input) return;
            const module = modules[Number(input.dataset.moduleIndex)];
            module.demoKeys.forEach((key) => {
                if (input.checked) {
                    appState.enabledDemoSteps.add(key);
                } else {
                    appState.enabledDemoSteps.delete(key);
                }
            });
            renderModules();
            pushNotification({
                title: "Demo atualizada",
                body: input.checked
                    ? `${module.title} será exibido na próxima demo.`
                    : `${module.title} foi removido da próxima demo.`,
                icon: module.icon,
                hold: 7200
            });
        });
    }

    if (elements.fakeScreen) {
        function renderNeutralPicker() {
            const picker = $("#neutral-image-picker");
            const grid = $("#neutral-image-grid");
            const noImages = $("#neutral-no-images");
            if (!picker) return;
            const isNeutral = elements.fakeScreen.value === "neutral";
            picker.hidden = !isNeutral;
            if (!isNeutral || !grid) return;
            if (NEUTRAL_IMAGES.length === 0) {
                grid.innerHTML = "";
                if (noImages) noImages.hidden = false;
                return;
            }
            if (noImages) noImages.hidden = true;
            grid.innerHTML = NEUTRAL_IMAGES.map((src, i) => `
                <div class="neutral-thumb${appState.neutralImage === src ? " is-selected" : ""}" data-src="${src}">
                    <img src="${src}" alt="Tela neutra ${i + 1}" loading="lazy">
                </div>
            `).join("");
            $$(".neutral-thumb", grid).forEach((thumb) => {
                thumb.addEventListener("click", () => {
                    appState.neutralImage = thumb.dataset.src;
                    $$(".neutral-thumb", grid).forEach((t) => t.classList.remove("is-selected"));
                    thumb.classList.add("is-selected");
                });
            });
        }

        renderNeutralPicker();

        elements.fakeScreen.addEventListener("change", () => {
            renderNeutralPicker();
            pushNotification({
                title: "Cofre Visual configurado",
                body: `Tela falsa: ${elements.fakeScreen.options[elements.fakeScreen.selectedIndex].text}.`,
                icon: "icon-lock"
            });
        });
    }

    /* Wallpaper picker tabs */
    renderWallpaperPicker();
    $$(".wp-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            $$(".wp-tab").forEach((t) => t.classList.remove("is-active"));
            tab.classList.add("is-active");
            const target = tab.dataset.wpTab;
            $$(".wp-panel").forEach((p) => { p.hidden = true; });
            const panel = $(`#wp-panel-${target}`);
            if (panel) panel.hidden = false;
        });
    });

    if (elements.soundToggle) {
        elements.soundToggle.addEventListener("click", () => {
            appState.soundOn = !appState.soundOn;
            elements.soundToggle.classList.toggle("is-muted", !appState.soundOn);
            elements.soundToggle.setAttribute(
                "aria-label",
                appState.soundOn ? "Som da simulação ativado" : "Som da simulação desativado"
            );
            if (appState.soundOn) playSound("notification");
        });
    }

    elements.saveRemotePassword?.addEventListener("click", () => {
        const length = elements.remotePassword.value.trim().length;
        appState.remotePasswordSet = length >= 4;
        if (elements.remoteState) {
            elements.remoteState.textContent = appState.remotePasswordSet ? "Senha ativa" : "Senha fraca";
            elements.remoteState.className = appState.remotePasswordSet ? "pill success" : "pill warn";
        }
        if (elements.remoteCopy) {
            elements.remoteCopy.textContent = appState.remotePasswordSet
                ? "Controle à distância protegido por senha e disponível pelo painel do PC."
                : "Use pelo menos 4 caracteres para liberar comandos remotos.";
        }
        pushNotification({
            title: appState.remotePasswordSet ? "Senha remota definida" : "Senha remota pendente",
            body: appState.remotePasswordSet
                ? "O painel do PC agora exige senha para localizar e proteger o celular."
                : "Defina uma senha maior para ativar o controle remoto.",
            icon: "icon-lock",
            hold: 8400
        });
    });

    $$("[data-remote-action]").forEach((button) => {
        button.addEventListener("click", () => handleRemoteAction(button.dataset.remoteAction));
    });

    setupLockScreen();
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
    setupRuntimeDeviceMode();
    startClock();
    renderModules();
    renderProtectedApps();
    renderEventFeed();
    bindEvents();
    if (elements.brightnessLevel) syncBrightnessLevel(elements.brightnessLevel.value);
    applyWallpaper(appState.wallpaper);

    window.setTimeout(() => {
        pushNotification({
            title: "Ghost Screen V2",
            body: "Ligue o celular para ver a tela de bloqueio e iniciar a proteção.",
            icon: "icon-shield",
            hold: 9000
        });
    }, 800);
}

document.addEventListener("DOMContentLoaded", init);
