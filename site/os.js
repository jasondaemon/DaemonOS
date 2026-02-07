import { perfMonitor } from "./core/perfMonitor.js";
import { registerApp, unregisterApp, setFocusedApp } from "./core/appLifecycle.js";
import { initSystemMonitor } from "./core/systemMonitor.js";

const state = {
  registry: [],
  windows: [],
  zIndex: 100,
  windowState: {},
  registryVersion: "",
  session: {
    windows: [],
    taskSwitcherOpen: false,
  },
  iconPositions: {},
  desktopAliases: [],
  iconSelections: {},
  activeCanvasId: null,
  activeAppId: null,
  appMenus: {},
  trash: [],
  settings: {
    wallpaper: "aurora",
    dockSize: 72,
    dockZoom: 1.35,
    iconSize: 60,
    trayIconSize: 40,
    theme: "dark",
    volume: 0.8,
    screensaverEnabled: true,
    screensaverTimeout: 3,
    screensaverStyle: "stars",
  },
  openApps: new Set(),
};

const autoThemeState = {
  lat: null,
  lon: null,
  sunrise: null,
  sunset: null,
  dateKey: null,
  geolocationTried: false,
};

const wallpaperOptions = [
  { id: "aurora", label: "Aurora", css: "radial-gradient(circle at 20% 20%, #2c5f7c, #0f2333 60%, #0a1119 100%)" },
  { id: "ember", label: "Ember", css: "radial-gradient(circle at 20% 20%, #6c2b1f, #2a120e 60%, #0b0908 100%)" },
  { id: "neon", label: "Neon", css: "radial-gradient(circle at 30% 10%, #1d405f, #0c1a28 50%, #060a10 100%)" },
  { id: "slate", label: "Slate", css: "radial-gradient(circle at 20% 30%, #354154, #151b25 60%, #0a0f16 100%)" },
];

const dockItems = [
  { id: "file-browser", label: "Files", iconClass: "dock-glyph--file", action: () => openFileBrowser() },
  { id: "applications", label: "Applications", iconClass: "dock-glyph--apps", action: (button) => toggleDockTray("applications", button) },
  { id: "games", label: "Games", iconClass: "dock-glyph--games", action: (button) => toggleDockTray("games", button) },
  { id: "utilities", label: "Utilities", iconClass: "dock-glyph--utilities", action: (button) => toggleDockTray("utilities", button) },
];

let dockTrayState = {
  category: null,
  button: null,
};

const osAPI = {
  openApp,
  createWindow,
  getSettings: () => ({ ...state.settings }),
  registerAppMenu,
  setActiveApp,
  openSettingsWindow,
};

init();

async function init() {
  loadSettings();
  loadWindowState();
  loadSession();
  loadIconPositions();
  loadDesktopAliases();
  renderWallpaperOptions();
  applySettings();
  requestAutoThemeLocation();
  setInterval(() => {
    if (state.settings.theme === "auto") applyTheme();
  }, 5 * 60 * 1000);
  setupMenu();
  perfMonitor.start();
  initSystemMonitor({ focusApp: focusAppById, closeApp: closeAppById });
  setupDock();
  setupClock();
  setupScreensaver();
  await loadRegistry();
  setupTrash();
  setupContextMenu();
  setupKeyboardNavigation();
  renderDesktopAliases();
  renderMenuBar();
  restoreSession();
}

function loadSettings() {
  const raw = localStorage.getItem("daemonos.settings");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.settings = { ...state.settings, ...parsed };
  } catch (err) {
    console.warn("Failed to load settings", err);
  }
}

function loadWindowState() {
  const raw = localStorage.getItem("daemonos.windowState");
  if (!raw) return;
  try {
    state.windowState = JSON.parse(raw) || {};
  } catch (err) {
    console.warn("Failed to load window state", err);
  }
}

function saveWindowState() {
  localStorage.setItem("daemonos.windowState", JSON.stringify(state.windowState));
}

function saveSettings() {
  localStorage.setItem("daemonos.settings", JSON.stringify(state.settings));
}

function loadSession() {
  const raw = localStorage.getItem("daemonos.session");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.session = { ...state.session, ...parsed };
  } catch (err) {
    console.warn("Failed to load session", err);
  }
}

function saveSession() {
  const windows = state.windows.map((entry) => ({
    id: entry.id,
    title: entry.title,
    meta: entry.meta,
    minimized: entry.element.classList.contains("minimized"),
  }));
  state.session.windows = windows;
  localStorage.setItem("daemonos.session", JSON.stringify(state.session));
}

function loadIconPositions() {
  const raw = localStorage.getItem("daemonos.iconPositions");
  if (!raw) return;
  try {
    state.iconPositions = JSON.parse(raw) || {};
  } catch (err) {
    console.warn("Failed to load icon positions", err);
  }
}

function saveIconPositions() {
  localStorage.setItem("daemonos.iconPositions", JSON.stringify(state.iconPositions));
}

function loadDesktopAliases() {
  const raw = localStorage.getItem("daemonos.desktopAliases");
  if (!raw) return;
  try {
    state.desktopAliases = JSON.parse(raw) || [];
  } catch (err) {
    console.warn("Failed to load desktop aliases", err);
  }
}

function saveDesktopAliases() {
  localStorage.setItem("daemonos.desktopAliases", JSON.stringify(state.desktopAliases));
}

function applySettings() {
  const wallpaper = wallpaperOptions.find((opt) => opt.id === state.settings.wallpaper);
  if (wallpaper) {
    document.documentElement.style.setProperty("--wallpaper", wallpaper.css);
  }
  document.documentElement.style.setProperty("--dock-size", `${state.settings.dockSize}px`);
  document.documentElement.style.setProperty("--dock-zoom", state.settings.dockZoom);
  document.documentElement.style.setProperty("--icon-size", `${state.settings.iconSize}px`);
  document.documentElement.style.setProperty("--tray-icon-size", `${state.settings.trayIconSize}px`);
  document.documentElement.style.setProperty("--tray-gap", `${Math.max(8, Math.round(state.settings.trayIconSize * 0.35))}px`);
  const iconSize = document.getElementById("icon-size");
  if (iconSize) iconSize.value = String(state.settings.iconSize);
  const trayIconSize = document.getElementById("tray-icon-size");
  if (trayIconSize) trayIconSize.value = String(state.settings.trayIconSize);
  applyTheme();
  applyGlobalVolume();
  applyScreensaverSettings();
}

function applyScreensaverSettings() {
  const saver = document.getElementById("screensaver");
  if (!saver) return;
  saver.dataset.style = state.settings.screensaverStyle || "stars";
  if (saver.dataset.style === "toasters") {
    saver.style.background = "#000";
  } else {
    saver.style.background = "";
  }
}

function setupScreensaver() {
  const saver = document.getElementById("screensaver");
  if (!saver) return;
  const matrixCanvas = document.getElementById("screensaver-matrix-canvas");
  const matrixCtx = matrixCanvas?.getContext("2d");
  const toasterCanvas = document.getElementById("screensaver-toaster-canvas");
  const toasterCtx = toasterCanvas?.getContext("2d");
  const matrixState = {
    running: false,
    columns: [],
    rafId: null,
    lastTime: 0,
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-/\\アイウエオカキクケコサシスセソタチツテトナニヌネノマミムメモヤユヨラリルレロワヲン",
  };
  const toasterState = {
    running: false,
    toasters: [],
    rafId: null,
    lastTime: 0,
  };

  const resizeMatrix = () => {
    if (!matrixCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = saver.getBoundingClientRect();
    matrixCanvas.width = Math.floor(rect.width * dpr);
    matrixCanvas.height = Math.floor(rect.height * dpr);
    matrixCanvas.style.width = `${rect.width}px`;
    matrixCanvas.style.height = `${rect.height}px`;
    if (!matrixCtx) return;
    matrixCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fontSize = 20;
    const columns = Math.floor(rect.width / (fontSize * 0.4));
    matrixState.columns = Array.from({ length: columns }).map(() => ({
      y: Math.random() * rect.height,
      speed: 60 + Math.random() * 160,
      trail: 14 + Math.floor(Math.random() * 20),
    }));
  };

  const drawMatrix = (time) => {
    if (!matrixCtx || !matrixCanvas) return;
    const ctx = matrixCtx;
    const rect = saver.getBoundingClientRect();
    const fontSize = 20;
    const cols = matrixState.columns.length;
    const dt = matrixState.lastTime ? (time - matrixState.lastTime) / 1000 : 0.016;
    matrixState.lastTime = time;
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textBaseline = "top";
    for (let i = 0; i < cols; i += 1) {
      const column = matrixState.columns[i];
      column.y += column.speed * dt;
      if (column.y > rect.height + column.trail * fontSize) {
        column.y = -Math.random() * rect.height * 0.5;
        column.speed = 40 + Math.random() * 120;
        column.trail = 10 + Math.floor(Math.random() * 15);
      }
      for (let j = 0; j < column.trail; j += 1) {
        const char = matrixState.chars[Math.floor(Math.random() * matrixState.chars.length)];
        const x = i * fontSize;
        const y = column.y - j * fontSize;
        if (y < 0 || y > rect.height) continue;
        const alpha = 1 - j / column.trail;
        const isHead = j === 0;
        ctx.fillStyle = isHead ? `rgba(200, 255, 200, ${alpha})` : `rgba(0, 255, 140, ${alpha})`;
        ctx.fillText(char, x, y);
      }
    }
  };

  const startMatrix = () => {
    if (matrixState.running) return;
    matrixState.running = true;
    resizeMatrix();
    const loop = (time) => {
      if (!matrixState.running) return;
      drawMatrix(time);
      matrixState.rafId = requestAnimationFrame(loop);
    };
    matrixState.rafId = requestAnimationFrame(loop);
  };

  const stopMatrix = () => {
    matrixState.running = false;
    if (matrixState.rafId) cancelAnimationFrame(matrixState.rafId);
    matrixState.rafId = null;
    matrixState.lastTime = 0;
    if (matrixCtx && matrixCanvas) {
      matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    }
  };

  const resizeToasters = () => {
    if (!toasterCanvas || !toasterCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = saver.getBoundingClientRect();
    toasterCanvas.width = Math.floor(rect.width * dpr);
    toasterCanvas.height = Math.floor(rect.height * dpr);
    toasterCanvas.style.width = `${rect.width}px`;
    toasterCanvas.style.height = `${rect.height}px`;
    toasterCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(10, Math.floor(rect.width / 120));
    toasterState.toasters = Array.from({ length: count }).map(() => ({
      x: rect.width + Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: -(60 + Math.random() * 140),
      vy: 20 + Math.random() * 60,
      scale: 0.6 + Math.random() * 0.6,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 3 + Math.random() * 3,
      toast: Math.random() > 0.45,
    }));
  };

  const drawToaster = (ctx, toaster, dt, rect) => {
    const wingFlap = Math.sin(toaster.wingPhase) * 0.6;
    const bodyW = 60 * toaster.scale;
    const bodyH = 36 * toaster.scale;
    const wingW = 28 * toaster.scale;
    const wingH = 16 * toaster.scale;
    const slotH = 8 * toaster.scale;

    toaster.x += toaster.vx * dt;
    toaster.y += toaster.vy * dt;
    toaster.wingPhase += toaster.wingSpeed * dt;

    if (toaster.x < -bodyW - 40) {
      toaster.x = rect.width + Math.random() * rect.width * 0.4;
      toaster.y = Math.random() * rect.height * 0.8;
      toaster.vx = -(60 + Math.random() * 140);
      toaster.vy = 20 + Math.random() * 60;
      toaster.scale = 0.6 + Math.random() * 0.6;
      toaster.toast = Math.random() > 0.45;
    }
    if (toaster.y > rect.height + 80) {
      toaster.y = -80;
    }

    ctx.save();
    ctx.translate(toaster.x, toaster.y);
    ctx.rotate(-0.1);
    ctx.globalAlpha = 0.95;

    // Wings
    ctx.fillStyle = "#f3f3f3";
    ctx.strokeStyle = "rgba(180,180,180,0.6)";
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(-bodyW * 0.35, bodyH * 0.2);
    ctx.rotate(-wingFlap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-wingW, -wingH * 0.4);
    ctx.lineTo(-wingW * 0.6, wingH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(bodyW * 0.35, bodyH * 0.2);
    ctx.rotate(wingFlap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(wingW, -wingH * 0.4);
    ctx.lineTo(wingW * 0.6, wingH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = "#cfcfcf";
    ctx.strokeStyle = "rgba(80,80,80,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 10 * toaster.scale);
    ctx.fill();
    ctx.stroke();

    // Slot
    ctx.fillStyle = "#3b3b3b";
    ctx.beginPath();
    ctx.roundRect(-bodyW * 0.3, -bodyH * 0.15, bodyW * 0.6, slotH, 3 * toaster.scale);
    ctx.fill();

    // Toast
    if (toaster.toast) {
      ctx.fillStyle = "#f4c17a";
      ctx.strokeStyle = "#c48b43";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-bodyW * 0.18, -bodyH * 0.35, bodyW * 0.36, bodyH * 0.4, 6 * toaster.scale);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  const startToasters = () => {
    if (toasterState.running) return;
    toasterState.running = true;
    resizeToasters();
    const loop = (time) => {
      if (!toasterState.running || !toasterCtx || !toasterCanvas) return;
      const rect = saver.getBoundingClientRect();
      const dt = toasterState.lastTime ? (time - toasterState.lastTime) / 1000 : 0.016;
      toasterState.lastTime = time;
      toasterCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
      toasterCtx.fillRect(0, 0, rect.width, rect.height);
      toasterState.toasters.forEach((toaster) => drawToaster(toasterCtx, toaster, dt, rect));
      toasterState.rafId = requestAnimationFrame(loop);
    };
    toasterState.rafId = requestAnimationFrame(loop);
  };

  const stopToasters = () => {
    toasterState.running = false;
    if (toasterState.rafId) cancelAnimationFrame(toasterState.rafId);
    toasterState.rafId = null;
    toasterState.lastTime = 0;
    if (toasterCtx && toasterCanvas) {
      toasterCtx.clearRect(0, 0, toasterCanvas.width, toasterCanvas.height);
    }
  };

  let idleTimer = null;
  let active = false;

  const hide = () => {
    if (!active) return;
    active = false;
    saver.classList.remove("active");
    saver.setAttribute("aria-hidden", "true");
    stopMatrix();
    stopToasters();
  };

  const show = () => {
    if (active || !state.settings.screensaverEnabled) return;
    active = true;
    applyScreensaverSettings();
    saver.classList.add("active");
    saver.setAttribute("aria-hidden", "false");
    if (saver.dataset.style === "matrix") startMatrix();
    if (saver.dataset.style === "toasters") startToasters();
  };

  const resetTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (active) hide();
    if (!state.settings.screensaverEnabled) return;
    const minutes = Math.max(1, Number(state.settings.screensaverTimeout || 3));
    idleTimer = setTimeout(show, minutes * 60 * 1000);
  };

  const onActivity = () => resetTimer();
  ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach((eventName) => {
    document.addEventListener(eventName, onActivity, { passive: true });
  });

  saver.addEventListener("click", hide);
  document.addEventListener("keydown", hide);

  window.__daemonosScreensaver = {
    show,
    hide,
    reset: resetTimer,
    restartMatrix: () => {
      stopMatrix();
      if (saver.dataset.style === "matrix" && saver.classList.contains("active")) {
        startMatrix();
      }
    },
    restartToasters: () => {
      stopToasters();
      if (saver.dataset.style === "toasters" && saver.classList.contains("active")) {
        startToasters();
      }
    },
  };

  resetTimer();
}

function applyGlobalVolume() {
  const level = Math.max(0, Math.min(1, Number(state.settings.volume ?? 0.8)));
  window.__daemonosVolume = level;
  const registerMedia = (media) => {
    if (!media) return;
    if (!window.__daemonosMedia) window.__daemonosMedia = new Set();
    window.__daemonosMedia.add(media);
    if (media.__daemonosBaseVolume == null) {
      media.__daemonosBaseVolume = media.volume ?? 1;
    }
  };

  if (!window.__daemonosAudioPatched) {
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args);
      registerMedia(audio);
      return audio;
    };
    window.Audio.prototype = NativeAudio.prototype;
    window.__daemonosAudioPatched = true;
  }

  if (!HTMLMediaElement.prototype.__daemonosPatched) {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      registerMedia(this);
      if (this.__daemonosBaseVolume == null) {
        this.__daemonosBaseVolume = this.volume ?? 1;
      }
      this.volume = this.__daemonosBaseVolume * (window.__daemonosVolume ?? 1);
      return originalPlay.apply(this, args);
    };
    HTMLMediaElement.prototype.__daemonosPatched = true;
  }
  document.querySelectorAll("audio,video").forEach((media) => registerMedia(media));
  if (window.__daemonosMedia) {
    window.__daemonosMedia.forEach((media) => {
      if (media.__daemonosBaseVolume == null) {
        media.__daemonosBaseVolume = media.volume ?? 1;
      }
      media.volume = media.__daemonosBaseVolume * level;
    });
  }
  const slider = document.getElementById("menu-volume-range");
  if (slider) slider.value = String(Math.round(level * 100));
  const icon = document.getElementById("menu-volume-icon");
  if (icon) {
    if (level === 0) icon.textContent = "🔇";
    else if (level < 0.4) icon.textContent = "🔈";
    else if (level < 0.7) icon.textContent = "🔉";
    else icon.textContent = "🔊";
  }
}

function renderWallpaperOptions() {
  const container = document.getElementById("wallpaper-options");
  if (!container) return;
  container.innerHTML = "";
  wallpaperOptions.forEach((option) => {
    const swatch = document.createElement("button");
    swatch.className = "wallpaper-swatch";
    swatch.style.background = option.css;
    if (option.id === state.settings.wallpaper) swatch.classList.add("active");
    swatch.addEventListener("click", () => {
      state.settings.wallpaper = option.id;
      document.querySelectorAll(".wallpaper-swatch").forEach((el) => el.classList.remove("active"));
      swatch.classList.add("active");
      applySettings();
      saveSettings();
    });
    container.appendChild(swatch);
  });
}

function applyTheme() {
  const mode = state.settings.theme || "dark";
  const resolved = mode === "auto" ? resolveAutoTheme() : mode;
  document.documentElement.dataset.theme = resolved;
}

function resolveAutoTheme() {
  const now = new Date();
  const key = now.toISOString().slice(0, 10);
  if (autoThemeState.dateKey !== key) {
    autoThemeState.dateKey = key;
    if (autoThemeState.lat != null && autoThemeState.lon != null) {
      const times = getSunTimes(now, autoThemeState.lat, autoThemeState.lon);
      autoThemeState.sunrise = times.sunrise;
      autoThemeState.sunset = times.sunset;
    }
  }

  const minutes = now.getHours() * 60 + now.getMinutes();
  if (autoThemeState.sunrise != null && autoThemeState.sunset != null) {
    return minutes >= autoThemeState.sunrise && minutes < autoThemeState.sunset ? "light" : "dark";
  }
  return minutes >= 7 * 60 && minutes < 19 * 60 ? "light" : "dark";
}

function requestAutoThemeLocation() {
  if (autoThemeState.geolocationTried) return;
  autoThemeState.geolocationTried = true;
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      autoThemeState.lat = position.coords.latitude;
      autoThemeState.lon = position.coords.longitude;
      const now = new Date();
      autoThemeState.dateKey = now.toISOString().slice(0, 10);
      const times = getSunTimes(now, autoThemeState.lat, autoThemeState.lon);
      autoThemeState.sunrise = times.sunrise;
      autoThemeState.sunset = times.sunset;
      applyTheme();
    },
    () => {},
    { maximumAge: 6 * 60 * 60 * 1000, timeout: 4000 }
  );
}

function getSunTimes(date, lat, lon) {
  const zenith = 90.833;
  const dayOfYear = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
  const lngHour = lon / 15;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const calcTime = (isRise) => {
    const t = dayOfYear + ((isRise ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(toRad(M)) + 0.02 * Math.sin(toRad(2 * M)) + 282.634;
    L = (L + 360) % 360;
    let RA = toDeg(Math.atan(0.91764 * Math.tan(toRad(L))));
    RA = (RA + 360) % 360;
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = (RA + (Lquadrant - RAquadrant)) / 15;
    const sinDec = 0.39782 * Math.sin(toRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH =
      (Math.cos(toRad(zenith)) - sinDec * Math.sin(toRad(lat))) / (cosDec * Math.cos(toRad(lat)));
    if (cosH > 1 || cosH < -1) return null;
    let H = isRise ? 360 - toDeg(Math.acos(cosH)) : toDeg(Math.acos(cosH));
    H /= 15;
    const T = H + RA - 0.06571 * t - 6.622;
    let UT = T - lngHour;
    UT = (UT + 24) % 24;
    const offsetMinutes = -date.getTimezoneOffset();
    let minutes = UT * 60 + offsetMinutes;
    minutes = (minutes + 1440) % 1440;
    return minutes;
  };

  return {
    sunrise: calcTime(true),
    sunset: calcTime(false),
  };
}

function setupMenu() {
  const bananaMenu = document.getElementById("banana-menu");
  const daemonosMenu = document.getElementById("menu-daemonos");
  const volumeButton = document.getElementById("menu-volume");
  const volumeMenu = document.getElementById("volume-menu");
  const volumeRange = document.getElementById("menu-volume-range");
  const fullscreenButton = document.getElementById("menu-fullscreen");
  const fullscreenIcon = document.getElementById("menu-fullscreen-icon");
  const screensaverButton = document.getElementById("menu-screensaver");
  if (!daemonosMenu || !bananaMenu) return;

  daemonosMenu.addEventListener("click", () => {
    bananaMenu.classList.toggle("open");
    daemonosMenu.setAttribute("aria-expanded", bananaMenu.classList.contains("open"));
  });

  document.addEventListener("click", (event) => {
    if (!bananaMenu.contains(event.target) && !daemonosMenu.contains(event.target)) {
      bananaMenu.classList.remove("open");
      daemonosMenu.setAttribute("aria-expanded", "false");
    }
  });

  if (volumeButton && volumeMenu) {
    volumeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const rect = volumeButton.getBoundingClientRect();
      volumeMenu.style.left = `${Math.max(12, rect.left)}px`;
      volumeMenu.style.right = "auto";
      volumeMenu.classList.toggle("open");
      volumeButton.setAttribute("aria-expanded", volumeMenu.classList.contains("open"));
    });
  }

  const updateFullscreenIcon = () => {
    const isFull = Boolean(document.fullscreenElement);
    if (fullscreenIcon) fullscreenIcon.textContent = isFull ? "⤡" : "⤢";
    if (fullscreenButton) fullscreenButton.setAttribute("aria-label", isFull ? "Exit Fullscreen" : "Enter Fullscreen");
  };

  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // ignore fullscreen errors
      } finally {
        updateFullscreenIcon();
      }
    });
  }

  document.addEventListener("fullscreenchange", () => {
    updateFullscreenIcon();
    ensureWindowsInView();
  });
  updateFullscreenIcon();

  if (screensaverButton) {
    screensaverButton.addEventListener("click", () => {
      const saver = window.__daemonosScreensaver;
      if (!saver) return;
      const saverEl = document.getElementById("screensaver");
      if (saverEl?.classList.contains("active")) {
        saver.hide();
      } else {
        saver.show();
      }
    });
  }

  if (volumeRange) {
    volumeRange.addEventListener("input", () => {
      state.settings.volume = Number(volumeRange.value) / 100;
      applyGlobalVolume();
      saveSettings();
    });
  }

  const taskSwitcher = document.getElementById("task-switcher");
  if (taskSwitcher) {
    taskSwitcher.classList.remove("open");
  }

  document.addEventListener("click", (event) => {
    if (
      !event.target.closest(".menu-dropdown") &&
      !event.target.closest(".menu-app-button") &&
      !event.target.closest("#menu-daemonos") &&
      !event.target.closest("#menu-volume") &&
      !event.target.closest("#menu-fullscreen") &&
      !event.target.closest("#menu-screensaver") &&
      !event.target.closest("#system-monitor-widget") &&
      !event.target.closest("#system-monitor-panel")
    ) {
      closeAllMenuDropdowns();
      if (volumeMenu) {
        volumeMenu.classList.remove("open");
        volumeButton?.setAttribute("aria-expanded", "false");
      }
    }
  });

  const aboutButton = document.getElementById("about-daemonos");
  aboutButton?.addEventListener("click", () => openAboutWindow());
  const settingsButton = document.getElementById("open-settings");
  settingsButton?.addEventListener("click", () => openSettingsWindow());
  const rebootButton = document.getElementById("system-reboot");
  rebootButton?.addEventListener("click", () => rebootSystem());
  const shutdownButton = document.getElementById("system-shutdown");
  shutdownButton?.addEventListener("click", () => shutdownSystem());
}

function setupDock() {
  const track = document.getElementById("dock-track");
  if (!track) return;
  track.innerHTML = "";
  dockItems.forEach((item) => {
    const button = document.createElement("button");
    button.className = "dock-icon";
    button.dataset.id = item.id;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      item.action(button);
    });

    const glyph = document.createElement("div");
    glyph.className = `dock-glyph ${item.iconClass}`;

    const label = document.createElement("span");
    label.textContent = item.label;

    button.appendChild(glyph);
    button.appendChild(label);
    track.appendChild(button);
  });

  track.addEventListener("mousemove", (event) => {
    const icons = Array.from(track.querySelectorAll(".dock-icon"));
    icons.forEach((icon) => {
      const rect = icon.getBoundingClientRect();
      const iconCenter = rect.left + rect.width / 2;
      const distance = Math.abs(event.clientX - iconCenter);
      const influence = Math.max(0, 1 - distance / 140);
      const zoom = 1 + (state.settings.dockZoom - 1) * influence;
      icon.style.transform = `scale(${zoom})`;
    });
  });

  track.addEventListener("mouseleave", () => {
    track.querySelectorAll(".dock-icon").forEach((icon) => {
      icon.style.transform = "scale(1)";
    });
  });

  ensureDockTray();
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#dock-tray") && !event.target.closest(".dock-icon")) {
      closeDockTray();
    }
  });
}

function setupClock() {
  const timeEl = document.getElementById("menu-time");
  if (!timeEl) return;

  const update = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    timeEl.textContent = formatter.format(now);
  };
  update();
  setInterval(update, 1000 * 30);
}

function ensureDockTray() {
  let tray = document.getElementById("dock-tray");
  if (tray) return tray;
  tray = document.createElement("div");
  tray.id = "dock-tray";
  tray.className = "dock-tray";
  document.body.appendChild(tray);
  return tray;
}

function closeDockTray() {
  const tray = document.getElementById("dock-tray");
  if (tray) {
    tray.classList.remove("open");
    tray.innerHTML = "";
  }
  if (dockTrayState.button) {
    dockTrayState.button.classList.remove("tray-open");
  }
  dockTrayState = { category: null, button: null };
}

function toggleDockTray(category, button) {
  const tray = ensureDockTray();
  if (dockTrayState.category === category && tray.classList.contains("open")) {
    closeDockTray();
    return;
  }

  const apps = getAllApps().filter((app) => app.category === category);
  tray.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "dock-tray-grid";
  apps.forEach((app) => {
    const item = document.createElement("button");
    item.className = "dock-tray-item";
    item.innerHTML = `
      <div class="dock-tray-icon">${getAppIconSvg(app)}</div>
      <div class="dock-tray-label">${app.title}</div>
    `;
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      closeDockTray();
      openApp(app.id);
    });
    grid.appendChild(item);
  });
  tray.appendChild(grid);

  const rect = button.getBoundingClientRect();
  tray.style.left = `${rect.left + rect.width / 2}px`;
  tray.style.bottom = `${window.innerHeight - rect.top + 12}px`;
  tray.classList.add("open");

  if (dockTrayState.button && dockTrayState.button !== button) {
    dockTrayState.button.classList.remove("tray-open");
  }
  button.classList.add("tray-open");
  dockTrayState = { category, button };
}

async function loadRegistry() {
  try {
    const response = await fetch("apps/registry.json", { cache: "no-store" });
    const data = await response.json();
    state.registry = data.apps || [];
    state.registryVersion = data.version || data.build || "";
    window.daemonosRegistryVersion = state.registryVersion;
  } catch (err) {
    console.error("Failed to load app registry", err);
  }
}

function openCategoryWindow(category, options = {}) {
  const existing = document.querySelector(`.window[data-window-id='category-${category}']`);
  if (existing) {
    refreshCategoryWindow(existing, category);
    restoreWindow(existing);
    return;
  }
  const apps = getAllApps().filter((app) => app.category === category);
  const content = buildCategoryContent(category, apps);

  createWindow({
    id: `category-${category}`,
    meta: { type: "category", category },
    title: `${capitalize(category)}`,
    width: 420,
    height: 320,
    content,
    minimized: options.minimized,
  });
}

function openFileBrowser(options = {}) {
  const existing = document.querySelector(`.window[data-window-id='file-browser']`);
  if (existing) {
    refreshFileBrowser(existing);
    restoreWindow(existing);
    return;
  }
  const content = buildFileBrowser();

  createWindow({
    id: "file-browser",
    meta: { type: "file-browser" },
    title: "Files",
    width: 520,
    height: 380,
    content,
    minimized: options.minimized,
  });
}

async function openApp(appId, options = {}) {
  const app = getAllApps().find((entry) => entry.id === appId);
  if (!app) return;

  const existing = document.querySelector(`.window[data-window-id='app-${appId}']`);
  if (existing) {
    restoreWindow(existing);
    return;
  }

  const activeIcon = document.querySelector(`.dock-icon[data-id='${app.category}']`);
  activeIcon?.classList.add("active");

  try {
    const modulePath = withCacheBust(normalizeModulePath(app.module));
    const module = await import(modulePath);
    const result = await module.createApp?.(osAPI);
    if (!result || result.skipWindow) return;
    const windowNode = createWindow({
      id: `app-${appId}`,
      meta: { type: "app", appId },
      title: result.title || app.title,
      width: result.width || 520,
      height: result.height || 360,
      content: result.content,
      minimized: options.minimized,
    });
    windowNode.dataset.appId = appId;
    registerApp(appId, {
      title: result.title || app.title,
      windowNode,
      hooks: {
        onSuspend: result.onSuspend,
        onResume: result.onResume,
        freeOptionalCaches: result.freeOptionalCaches,
      },
    });
  } catch (err) {
    console.error("Failed to open app", err);
  }
}

function focusAppById(appId) {
  const windowNode = document.querySelector(`.window[data-window-id='app-${appId}']`);
  if (windowNode) {
    restoreWindow(windowNode);
    return;
  }
  openApp(appId);
}

function closeAppById(appId) {
  const windowNode = document.querySelector(`.window[data-window-id='app-${appId}']`);
  if (!windowNode) return;
  const title = windowNode.querySelector(".window-title")?.textContent || appId;
  windowNode.remove();
  addToTrash({
    id: windowNode.dataset.windowId || "",
    title,
    closedAt: Date.now(),
  });
  removeWindow(windowNode);
}

function createWindow({ id, title, width, height, content, minimized, meta }) {
  const windows = document.getElementById("windows");
  if (!windows) return null;

  const windowNode = document.createElement("section");
  windowNode.className = "window";
  if (id) windowNode.dataset.windowId = id;
  const saved = id ? state.windowState[id] : null;
  const baseLeft = saved?.left ?? 80 + state.windows.length * 24;
  const baseTop = saved?.top ?? 60 + state.windows.length * 18;
  const baseWidth = saved?.width ?? width;
  const baseHeight = saved?.height ?? height;
  const padding = 24;
  const menuHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--menu-height")) || 36;
  const maxWidth = Math.max(360, window.innerWidth - padding * 2);
  const maxHeight = Math.max(260, window.innerHeight - menuHeight - padding * 2);
  const startWidth = Math.min(baseWidth, maxWidth);
  const startHeight = Math.min(baseHeight, maxHeight);
  const startLeft = Math.min(Math.max(baseLeft, padding), window.innerWidth - startWidth - padding);
  const startTop = Math.min(Math.max(baseTop, menuHeight + padding), window.innerHeight - startHeight - padding);
  windowNode.style.width = `${startWidth}px`;
  windowNode.style.height = `${startHeight}px`;
  windowNode.style.left = `${startLeft}px`;
  windowNode.style.top = `${startTop}px`;
  windowNode.style.zIndex = String(state.zIndex++);

  const header = document.createElement("div");
  header.className = "window-header";
  const titleNode = document.createElement("div");
  titleNode.className = "window-title";
  titleNode.textContent = title;

  const controls = document.createElement("div");
  controls.className = "window-controls";
  const minimizeButton = document.createElement("button");
  minimizeButton.className = "window-button minimize";
  minimizeButton.setAttribute("aria-label", "Minimize");
  minimizeButton.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  minimizeButton.addEventListener("click", () => {
    minimizeWindow(windowNode);
  });
  const maximizeButton = document.createElement("button");
  maximizeButton.className = "window-button maximize";
  maximizeButton.setAttribute("aria-label", "Maximize");
  maximizeButton.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  maximizeButton.addEventListener("click", () => {
    toggleMaximize(windowNode);
  });
  const closeButton = document.createElement("button");
  closeButton.className = "window-button close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  closeButton.addEventListener("click", () => {
    windowNode.remove();
    addToTrash({
      id: windowNode.dataset.windowId || "",
      title,
      closedAt: Date.now(),
    });
    removeWindow(windowNode);
  });

  controls.appendChild(minimizeButton);
  controls.appendChild(maximizeButton);
  controls.appendChild(closeButton);
  header.appendChild(titleNode);
  header.appendChild(controls);

  const body = document.createElement("div");
  body.className = "window-body";
  if (content) body.appendChild(content);

  windowNode.appendChild(header);
  windowNode.appendChild(body);
  windows.appendChild(windowNode);
  registerWindow(windowNode, title, meta);
  if (meta?.type === "app" && meta.appId) {
    windowNode.dataset.appId = meta.appId;
    setActiveApp(meta.appId);
  }

  if (minimized) {
    minimizeWindow(windowNode, { skipAnimation: true });
  }

  windowNode.addEventListener("mousedown", () => {
    windowNode.style.zIndex = String(state.zIndex++);
    if (windowNode.dataset.appId) {
      setActiveApp(windowNode.dataset.appId);
    } else {
      setActiveApp(null);
    }
  });

  makeDraggable(windowNode, header);
  addResizeHandles(windowNode);
  return windowNode;
}

function makeDraggable(windowNode, handle) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener("mousedown", (event) => {
    if (event.target.closest(".window-controls")) return;
    isDragging = true;
    const rect = windowNode.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    windowNode.style.zIndex = String(state.zIndex++);
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    windowNode.style.left = `${event.clientX - offsetX}px`;
    windowNode.style.top = `${event.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      persistWindowPosition(windowNode);
    }
    isDragging = false;
  });
}

function addResizeHandles(windowNode) {
  const directions = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  directions.forEach((dir) => {
    const handle = document.createElement("div");
    handle.className = `resize-handle ${dir}`;
    handle.dataset.dir = dir;
    handle.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      startResize(event, windowNode, dir);
    });
    windowNode.appendChild(handle);
  });
}

function startResize(event, windowNode, dir) {
  if (windowNode.classList.contains("maximized")) return;
  const startRect = windowNode.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const minWidth = 320;
  const minHeight = 220;

  const onMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    let newLeft = startRect.left;
    let newTop = startRect.top;
    let newWidth = startRect.width;
    let newHeight = startRect.height;

    if (dir.includes("e")) {
      newWidth = Math.max(minWidth, startRect.width + dx);
    }
    if (dir.includes("s")) {
      newHeight = Math.max(minHeight, startRect.height + dy);
    }
    if (dir.includes("w")) {
      newWidth = Math.max(minWidth, startRect.width - dx);
      newLeft = startRect.left + (startRect.width - newWidth);
    }
    if (dir.includes("n")) {
      newHeight = Math.max(minHeight, startRect.height - dy);
      newTop = startRect.top + (startRect.height - newHeight);
    }

    windowNode.style.left = `${newLeft}px`;
    windowNode.style.top = `${newTop}px`;
    windowNode.style.width = `${newWidth}px`;
    windowNode.style.height = `${newHeight}px`;
  };

  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    persistWindowPosition(windowNode);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function getAllApps() {
  return [...state.registry];
}

function normalizeModulePath(modulePath) {
  if (modulePath.startsWith("/")) return modulePath;
  if (modulePath.startsWith("./") || modulePath.startsWith("../")) return modulePath;
  return `/${modulePath}`;
}

function withCacheBust(path) {
  if (!state.registryVersion) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${encodeURIComponent(state.registryVersion)}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toggleMaximize(windowNode) {
  if (windowNode.classList.contains("maximized")) {
    const prev = windowNode.dataset.prevRect ? JSON.parse(windowNode.dataset.prevRect) : null;
    if (prev) {
      windowNode.style.left = `${prev.left}px`;
      windowNode.style.top = `${prev.top}px`;
      windowNode.style.width = `${prev.width}px`;
      windowNode.style.height = `${prev.height}px`;
    }
    windowNode.classList.remove("maximized");
    windowNode.dataset.prevRect = "";
    persistWindowPosition(windowNode);
    return;
  }

  const rect = windowNode.getBoundingClientRect();
  windowNode.dataset.prevRect = JSON.stringify({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });

  const windowsRoot = document.getElementById("windows");
  const bounds = windowsRoot?.getBoundingClientRect();
  if (bounds) {
    windowNode.style.left = "0px";
    windowNode.style.top = "0px";
    windowNode.style.width = `${bounds.width}px`;
    windowNode.style.height = `${bounds.height}px`;
  }
  windowNode.classList.add("maximized");
  persistWindowPosition(windowNode);
}

function registerAppMenu(appId, menuConfig) {
  state.appMenus[appId] = menuConfig;
  if (state.activeAppId === appId) {
    renderMenuBar();
  }
}

function setActiveApp(appId) {
  state.activeAppId = appId;
  setFocusedApp(appId);
  renderMenuBar();
}

function getDefaultMenus(appName) {
  return [
    {
      title: appName,
      items: [
        { label: `About ${appName}`, onClick: () => openAppAboutWindow(state.activeAppId) },
        { label: "Preferences", disabled: true },
      ],
    },
    {
      title: "Edit",
      items: [
        { label: "Undo", disabled: true },
        { label: "Redo", disabled: true },
        { label: "Copy", disabled: true },
        { label: "Paste", disabled: true },
      ],
    },
    {
      title: "View",
      items: [
        { label: "Zoom In", disabled: true },
        { label: "Zoom Out", disabled: true },
      ],
    },
    {
      title: "Window",
      items: [
        { label: "Minimize All", onClick: () => minimizeAllWindows() },
        { label: "Restore All", onClick: () => restoreAllWindows() },
        { label: "Tile Windows", onClick: () => tileWindows() },
        { label: "Cascade Windows", onClick: () => cascadeWindows() },
      ],
    },
    {
      title: "Help",
      items: [
        { label: "DaemonOS Help", disabled: true },
      ],
    },
  ];
}

function renderMenuBar() {
  const container = document.getElementById("menu-apps");
  if (!container) return;
  container.innerHTML = "";

  const activeAppId = state.activeAppId;
  const appName = activeAppId
    ? getAllApps().find((app) => app.id === activeAppId)?.title || "App"
    : "Files";

  const customMenu = activeAppId ? state.appMenus[activeAppId] : null;
  const menus = customMenu?.menus || getDefaultMenus(appName);

  menus.forEach((menu) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    const button = document.createElement("button");
    button.className = "menu-item menu-button-ghost menu-app-button";
    button.textContent = menu.title;

    const dropdown = document.createElement("div");
    dropdown.className = "menu-dropdown";

    menu.items.forEach((item) => {
      const entry = document.createElement("button");
      entry.textContent = item.label;
      const isAboutItem = typeof item.label === "string" && item.label.startsWith("About ");
      if (isAboutItem) item.disabled = false;
      if (item.disabled) entry.disabled = true;
      if (item.type === "checkbox") {
        const check = document.createElement("span");
        check.className = `menu-check ${item.checked ? "checked" : ""}`;
        entry.appendChild(check);
      }
      if (isAboutItem && !item.onClick && !item.disabled) {
        item.onClick = () => openAppAboutWindow(activeAppId);
      }
      entry.addEventListener("click", () => {
        if (item.disabled) return;
        if (item.type === "checkbox") {
          item.checked = !item.checked;
          item.onToggle?.(item.checked);
          renderMenuBar();
        } else {
          item.onClick?.();
        }
        closeAllMenuDropdowns();
      });
      dropdown.appendChild(entry);
    });

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("open");
      closeAllMenuDropdowns(dropdown);
      if (isOpen) dropdown.classList.add("open");
    });

    wrapper.appendChild(button);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);
  });
}

function closeAllMenuDropdowns(except) {
  document.querySelectorAll(".menu-dropdown").forEach((menu) => {
    if (menu !== except) menu.classList.remove("open");
  });
}

function openAboutWindow() {
  const existing = document.querySelector(`.window[data-window-id='about-daemonos']`);
  if (existing) {
    restoreWindow(existing);
    return;
  }
  const content = document.createElement("div");
  content.className = "about-panel";

  const logo = document.createElement("div");
  logo.className = "about-logo";
  logo.textContent = "DAEMONOS";

  const title = document.createElement("div");
  title.className = "about-name";
  title.textContent = "DaemonOS";

  const subtitle = document.createElement("div");
  subtitle.className = "about-subtitle";
  subtitle.textContent = "";

  const body = document.createElement("div");
  body.textContent = "Just for the fun of it.";

  const meta = document.createElement("div");
  meta.className = "about-meta";
  const specs = getPlayfulSpecs();
  meta.innerHTML = `
    <div><span>Version</span><span>0.1.0</span></div>
    <div><span>Build</span><span>2026.02.06</span></div>
    <div><span>Shell</span><span>DaemonOS Web</span></div>
    <div><span>CPU</span><span>${specs.cpu}</span></div>
    <div><span>Memory</span><span>${specs.memory}</span></div>
    <div><span>Graphics</span><span>${specs.gpu}</span></div>
  `;

  const footer = document.createElement("div");
  footer.className = "about-footer";
  footer.innerHTML = `
    © 2026 DaemonOS Project. All rights reserved.<br />
    Just for the fun of it.
  `;

  content.appendChild(logo);
  content.appendChild(title);
  content.appendChild(subtitle);
  content.appendChild(body);
  content.appendChild(meta);
  content.appendChild(footer);

  createWindow({
    id: "about-daemonos",
    meta: { type: "about" },
    title: "About DaemonOS",
    width: 400,
    height: 360,
    content,
  });
}

const appAboutDetails = {
  notepad: {
    libraries: ["None"],
    details: [
      "Autosaves to local storage on each edit.",
      "Lightweight text area with persistence.",
    ],
  },
  browser: {
    libraries: ["None"],
    details: [
      "Local page renderer only (no remote iframes).",
      "Search opens DuckDuckGo in a new browser tab.",
      "Bookmarks and home page live under /apps/browser/pages.",
    ],
  },
  paint: {
    libraries: ["None"],
    details: [
      "Canvas-based drawing with brushes, size, and eraser.",
      "Local-only rendering and state.",
    ],
  },
  musicplayer: {
    libraries: ["Web Audio API"],
    details: [
      "Playlist-driven playback from /site/media/music.",
      "Multiple visualizer modes rendered on Canvas.",
      "Client-side audio pipeline only.",
    ],
  },
  diagnostics: {
    libraries: ["None"],
    details: [
      "Reads browser/device capabilities and session stats.",
      "No external telemetry.",
    ],
  },
  settings: {
    libraries: ["None"],
    details: [
      "Adjusts desktop theme, dock, and screensaver settings.",
      "Persists preferences to local storage.",
    ],
  },
  calculator: {
    libraries: ["None"],
    details: [
      "Basic calculator with client-side state.",
    ],
  },
  pong: {
    libraries: ["None"],
    details: [
      "Canvas-based paddle game with progressive speed.",
      "Local-only scoring and play state.",
    ],
  },
  minesweeper: {
    libraries: ["None"],
    details: [
      "Grid-based puzzle with multiple board sizes.",
      "Shift-click flagging and modal loss state.",
    ],
  },
  frogger: {
    libraries: ["None"],
    details: [
      "Multi-level lane runner with lives and score.",
      "Sound effects are local audio files.",
    ],
  },
  pineball: {
    libraries: ["Planck.js (Box2D)"],
    details: [
      "Physics-based pinball using a static playfield and joints.",
      "Canvas-rendered neon table with scoring and ball saver.",
    ],
  },
  racecar: {
    libraries: ["None"],
    details: [
      "Retro obstacle dodging with increasing speed.",
      "Client-side score and high score tracking.",
    ],
  },
  connect4: {
    libraries: ["None"],
    details: [
      "7x6 grid with animated drops and win highlighting.",
      "Human vs CPU with difficulty levels.",
    ],
  },
  snake: {
    libraries: ["None"],
    details: [
      "Grid-based movement with wrap-around walls.",
      "Food spawn logic avoids the snake body.",
    ],
  },
  asteroids: {
    libraries: ["None"],
    details: [
      "Vector-style ship with wrap-around and splitting asteroids.",
      "Sound effects are local audio files.",
    ],
  },
  spaceinvaders: {
    libraries: ["None"],
    details: [
      "Marching invader grid with lives and shields.",
      "Sound effects are local audio files.",
    ],
  },
  spacefighter: {
    libraries: ["None"],
    details: [
      "Bullet-hell shooter with multiple enemy patterns.",
      "Difficulty affects fire rate, bullet speed, and health.",
    ],
  },
  chess: {
    libraries: ["None"],
    details: [
      "Client-side chess engine with multiple levels.",
      "SVG piece themes and timed play option.",
    ],
  },
  checkers: {
    libraries: ["None"],
    details: [
      "Classic checkers with optional forced jumps.",
      "CPU supports multi-jump sequences.",
    ],
  },
};

function openAppAboutWindow(appId) {
  if (!appId) return;
  const app = getAllApps().find((entry) => entry.id === appId);
  if (!app) return;
  const windowId = `about-${appId}`;
  const existing = document.querySelector(`.window[data-window-id='${windowId}']`);
  if (existing) {
    restoreWindow(existing);
    return;
  }

  const content = document.createElement("div");
  content.className = "app-about-panel";

  const header = document.createElement("div");
  header.className = "app-about-header";
  const icon = document.createElement("div");
  icon.className = "app-about-icon";
  icon.innerHTML = getWindowIconSvg(`app-${appId}`, app.title);
  const title = document.createElement("div");
  title.className = "app-about-title";
  title.textContent = app.title;
  const subtitle = document.createElement("div");
  subtitle.className = "app-about-subtitle";
  subtitle.textContent = app.description || "DaemonOS application";
  header.append(icon, title, subtitle);

  const detail = appAboutDetails[appId] || { libraries: ["None"], details: [] };
  const libraries = document.createElement("div");
  libraries.className = "app-about-section";
  libraries.innerHTML = `<div class="app-about-label">Libraries</div><div>${detail.libraries.join(", ")}</div>`;

  const details = document.createElement("div");
  details.className = "app-about-section";
  const detailList = detail.details.length
    ? `<ul>${detail.details.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "<div>No additional details.</div>";
  details.innerHTML = `<div class="app-about-label">Technical Summary</div>${detailList}`;

  const meta = document.createElement("div");
  meta.className = "app-about-section";
  meta.innerHTML = `
    <div class="app-about-label">Module</div>
    <div>${app.module}</div>
    <div class="app-about-label">Build</div>
    <div>${state.registryVersion || "n/a"}</div>
  `;

  content.append(header, libraries, details, meta);

  createWindow({
    id: windowId,
    meta: { type: "about", appId },
    title: `About ${app.title}`,
    width: 420,
    height: 360,
    content,
  });
}

function openSettingsWindow() {
  const existing = document.querySelector(`.window[data-window-id='settings']`);
  if (existing) {
    restoreWindow(existing);
    return;
  }

  const content = document.createElement("div");
  content.style.display = "grid";
  content.style.gap = "16px";

  const desktopSection = document.createElement("div");
  const desktopTitle = document.createElement("div");
  desktopTitle.className = "menu-title";
  desktopTitle.textContent = "Desktop";

  const wallpaperLabel = document.createElement("div");
  wallpaperLabel.className = "menu-label";
  wallpaperLabel.textContent = "Wallpaper";
  const wallpaperOptions = document.createElement("div");
  wallpaperOptions.className = "menu-options";
  wallpaperOptions.id = "settings-wallpaper-options";

  const iconSizeLabel = document.createElement("label");
  iconSizeLabel.className = "menu-label";
  iconSizeLabel.textContent = "Icon Size";
  const iconSize = document.createElement("input");
  iconSize.type = "range";
  iconSize.min = "44";
  iconSize.max = "90";
  iconSize.value = String(state.settings.iconSize);
  iconSize.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    state.settings.iconSize = value;
    applySettings();
    saveSettings();
  });

  const themeLabel = document.createElement("label");
  themeLabel.className = "menu-label";
  themeLabel.textContent = "Appearance";
  const themeSelect = document.createElement("select");
  themeSelect.className = "menu-select";
  ["dark", "light", "auto"].forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    themeSelect.appendChild(option);
  });
  themeSelect.value = state.settings.theme || "dark";
  themeSelect.addEventListener("change", () => {
    state.settings.theme = themeSelect.value;
    applySettings();
    saveSettings();
    if (state.settings.theme === "auto") requestAutoThemeLocation();
  });

  desktopSection.appendChild(desktopTitle);
  desktopSection.appendChild(wallpaperLabel);
  desktopSection.appendChild(wallpaperOptions);
  desktopSection.appendChild(themeLabel);
  desktopSection.appendChild(themeSelect);
  desktopSection.appendChild(iconSizeLabel);
  desktopSection.appendChild(iconSize);

  const dockSection = document.createElement("div");
  const dockTitle = document.createElement("div");
  dockTitle.className = "menu-title";
  dockTitle.textContent = "Dock";
  const dockSizeLabel = document.createElement("label");
  dockSizeLabel.className = "menu-label";
  dockSizeLabel.textContent = "Dock Size";
  const dockSize = document.createElement("input");
  dockSize.type = "range";
  dockSize.min = "48";
  dockSize.max = "110";
  dockSize.value = String(state.settings.dockSize);
  dockSize.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    state.settings.dockSize = value;
    applySettings();
    saveSettings();
  });

  const dockZoomLabel = document.createElement("label");
  dockZoomLabel.className = "menu-label";
  dockZoomLabel.textContent = "Zoom Strength";
  const dockZoom = document.createElement("input");
  dockZoom.type = "range";
  dockZoom.min = "1";
  dockZoom.max = "2";
  dockZoom.step = "0.05";
  dockZoom.value = String(state.settings.dockZoom);
  dockZoom.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    state.settings.dockZoom = value;
    applySettings();
    saveSettings();
  });

  const trayIconSizeLabel = document.createElement("label");
  trayIconSizeLabel.className = "menu-label";
  trayIconSizeLabel.textContent = "Tray Icon Size";
  const trayIconSize = document.createElement("input");
  trayIconSize.id = "tray-icon-size";
  trayIconSize.type = "range";
  trayIconSize.min = "28";
  trayIconSize.max = "72";
  trayIconSize.value = String(state.settings.trayIconSize);
  trayIconSize.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    state.settings.trayIconSize = value;
    applySettings();
    saveSettings();
  });

  dockSection.appendChild(dockTitle);
  dockSection.appendChild(dockSizeLabel);
  dockSection.appendChild(dockSize);
  dockSection.appendChild(dockZoomLabel);
  dockSection.appendChild(dockZoom);
  dockSection.appendChild(trayIconSizeLabel);
  dockSection.appendChild(trayIconSize);

  const saverSection = document.createElement("div");
  const saverTitle = document.createElement("div");
  saverTitle.className = "menu-title";
  saverTitle.textContent = "Screensaver";

  const saverToggleLabel = document.createElement("label");
  saverToggleLabel.className = "menu-label";
  saverToggleLabel.textContent = "Enabled";
  const saverToggle = document.createElement("input");
  saverToggle.type = "checkbox";
  saverToggle.checked = Boolean(state.settings.screensaverEnabled);
  saverToggle.addEventListener("change", () => {
    state.settings.screensaverEnabled = saverToggle.checked;
    saveSettings();
    window.__daemonosScreensaver?.reset();
  });

  const saverTimeoutLabel = document.createElement("label");
  saverTimeoutLabel.className = "menu-label";
  saverTimeoutLabel.textContent = "Timeout (minutes)";
  const saverTimeout = document.createElement("select");
  saverTimeout.className = "menu-select";
  [1, 3, 5, 10, 15].forEach((min) => {
    const option = document.createElement("option");
    option.value = String(min);
    option.textContent = `${min} min`;
    saverTimeout.appendChild(option);
  });
  saverTimeout.value = String(state.settings.screensaverTimeout || 3);
  saverTimeout.addEventListener("change", () => {
    state.settings.screensaverTimeout = Number(saverTimeout.value);
    saveSettings();
    window.__daemonosScreensaver?.reset();
  });

  const saverStyleLabel = document.createElement("label");
  saverStyleLabel.className = "menu-label";
  saverStyleLabel.textContent = "Style";
  const saverStyle = document.createElement("select");
  saverStyle.className = "menu-select";
  [
    { id: "stars", label: "Starfield" },
    { id: "lines", label: "Aurora Lines" },
    { id: "matrix", label: "Matrix Rain" },
    { id: "toasters", label: "Flying Toasters" },
  ].forEach((style) => {
    const option = document.createElement("option");
    option.value = style.id;
    option.textContent = style.label;
    saverStyle.appendChild(option);
  });
  saverStyle.value = state.settings.screensaverStyle || "stars";
  saverStyle.addEventListener("change", () => {
    state.settings.screensaverStyle = saverStyle.value;
    saveSettings();
    applyScreensaverSettings();
    window.__daemonosScreensaver?.restartMatrix?.();
    window.__daemonosScreensaver?.restartToasters?.();
  });

  saverSection.appendChild(saverTitle);
  saverSection.appendChild(saverToggleLabel);
  saverSection.appendChild(saverToggle);
  saverSection.appendChild(saverTimeoutLabel);
  saverSection.appendChild(saverTimeout);
  saverSection.appendChild(saverStyleLabel);
  saverSection.appendChild(saverStyle);

  content.appendChild(desktopSection);
  content.appendChild(dockSection);
  content.appendChild(saverSection);

  createWindow({
    id: "settings",
    meta: { type: "settings" },
    title: "Settings",
    width: 480,
    height: 420,
    content,
  });

  renderWallpaperOptionsInto(wallpaperOptions);
}

function renderWallpaperOptionsInto(container) {
  container.innerHTML = "";
  wallpaperOptions.forEach((option) => {
    const swatch = document.createElement("button");
    swatch.className = "wallpaper-swatch";
    swatch.style.background = option.css;
    if (option.id === state.settings.wallpaper) swatch.classList.add("active");
    swatch.addEventListener("click", () => {
      state.settings.wallpaper = option.id;
      container.querySelectorAll(".wallpaper-swatch").forEach((el) => el.classList.remove("active"));
      swatch.classList.add("active");
      applySettings();
      saveSettings();
    });
    container.appendChild(swatch);
  });
}

function rebootSystem() {
  localStorage.setItem("daemonos.rebootFlag", "1");
  window.location.reload();
}

function shutdownSystem() {
  document.body.innerHTML = "";
  document.body.style.background = "#000";
  const screen = document.createElement("div");
  screen.style.display = "grid";
  screen.style.placeItems = "center";
  screen.style.height = "100vh";
  screen.style.color = "#fff";
  screen.style.fontFamily = "\"Avenir Next\", \"Gill Sans\", sans-serif";
  screen.innerHTML = "<div>DaemonOS is now shut down.</div>";
  document.body.appendChild(screen);
}

function getPlayfulSpecs() {
  const isMac = /Mac/i.test(navigator.platform || navigator.userAgent);
  const isAppleSilicon = isMac && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (isAppleSilicon) {
    return {
      cpu: "Apple Silicon M6 Max",
      memory: "1024 GB Unified Memory",
      gpu: "84‑core GPU (Hyper‑Flux)",
    };
  }
  if (isMac) {
    return {
      cpu: "Intel i10 64‑core CPU",
      memory: "2048 GB RAM",
      gpu: "Quantum Iris Ultra",
    };
  }
  return {
    cpu: "Intel i10 64‑core CPU",
    memory: "2048 GB RAM",
    gpu: "Quantum Iris Ultra",
  };
}

function minimizeAllWindows() {
  state.windows.forEach((entry) => {
    if (!entry.element.classList.contains("minimized")) {
      minimizeWindow(entry.element);
    }
  });
}

function restoreAllWindows() {
  state.windows.forEach((entry) => {
    restoreWindow(entry.element, { skipAnimation: true });
  });
}

function tileWindows() {
  const windowsRoot = document.getElementById("windows");
  if (!windowsRoot) return;
  const rect = windowsRoot.getBoundingClientRect();
  const count = state.windows.length || 1;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const tileWidth = rect.width / cols;
  const tileHeight = rect.height / rows;

  state.windows.forEach((entry, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    entry.element.classList.remove("maximized");
    entry.element.style.left = `${col * tileWidth}px`;
    entry.element.style.top = `${row * tileHeight}px`;
    entry.element.style.width = `${tileWidth}px`;
    entry.element.style.height = `${tileHeight}px`;
    persistWindowPosition(entry.element);
  });
}

function cascadeWindows() {
  state.windows.forEach((entry, index) => {
    const offsetLeft = 60 + index * 24;
    const offsetTop = 50 + index * 20;
    entry.element.classList.remove("maximized");
    entry.element.style.left = `${offsetLeft}px`;
    entry.element.style.top = `${offsetTop}px`;
    entry.element.style.width = `520px`;
    entry.element.style.height = `360px`;
    persistWindowPosition(entry.element);
  });
}

function ensureWindowsInView() {
  const windowsRoot = document.getElementById("windows");
  if (!windowsRoot) return;
  const bounds = windowsRoot.getBoundingClientRect();
  const menuHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--menu-height")) || 36;
  const padding = 12;
  state.windows.forEach((entry) => {
    const node = entry.element;
    if (!node || node.classList.contains("minimized")) return;
    if (node.classList.contains("maximized")) {
      node.style.left = "0px";
      node.style.top = "0px";
      node.style.width = `${bounds.width}px`;
      node.style.height = `${bounds.height}px`;
      persistWindowPosition(node);
      return;
    }
    const rect = node.getBoundingClientRect();
    const width = Math.min(rect.width, bounds.width - padding * 2);
    const height = Math.min(rect.height, bounds.height - padding * 2);
    let left = rect.left - bounds.left;
    let top = rect.top - bounds.top;
    left = Math.min(Math.max(left, padding), bounds.width - width - padding);
    top = Math.min(Math.max(top, menuHeight + padding), bounds.height - height - padding);
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    persistWindowPosition(node);
  });
}


function registerWindow(windowNode, title, meta) {
  state.windows.push({
    id: windowNode.dataset.windowId || `window-${Date.now()}`,
    title,
    element: windowNode,
    meta,
    minimized: false,
  });
  renderTaskSwitcher();
  saveSession();
}

function removeWindow(windowNode) {
  state.windows = state.windows.filter((entry) => entry.element !== windowNode);
  renderTaskSwitcher();
  saveSession();
  if (windowNode.dataset.appId && state.activeAppId === windowNode.dataset.appId) {
    setActiveApp(null);
  }
  if (windowNode.dataset.appId) {
    unregisterApp(windowNode.dataset.appId);
  }
}

function updateTaskWindow() {
  renderTaskSwitcher();
  saveSession();
}

function renderTaskSwitcher() {
  const panel = document.getElementById("task-switcher");
  if (!panel || !panel.classList.contains("open")) return;
  panel.innerHTML = "";

  if (state.windows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "menu-hint";
    empty.textContent = "No active windows.";
    panel.appendChild(empty);
    return;
  }

  state.windows.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "task-item";

    const title = document.createElement("div");
    title.textContent = entry.title;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const focusBtn = document.createElement("button");
    focusBtn.textContent = entry.element.classList.contains("minimized") ? "Restore" : "Focus";
    focusBtn.addEventListener("click", () => {
      restoreWindow(entry.element);
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => {
      entry.element.remove();
      removeWindow(entry.element);
    });

    actions.appendChild(focusBtn);
    actions.appendChild(closeBtn);
    row.appendChild(title);
    row.appendChild(actions);
    panel.appendChild(row);
  });
}

function setupTrash() {
  const trashButton = document.getElementById("dock-trash");
  if (!trashButton) return;
  updateTrashIcon();
  trashButton.addEventListener("click", () => openTrashWindow());
}

function addToTrash(item) {
  state.trash.push(item);
  updateTrashIcon();
}

function emptyTrash() {
  state.trash = [];
  updateTrashIcon();
  renderTaskSwitcher();
}

function updateTrashIcon() {
  const trashButton = document.getElementById("dock-trash");
  if (!trashButton) return;
  if (state.trash.length === 0) {
    trashButton.classList.add("empty");
    trashButton.classList.remove("full");
  } else {
    trashButton.classList.add("full");
    trashButton.classList.remove("empty");
  }
}

function openTrashWindow(options = {}) {
  const existing = document.querySelector(`.window[data-window-id='trash']`);
  if (existing) {
    restoreWindow(existing);
    return;
  }

  const content = document.createElement("div");
  const header = document.createElement("div");
  header.className = "fs-bar";
  const title = document.createElement("div");
  title.className = "fs-path";
  title.textContent = state.trash.length ? `${state.trash.length} item(s)` : "Trash is empty";
  const emptyBtn = document.createElement("button");
  emptyBtn.className = "menu-button";
  emptyBtn.textContent = "Empty Trash";
  emptyBtn.disabled = state.trash.length === 0;
  emptyBtn.addEventListener("click", () => {
    emptyTrash();
    title.textContent = "Trash is empty";
    emptyBtn.disabled = true;
    list.innerHTML = "";
  });

  header.appendChild(title);
  header.appendChild(emptyBtn);

  const list = document.createElement("div");
  list.className = "window-list";
  state.trash.forEach((item) => {
    const card = document.createElement("div");
    card.className = "app-card";
    const name = document.createElement("h4");
    name.textContent = item.title;
    const meta = document.createElement("p");
    const date = new Date(item.closedAt);
    meta.textContent = `Closed ${date.toLocaleString()}`;
    card.appendChild(name);
    card.appendChild(meta);
    list.appendChild(card);
  });

  content.appendChild(header);
  content.appendChild(list);

  createWindow({
    id: "trash",
    meta: { type: "trash" },
    title: "Trash",
    width: 420,
    height: 320,
    content,
    minimized: options.minimized,
  });
}

function minimizeWindow(windowNode, options = {}) {
  if (windowNode.classList.contains("minimized")) return;
  const tray = document.getElementById("dock-minimized");
  if (!tray) return;

  const trayButton = createMinimizedTrayItem(windowNode);
  if (options.skipAnimation) {
    windowNode.classList.add("minimized");
    updateTaskWindow(windowNode);
    return;
  }

  animateWindowToDock(windowNode, trayButton, () => {
    windowNode.classList.add("minimized");
    updateTaskWindow(windowNode);
  });
}

function getWindowIconSvg(windowId, title) {
  const key = windowId || "";
  const icon = (() => {
    if (key.includes("file-browser")) return "folder";
    if (key.includes("category-applications")) return "apps";
    if (key.includes("category-games")) return "games";
    if (key.includes("category-utilities")) return "utilities";
    if (key.includes("app-notepad")) return "note";
    if (key.includes("app-browser")) return "globe";
    if (key.includes("app-calculator")) return "calculator";
    if (key.includes("app-settings")) return "settings";
    if (key.includes("app-diagnostics")) return "diagnostics";
    if (key.includes("app-paint")) return "paint";
    if (key.includes("app-musicplayer")) return "musicplayer";
    if (key.includes("app-pong")) return "pong";
    if (key.includes("app-minesweeper")) return "minesweeper";
    if (key.includes("app-frogger")) return "frogger";
    if (key.includes("app-pineball")) return "pinball";
    if (key.includes("app-racecar")) return "racecar";
    if (key.includes("app-chess")) return "chess";
    if (key.includes("app-checkers")) return "checkers";
    if (key.includes("app-connect4")) return "connect4";
    if (key.includes("app-snake")) return "snake";
    if (key.includes("app-asteroids")) return "asteroids";
    if (key.includes("app-spaceinvaders")) return "spaceinvaders";
    if (key.includes("app-spacefighter")) return "spacefighter";
    return "window";
  })();

  const svgMap = {
    folder: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <path d="M8 18c0-3 2-5 5-5h14l6 6h18c3 0 5 2 5 5v22c0 3-2 5-5 5H13c-3 0-5-2-5-5V18z" fill="#f7d58b"/>
        <path d="M8 26h48v6H8z" fill="#b77a20"/>
      </svg>`,
    apps: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <circle cx="20" cy="20" r="8" fill="#9fe6ff"/>
        <circle cx="44" cy="20" r="8" fill="#62b7ff"/>
        <circle cx="20" cy="44" r="8" fill="#6fdca6"/>
        <circle cx="44" cy="44" r="8" fill="#f7c96a"/>
      </svg>`,
    games: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="10" y="22" width="44" height="24" rx="10" fill="#ffb088"/>
        <rect x="18" y="30" width="10" height="4" rx="2" fill="#3b1f1f"/>
        <rect x="22" y="26" width="4" height="12" rx="2" fill="#3b1f1f"/>
        <circle cx="44" cy="32" r="3" fill="#3b1f1f"/>
        <circle cx="50" cy="36" r="3" fill="#3b1f1f"/>
      </svg>`,
    utilities: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <path d="M26 10h12l2 6h8l2 6h-8l-2 6H26l-2-6h-8l2-6h8z" fill="#8de2a6"/>
        <circle cx="32" cy="36" r="10" fill="#2d5b2d"/>
      </svg>`,
    note: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="16" y="12" width="32" height="40" rx="6" fill="#f5f0d8"/>
        <path d="M22 24h20M22 32h20M22 40h14" stroke="#8c7f5c" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
    globe: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <circle cx="32" cy="32" r="18" fill="#8fd3ff"/>
        <path d="M14 32h36M32 14v36M22 22c4 10 4 20 0 28M42 22c-4 10-4 20 0 28" stroke="#1a3960" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M20 28c4-6 20-6 24 0M20 36c4 6 20 6 24 0" stroke="#2f6b89" stroke-width="2" fill="none"/>
      </svg>`,
    calculator: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="16" y="10" width="32" height="44" rx="8" fill="#ffd27a"/>
        <rect x="20" y="16" width="24" height="10" rx="3" fill="#8a5a14"/>
        <rect x="20" y="30" width="8" height="8" rx="2" fill="#6e4b12"/>
        <rect x="30" y="30" width="8" height="8" rx="2" fill="#6e4b12"/>
        <rect x="40" y="30" width="8" height="8" rx="2" fill="#6e4b12"/>
        <rect x="20" y="40" width="8" height="8" rx="2" fill="#6e4b12"/>
        <rect x="30" y="40" width="8" height="8" rx="2" fill="#6e4b12"/>
        <rect x="40" y="40" width="8" height="8" rx="2" fill="#6e4b12"/>
      </svg>`,
    settings: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <circle cx="32" cy="32" r="10" fill="#c9d3ff"/>
        <path d="M32 10l4 6h8l2 7-6 4v10l6 4-2 7h-8l-4 6-4-6h-8l-2-7 6-4V27l-6-4 2-7h8z" fill="#6e7bd9"/>
        <circle cx="32" cy="32" r="5" fill="#2e356e"/>
      </svg>`,
    diagnostics: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="16" width="40" height="32" rx="8" fill="#b4ffd9"/>
        <path d="M16 34h8l4-8 6 12 4-6h10" stroke="#2f7a5d" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    paint: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <path d="M20 14c10-8 28 0 28 16 0 6-3 10-9 10h-6l-6 10-8-4 6-10h-2c-6 0-10-4-10-10 0-5 3-9 7-12z" fill="#ffd27a"/>
        <circle cx="26" cy="24" r="3" fill="#ff7aa2"/>
        <circle cx="34" cy="22" r="3" fill="#7bd5ff"/>
        <circle cx="38" cy="30" r="3" fill="#9be58a"/>
        <path d="M40 44l10 10" stroke="#8a5a14" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
    musicplayer: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <defs>
          <linearGradient id="mpg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#7bd5ff"/>
            <stop offset="1" stop-color="#ff7aa2"/>
          </linearGradient>
        </defs>
        <rect x="10" y="8" width="44" height="48" rx="12" fill="#1b2a40"/>
        <rect x="14" y="12" width="36" height="22" rx="8" fill="#0f1622"/>
        <rect x="18" y="18" width="28" height="4" rx="2" fill="url(#mpg)"/>
        <rect x="18" y="26" width="20" height="3" rx="1.5" fill="#7bd5ff" opacity="0.7"/>
        <circle cx="24" cy="44" r="7" fill="#0f1622"/>
        <circle cx="24" cy="44" r="4" fill="url(#mpg)"/>
        <circle cx="40" cy="44" r="7" fill="#0f1622"/>
        <circle cx="40" cy="44" r="4" fill="url(#mpg)"/>
        <rect x="30" y="38" width="4" height="14" rx="2" fill="#ffd166"/>
      </svg>`,
    pong: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="14" width="40" height="36" rx="10" fill="#1b2a40"/>
        <rect x="16" y="24" width="6" height="16" rx="3" fill="#ffb347"/>
        <rect x="42" y="24" width="6" height="16" rx="3" fill="#7bd5ff"/>
        <circle cx="32" cy="32" r="4" fill="#ffd166"/>
        <rect x="30" y="18" width="4" height="28" rx="2" fill="#2e3a4a"/>
      </svg>`,
    minesweeper: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="12" width="40" height="40" rx="8" fill="#263245"/>
        <rect x="18" y="18" width="10" height="10" rx="2" fill="#7bd5ff"/>
        <rect x="36" y="18" width="10" height="10" rx="2" fill="#9be58a"/>
        <rect x="18" y="36" width="10" height="10" rx="2" fill="#ffd166"/>
        <circle cx="41" cy="41" r="5" fill="#ff6f91"/>
        <path d="M41 36v10M36 41h10" stroke="#1b2a40" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    frogger: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="10" y="10" width="44" height="44" rx="12" fill="#1b2a40"/>
        <circle cx="32" cy="34" r="12" fill="#6ef0c4"/>
        <circle cx="22" cy="24" r="5" fill="#6ef0c4"/>
        <circle cx="42" cy="24" r="5" fill="#6ef0c4"/>
        <circle cx="22" cy="24" r="2" fill="#1b2a40"/>
        <circle cx="42" cy="24" r="2" fill="#1b2a40"/>
        <path d="M24 38c4 4 12 4 16 0" stroke="#1b2a40" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`,
    pinball: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="14" y="6" width="36" height="52" rx="14" fill="#6aa7ff"/>
        <rect x="18" y="10" width="28" height="44" rx="12" fill="#1b2a40"/>
        <circle cx="32" cy="26" r="6" fill="#ffd166"/>
        <circle cx="24" cy="18" r="3" fill="#ff7aa2"/>
        <circle cx="40" cy="18" r="3" fill="#7bd5ff"/>
        <path d="M22 46l10-8 10 8" stroke="#ff6f91" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`,
    racecar: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="18" y="8" width="28" height="48" rx="10" fill="#1b2a40"/>
        <rect x="22" y="12" width="20" height="40" rx="8" fill="#2e3a4a"/>
        <rect x="24" y="18" width="16" height="10" rx="3" fill="#7bd5ff"/>
        <rect x="24" y="34" width="16" height="12" rx="3" fill="#ff6f91"/>
        <rect x="16" y="18" width="4" height="10" rx="2" fill="#c7d4e2"/>
        <rect x="44" y="18" width="4" height="10" rx="2" fill="#c7d4e2"/>
        <rect x="16" y="38" width="4" height="10" rx="2" fill="#c7d4e2"/>
        <rect x="44" y="38" width="4" height="10" rx="2" fill="#c7d4e2"/>
      </svg>`,
    chess: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="14" y="10" width="36" height="44" rx="12" fill="#1b2a40"/>
        <path d="M24 46h16l-2-10-6-6-6 6z" fill="#ffd166"/>
        <path d="M28 18h8l-2 6h4l-6 8-6-8h4z" fill="#7bd5ff"/>
        <rect x="22" y="48" width="20" height="4" rx="2" fill="#2e3a4a"/>
      </svg>`,
    checkers: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="12" width="40" height="40" rx="10" fill="#1b2a40"/>
        <circle cx="26" cy="26" r="8" fill="#ff7aa2"/>
        <circle cx="38" cy="38" r="8" fill="#7bd5ff"/>
        <circle cx="26" cy="26" r="3" fill="#1b2a40"/>
        <circle cx="38" cy="38" r="3" fill="#1b2a40"/>
      </svg>`,
    connect4: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="10" y="14" width="44" height="36" rx="8" fill="#1b2a40"/>
        <circle cx="22" cy="28" r="6" fill="#ff6f91"/>
        <circle cx="32" cy="28" r="6" fill="#ffd166"/>
        <circle cx="42" cy="28" r="6" fill="#7bd5ff"/>
        <circle cx="22" cy="40" r="6" fill="#ffd166"/>
        <circle cx="32" cy="40" r="6" fill="#ff6f91"/>
        <circle cx="42" cy="40" r="6" fill="#6ef0c4"/>
      </svg>`,
    snake: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="12" width="40" height="40" rx="10" fill="#1b2a40"/>
        <path d="M22 36c0-8 10-8 10-16" stroke="#6ef0c4" stroke-width="6" stroke-linecap="round" fill="none"/>
        <circle cx="34" cy="20" r="4" fill="#ff6f91"/>
      </svg>`,
    asteroids: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="12" width="40" height="40" rx="10" fill="#1b2a40"/>
        <path d="M24 18l8-4 10 6 4 10-6 8-12 2-8-10z" fill="#7bd5ff"/>
        <path d="M32 20l6 10-6 8-6-8z" fill="#ffd166"/>
        <circle cx="32" cy="30" r="2" fill="#ff6f91"/>
      </svg>`,
    spaceinvaders: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="12" width="40" height="40" rx="10" fill="#1b2a40"/>
        <rect x="22" y="22" width="20" height="12" rx="3" fill="#6ef0c4"/>
        <rect x="20" y="36" width="24" height="6" rx="3" fill="#7bd5ff"/>
      </svg>`,
    spacefighter: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="12" width="40" height="40" rx="10" fill="#1b2a40"/>
        <path d="M32 16l10 20-10 12-10-12z" fill="#ffd166"/>
        <circle cx="32" cy="34" r="4" fill="#ff6f91"/>
      </svg>`,
    window: `
      <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="12" y="14" width="40" height="36" rx="6" fill="#d8dee6"/>
        <rect x="12" y="14" width="40" height="8" rx="6" fill="#8892a6"/>
      </svg>`,
  };

  return svgMap[icon] || svgMap.window;
}

function restoreWindow(windowNode, options = {}) {
  if (!windowNode.classList.contains("minimized")) {
    windowNode.style.zIndex = String(state.zIndex++);
    if (windowNode.dataset.appId) {
      setActiveApp(windowNode.dataset.appId);
    }
    updateTaskWindow(windowNode);
    return;
  }
  const tray = document.getElementById("dock-minimized");
  const trayButton = tray?.querySelector(`button[data-window-id='${windowNode.dataset.windowId}']`);
  if (!trayButton) {
    windowNode.classList.remove("minimized");
    windowNode.style.zIndex = String(state.zIndex++);
    if (windowNode.dataset.appId) {
      setActiveApp(windowNode.dataset.appId);
    }
    updateTaskWindow(windowNode);
    return;
  }
  windowNode.classList.remove("minimized");
  if (options.skipAnimation) {
    trayButton.remove();
    windowNode.style.zIndex = String(state.zIndex++);
    if (windowNode.dataset.appId) {
      setActiveApp(windowNode.dataset.appId);
    }
    updateTaskWindow(windowNode);
    return;
  }
  animateDockToWindow(windowNode, trayButton, () => {
    trayButton.remove();
    windowNode.style.zIndex = String(state.zIndex++);
    if (windowNode.dataset.appId) {
      setActiveApp(windowNode.dataset.appId);
    }
    updateTaskWindow(windowNode);
  });
}

function createMinimizedTrayItem(windowNode) {
  const tray = document.getElementById("dock-minimized");
  const trayButton = document.createElement("button");
  trayButton.dataset.windowId = windowNode.dataset.windowId || "";
  const windowTitle = windowNode.querySelector(".window-title")?.textContent || "Window";
  trayButton.title = windowTitle;
  const icon = document.createElement("div");
  icon.className = "dock-min-icon";
  icon.innerHTML = getWindowIconSvg(windowNode.dataset.windowId, windowTitle);
  const label = document.createElement("div");
  label.className = "dock-min-label";
  label.textContent = windowTitle;
  trayButton.appendChild(icon);
  trayButton.appendChild(label);
  trayButton.addEventListener("click", () => restoreWindow(windowNode));
  tray?.appendChild(trayButton);
  return trayButton;
}

function animateWindowToDock(windowNode, trayButton, onDone) {
  const windowRect = windowNode.getBoundingClientRect();
  const trayRect = trayButton.getBoundingClientRect();
  const targetX = trayRect.left + trayRect.width / 2;
  const targetY = trayRect.top + trayRect.height / 2;
  const startX = windowRect.left + windowRect.width / 2;
  const startY = windowRect.top + windowRect.height / 2;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const scale = Math.max(0.1, trayRect.width / windowRect.width);

  windowNode.style.transformOrigin = "center center";
  const animation = windowNode.animate(
    [
      { transform: "translate(0, 0) scale(1)" },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
    ],
    { duration: 320, easing: "cubic-bezier(0.25, 0.8, 0.2, 1)" }
  );
  animation.addEventListener("finish", () => {
    windowNode.style.transform = "";
    onDone?.();
  });
}

function animateDockToWindow(windowNode, trayButton, onDone) {
  const windowRect = windowNode.getBoundingClientRect();
  const trayRect = trayButton.getBoundingClientRect();
  const startX = trayRect.left + trayRect.width / 2;
  const startY = trayRect.top + trayRect.height / 2;
  const targetX = windowRect.left + windowRect.width / 2;
  const targetY = windowRect.top + windowRect.height / 2;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const scale = Math.max(0.1, trayRect.width / windowRect.width);

  windowNode.style.transformOrigin = "center center";
  const animation = windowNode.animate(
    [
      { transform: `translate(${-dx}px, ${-dy}px) scale(${scale})` },
      { transform: "translate(0, 0) scale(1)" },
    ],
    { duration: 320, easing: "cubic-bezier(0.25, 0.8, 0.2, 1)" }
  );
  animation.addEventListener("finish", () => {
    windowNode.style.transform = "";
    onDone?.();
  });
}

function persistWindowPosition(windowNode) {
  const id = windowNode.dataset.windowId;
  if (!id) return;
  state.windowState[id] = {
    left: parseFloat(windowNode.style.left || "0"),
    top: parseFloat(windowNode.style.top || "0"),
    width: parseFloat(windowNode.style.width || "0"),
    height: parseFloat(windowNode.style.height || "0"),
  };
  saveWindowState();
}

function restoreSession() {
  if (!state.session.windows.length) return;
  state.session.windows.forEach((entry) => {
    if (!entry.meta) return;
    if (entry.meta.type === "app") {
      openApp(entry.meta.appId, { minimized: entry.minimized });
    } else if (entry.meta.type === "category") {
      openCategoryWindow(entry.meta.category, { minimized: entry.minimized });
    } else if (entry.meta.type === "file-browser") {
      openFileBrowser({ minimized: entry.minimized });
    } else if (entry.meta.type === "trash") {
      openTrashWindow({ minimized: entry.minimized });
    }
  });
}

function buildFileBrowser() {
  const content = document.createElement("div");
  const bar = document.createElement("div");
  bar.className = "fs-bar";

  const backBtn = document.createElement("button");
  backBtn.className = "menu-button";
  backBtn.textContent = "Back";

  const pathLabel = document.createElement("div");
  pathLabel.className = "fs-path";

  bar.appendChild(backBtn);
  bar.appendChild(pathLabel);

  const canvas = document.createElement("div");
  canvas.className = "icon-canvas";

  content.appendChild(bar);
  content.appendChild(canvas);

  const root = buildVirtualFS();
  let current = root;
  const history = [];

  const render = () => {
    pathLabel.textContent = `/${current.path.join("/") || ""}`;
    const items = current.children.map((node) => ({
      id: node.type === "folder" ? `folder-${node.name}` : `app-${node.appId}`,
      label: node.name,
      iconSvg: node.type === "folder" ? getFolderIconSvg() : getAppIconSvg(getAllApps().find((app) => app.id === node.appId)),
      onOpen: () => {
        if (node.type === "folder") {
          history.push(current);
          current = node;
          render();
        } else if (node.type === "app") {
          openApp(node.appId);
        }
      },
      meta: node.type === "folder" ? { type: "folder", name: node.name } : { type: "app", appId: node.appId },
    }));
    renderIconCanvas(canvas, items, `file-browser/${current.path.join("/") || "root"}`);
  };

  backBtn.addEventListener("click", () => {
    if (history.length === 0) return;
    current = history.pop();
    render();
  });

  render();
  return content;
}

function buildCategoryContent(category, apps) {
  return buildIconCanvas(
    apps.map((app) => ({
      id: app.id,
      label: app.title,
      iconSvg: getAppIconSvg(app),
      onOpen: () => openApp(app.id),
      meta: { type: "app", appId: app.id },
    })),
    `category-${category}`
  );
}

function refreshCategoryWindow(windowNode, category) {
  const apps = getAllApps().filter((app) => app.category === category);
  const body = windowNode.querySelector(".window-body");
  if (!body) return;
  body.innerHTML = "";
  body.appendChild(buildCategoryContent(category, apps));
}

function refreshFileBrowser(windowNode) {
  const body = windowNode.querySelector(".window-body");
  if (!body) return;
  body.innerHTML = "";
  body.appendChild(buildFileBrowser());
}

function buildVirtualFS() {
  const root = {
    name: "",
    type: "folder",
    path: [],
    children: [],
  };

  const categories = [
    { key: "applications", label: "Applications" },
    { key: "games", label: "Games" },
    { key: "utilities", label: "Utilities" },
  ];

  categories.forEach((category) => {
    const folder = {
      name: category.label,
      type: "folder",
      path: [...root.path, category.label],
      children: [],
    };

    const apps = getAllApps().filter((app) => app.category === category.key);
    apps.forEach((app) => {
      folder.children.push({
        name: app.title,
        type: "app",
        appId: app.id,
      });
    });

    root.children.push(folder);
  });

  return root;
}

function buildIconCanvas(items, windowId) {
  const canvas = document.createElement("div");
  canvas.className = "icon-canvas";
  renderIconCanvas(canvas, items, windowId);
  return canvas;
}

function renderIconCanvas(canvas, items, windowId) {
  canvas.innerHTML = "";
  canvas.style.position = "relative";
  canvas.dataset.canvasId = windowId;
  const positions = state.iconPositions[windowId] || {};
  const defaultPositions = layoutGrid(items.length);

  const selection = state.iconSelections[windowId] || new Set();
  state.iconSelections[windowId] = selection;

  items.forEach((item, index) => {
    const icon = document.createElement("div");
    icon.className = "icon-item";
    icon.dataset.itemId = item.id;
    const position = positions[item.id] || defaultPositions[index];
    icon.style.left = `${position.x}px`;
    icon.style.top = `${position.y}px`;

    const glyph = document.createElement("div");
    glyph.className = "icon-glyph";
    glyph.innerHTML = item.iconSvg || getWindowIconSvg("", item.label);
    const label = document.createElement("div");
    label.className = "icon-label";
    label.textContent = item.label;

    icon.appendChild(glyph);
    icon.appendChild(label);

    icon.addEventListener("click", (event) => {
      event.stopPropagation();
      setActiveCanvas(windowId);
      if (icon.dataset.dragging === "1") return;
      if (!event.shiftKey) {
        selection.clear();
      }
      selection.add(item.id);
      updateSelectionStyles(canvas, selection);
    });
    icon.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      item.onOpen?.();
    });
    icon.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      setActiveCanvas(windowId);
      selection.clear();
      selection.add(item.id);
      updateSelectionStyles(canvas, selection);
      openContextMenu(event.clientX, event.clientY, item);
    });

    makeIconDraggable(icon, windowId);
    canvas.appendChild(icon);
  });

  updateSelectionStyles(canvas, selection);
  setupDragSelection(canvas, items, windowId);
}


function layoutGrid(count) {
  const positions = [];
  const cols = 4;
  const gapX = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--icon-gap-x")) || 150;
  const gapY = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--icon-gap-y")) || 140;
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({ x: 20 + col * gapX, y: 20 + row * gapY });
  }
  return positions;
}

function makeIconDraggable(icon, windowId) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let moved = false;

  icon.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    moved = false;
    icon.dataset.dragging = "1";
    setActiveCanvas(windowId);
    const rect = icon.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    icon.style.zIndex = "5";
  });

  document.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const parentRect = icon.parentElement.getBoundingClientRect();
    const nextLeft = event.clientX - parentRect.left - offsetX;
    const nextTop = event.clientY - parentRect.top - offsetY;
    if (Math.abs(nextLeft - parseFloat(icon.style.left || "0")) > 3 || Math.abs(nextTop - parseFloat(icon.style.top || "0")) > 3) {
      moved = true;
    }
    icon.style.left = `${nextLeft}px`;
    icon.style.top = `${nextTop}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    icon.style.zIndex = "";
    icon.dataset.dragging = moved ? "1" : "0";
    const left = parseFloat(icon.style.left || "0");
    const top = parseFloat(icon.style.top || "0");
    state.iconPositions[windowId] = state.iconPositions[windowId] || {};
    state.iconPositions[windowId][icon.dataset.itemId] = { x: left, y: top };
    saveIconPositions();
  });
}

function setupContextMenu() {
  const menu = document.getElementById("context-menu");
  document.addEventListener("click", () => {
    menu?.classList.remove("open");
  });
}

document.addEventListener("click", (event) => {
  const windowsRoot = document.getElementById("windows");
  if (!windowsRoot) return;
  if (event.target === windowsRoot || event.target.classList.contains("windows")) {
    setActiveApp(null);
  }
});

function setupKeyboardNavigation() {
  document.addEventListener("keydown", (event) => {
    if (!state.activeCanvasId) return;
    const canvas = document.querySelector(`[data-canvas-id='${state.activeCanvasId}']`);
    if (!canvas) return;
    const selection = state.iconSelections[state.activeCanvasId];
    if (!selection) return;

    const icons = Array.from(canvas.querySelectorAll(".icon-item"));
    if (icons.length === 0) return;

    const currentId = selection.values().next().value || icons[0].dataset.itemId;
    const currentIcon = icons.find((icon) => icon.dataset.itemId === currentId) || icons[0];

    if (event.key === "Enter") {
      currentIcon.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      return;
    }

    const direction = event.key;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(direction)) return;
    event.preventDefault();

    const currentRect = currentIcon.getBoundingClientRect();
    let best = null;
    let bestScore = Infinity;

    icons.forEach((icon) => {
      if (icon === currentIcon) return;
      const rect = icon.getBoundingClientRect();
      const dx = rect.left - currentRect.left;
      const dy = rect.top - currentRect.top;
      if (direction === "ArrowLeft" && dx >= 0) return;
      if (direction === "ArrowRight" && dx <= 0) return;
      if (direction === "ArrowUp" && dy >= 0) return;
      if (direction === "ArrowDown" && dy <= 0) return;
      const score = Math.hypot(dx, dy);
      if (score < bestScore) {
        bestScore = score;
        best = icon;
      }
    });

    if (best) {
      selection.clear();
      selection.add(best.dataset.itemId);
      updateSelectionStyles(canvas, selection);
    }
  });
}

function setupDragSelection(canvas, items, windowId) {
  let selecting = false;
  let startX = 0;
  let startY = 0;
  let rectNode = null;

  canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (event.target !== canvas) return;
    selecting = true;
    setActiveCanvas(windowId);
    startX = event.clientX;
    startY = event.clientY;
    rectNode = document.createElement("div");
    rectNode.className = "selection-rect";
    canvas.appendChild(rectNode);
  });

  document.addEventListener("mousemove", (event) => {
    if (!selecting || !rectNode) return;
    const canvasRect = canvas.getBoundingClientRect();
    const x1 = Math.min(startX, event.clientX) - canvasRect.left;
    const y1 = Math.min(startY, event.clientY) - canvasRect.top;
    const x2 = Math.max(startX, event.clientX) - canvasRect.left;
    const y2 = Math.max(startY, event.clientY) - canvasRect.top;
    rectNode.style.left = `${x1}px`;
    rectNode.style.top = `${y1}px`;
    rectNode.style.width = `${x2 - x1}px`;
    rectNode.style.height = `${y2 - y1}px`;

    const selection = state.iconSelections[windowId] || new Set();
    selection.clear();
    Array.from(canvas.querySelectorAll(".icon-item")).forEach((icon) => {
      const rect = icon.getBoundingClientRect();
      const intersects =
        rect.right > canvasRect.left + x1 &&
        rect.left < canvasRect.left + x2 &&
        rect.bottom > canvasRect.top + y1 &&
        rect.top < canvasRect.top + y2;
      if (intersects) {
        selection.add(icon.dataset.itemId);
      }
    });
    updateSelectionStyles(canvas, selection);
  });

  document.addEventListener("mouseup", () => {
    if (!selecting) return;
    selecting = false;
    rectNode?.remove();
    rectNode = null;
  });
}

function updateSelectionStyles(canvas, selection) {
  Array.from(canvas.querySelectorAll(".icon-item")).forEach((icon) => {
    if (selection.has(icon.dataset.itemId)) {
      icon.classList.add("selected");
    } else {
      icon.classList.remove("selected");
    }
  });
}

function setActiveCanvas(canvasId) {
  state.activeCanvasId = canvasId;
}

function openContextMenu(x, y, item) {
  const menu = document.getElementById("context-menu");
  if (!menu) return;
  menu.innerHTML = "";
  const addAlias = document.createElement("button");
  addAlias.textContent = "Add Alias to Desktop";
  addAlias.addEventListener("click", () => {
    addDesktopAlias(item);
    menu.classList.remove("open");
  });

  const getInfo = document.createElement("button");
  getInfo.textContent = "Get Info";
  getInfo.addEventListener("click", () => {
    openInfoWindow(item);
    menu.classList.remove("open");
  });

  menu.appendChild(addAlias);
  menu.appendChild(getInfo);
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
}

function addDesktopAlias(item) {
  const existing = state.desktopAliases.find((alias) => alias.id === item.id);
  if (existing) return;
  state.desktopAliases.push({
    id: item.id,
    label: item.label,
    iconSvg: item.iconSvg,
    meta: item.meta,
  });
  saveDesktopAliases();
  renderDesktopAliases();
}

function renderDesktopAliases() {
  const desktop = document.getElementById("desktop-icons");
  if (!desktop) return;
  desktop.innerHTML = "";
  const items = state.desktopAliases.map((alias) => ({
    id: alias.id,
    label: alias.label,
    iconSvg: alias.iconSvg,
    onOpen: () => openByMeta(alias.meta),
    meta: alias.meta,
  }));
  renderIconCanvas(desktop, items, "desktop");
}

function openByMeta(meta) {
  if (!meta) return;
  if (meta.type === "app") openApp(meta.appId);
  if (meta.type === "category") openCategoryWindow(meta.category);
  if (meta.type === "file-browser") openFileBrowser();
}

async function openInfoWindow(item) {
  const existing = document.querySelector(`.window[data-window-id='info-${item.id}']`);
  if (existing) {
    restoreWindow(existing);
    return;
  }

  const content = document.createElement("div");
  const list = document.createElement("div");
  list.className = "window-list";

  const details = await getItemInfo(item);
  Object.entries(details).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "app-card";
    const name = document.createElement("h4");
    name.textContent = key;
    const val = document.createElement("p");
    val.textContent = value;
    row.appendChild(name);
    row.appendChild(val);
    list.appendChild(row);
  });

  content.appendChild(list);
  createWindow({
    id: `info-${item.id}`,
    meta: { type: "info", target: item.id },
    title: `${item.label} Info`,
    width: 360,
    height: 300,
    content,
  });
}

async function getItemInfo(item) {
  const info = {
    Name: item.label,
    Type: item.meta?.type || "Unknown",
  };

  if (item.meta?.type === "app") {
    const app = getAllApps().find((app) => app.id === item.meta.appId);
    if (app) {
      info.Category = app.category;
      info.Module = app.module;
      try {
        const response = await fetch(normalizeModulePath(app.module));
        const text = await response.text();
        info["Lines of Code"] = String(text.split("\n").length);
        info["Bytes"] = String(text.length);
      } catch (err) {
        info["Lines of Code"] = "Unavailable";
      }
    }
  }

  return info;
}

function getFolderIconSvg() {
  return getWindowIconSvg("file-browser", "Folder");
}

function getAppIconSvg(app) {
  if (!app) return getWindowIconSvg("", "App");
  const key = `app-${app.id}`;
  return getWindowIconSvg(key, app.title);
}
