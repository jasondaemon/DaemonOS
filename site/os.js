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
  },
  openApps: new Set(),
};

const wallpaperOptions = [
  { id: "aurora", label: "Aurora", css: "radial-gradient(circle at 20% 20%, #2c5f7c, #0f2333 60%, #0a1119 100%)" },
  { id: "ember", label: "Ember", css: "radial-gradient(circle at 20% 20%, #6c2b1f, #2a120e 60%, #0b0908 100%)" },
  { id: "neon", label: "Neon", css: "radial-gradient(circle at 30% 10%, #1d405f, #0c1a28 50%, #060a10 100%)" },
  { id: "slate", label: "Slate", css: "radial-gradient(circle at 20% 30%, #354154, #151b25 60%, #0a0f16 100%)" },
];

const dockItems = [
  { id: "file-browser", label: "Files", iconClass: "dock-glyph--file", action: () => openFileBrowser() },
  { id: "applications", label: "Applications", iconClass: "dock-glyph--apps", action: () => openCategoryWindow("applications") },
  { id: "games", label: "Games", iconClass: "dock-glyph--games", action: () => openCategoryWindow("games") },
  { id: "utilities", label: "Utilities", iconClass: "dock-glyph--utilities", action: () => openCategoryWindow("utilities") },
];

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
  setupMenu();
  setupDock();
  setupClock();
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
  const iconSize = document.getElementById("icon-size");
  if (iconSize) iconSize.value = String(state.settings.iconSize);
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

function setupMenu() {
  const bananaMenu = document.getElementById("banana-menu");
  const daemonosMenu = document.getElementById("menu-daemonos");
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

  const taskSwitcher = document.getElementById("task-switcher");
  if (taskSwitcher) {
    taskSwitcher.classList.remove("open");
  }

  document.addEventListener("click", (event) => {
    if (
      !event.target.closest(".menu-dropdown") &&
      !event.target.closest(".menu-app-button") &&
      !event.target.closest("#menu-daemonos")
    ) {
      closeAllMenuDropdowns();
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
    button.addEventListener("click", () => item.action());

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

async function loadRegistry() {
  try {
    const response = await fetch("apps/registry.json", { cache: "no-store" });
    const data = await response.json();
    state.registry = data.apps || [];
    state.registryVersion = data.version || data.build || "";
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
  } catch (err) {
    console.error("Failed to open app", err);
  }
}

function createWindow({ id, title, width, height, content, minimized, meta }) {
  const windows = document.getElementById("windows");
  if (!windows) return null;

  const windowNode = document.createElement("section");
  windowNode.className = "window";
  if (id) windowNode.dataset.windowId = id;
  const saved = id ? state.windowState[id] : null;
  const startLeft = saved?.left ?? 80 + state.windows.length * 24;
  const startTop = saved?.top ?? 60 + state.windows.length * 18;
  const startWidth = saved?.width ?? width;
  const startHeight = saved?.height ?? height;
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
  renderMenuBar();
}

function getDefaultMenus(appName) {
  return [
    {
      title: appName,
      items: [
        { label: `About ${appName}`, disabled: true },
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
      if (item.disabled) entry.disabled = true;
      if (item.type === "checkbox") {
        const check = document.createElement("span");
        check.className = `menu-check ${item.checked ? "checked" : ""}`;
        entry.appendChild(check);
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

  desktopSection.appendChild(desktopTitle);
  desktopSection.appendChild(wallpaperLabel);
  desktopSection.appendChild(wallpaperOptions);
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

  dockSection.appendChild(dockTitle);
  dockSection.appendChild(dockSizeLabel);
  dockSection.appendChild(dockSize);
  dockSection.appendChild(dockZoomLabel);
  dockSection.appendChild(dockZoom);

  content.appendChild(desktopSection);
  content.appendChild(dockSection);

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
    if (key.includes("app-pong") || key.includes("app-minesweeper") || key.includes("app-frogger")) return "games";
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
