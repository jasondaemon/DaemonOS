import { resourceTracker } from "./resourceTracker.js";
import { perfMonitor } from "./perfMonitor.js";
import { getAppList, suspendApp, resumeApp, suspendBackgroundApps, freeOptionalCaches } from "./appLifecycle.js";
import { DEFAULT_BUDGET_MB, DEVICE_MEMORY_FRACTION, UPDATE_HZ, PRESSURE_THRESHOLDS } from "./systemMonitorConfig.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const getBudgetBytes = () => {
  if (navigator.deviceMemory) {
    return navigator.deviceMemory * DEVICE_MEMORY_FRACTION * 1024 * 1024 * 1024;
  }
  return DEFAULT_BUDGET_MB * 1024 * 1024;
};

export function initSystemMonitor({ focusApp, closeApp }) {
  const widget = document.getElementById("system-monitor-widget");
  const panel = document.getElementById("system-monitor-panel");
  if (!widget || !panel) return;

  let lastPressureAction = 0;

  const togglePanel = () => {
    const isOpen = panel.classList.toggle("open");
    widget.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      const rect = widget.getBoundingClientRect();
      panel.style.left = `${Math.max(12, rect.left)}px`;
      panel.style.right = "auto";
    }
  };

  widget.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePanel();
  });

  document.addEventListener("click", (event) => {
    if (!panel.contains(event.target) && !widget.contains(event.target)) {
      panel.classList.remove("open");
      widget.setAttribute("aria-expanded", "false");
    }
  });

  const render = () => {
    const totals = resourceTracker.getTotals();
    const budget = getBudgetBytes();
    const percent = clamp((totals.totalBytes / budget) * 100, 0, 100);
    const memoryLabel = percent >= 75 ? "High" : percent >= 50 ? "Med" : "Low";
    const pressure = perfMonitor.getStats();
    const pressureScore = pressure.pressureScore;
    const pressureLabel = pressureScore >= PRESSURE_THRESHOLDS.high ? "High" : pressureScore >= PRESSURE_THRESHOLDS.low ? "Med" : "Low";
    const apps = getAppList();
    const appCount = apps.length;

    widget.textContent = `Memory ${Math.round(percent)}% (${memoryLabel}) · Apps ${appCount} · FPS ${pressure.fps}`;

    if (!panel.classList.contains("open")) return;

    const heapRow = pressure.heapUsed && pressure.heapLimit
      ? `<div class="monitor-row"><span>JS Heap</span><span>${formatBytes(pressure.heapUsed)} / ${formatBytes(pressure.heapLimit)}</span></div>`
      : "";

    const deviceMemory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Unknown";

    const warning = pressureScore >= PRESSURE_THRESHOLDS.high
      ? "High pressure detected. Consider suspending background apps."
      : pressureScore >= PRESSURE_THRESHOLDS.low
        ? "Moderate pressure. Close heavy apps if things feel sluggish."
        : "System pressure is low.";

    const appRows = apps.map((app) => {
      const tracked = totals.byApp[app.appId]?.totalBytes || 0;
      const statusLabel = app.status === "suspended" ? "Suspended" : "Running";
      const actionLabel = app.status === "suspended" ? "Resume" : "Suspend";
      return `
        <div class="monitor-app" data-app-id="${app.appId}">
          <div class="monitor-app-info">
            <div class="monitor-app-title">${app.title}</div>
            <div class="monitor-app-meta">${statusLabel} · ${formatBytes(tracked)}</div>
          </div>
          <div class="monitor-app-actions">
            <button data-action="focus">Focus</button>
            <button data-action="toggle">${actionLabel}</button>
            <button data-action="close">Close</button>
          </div>
        </div>
      `;
    }).join("");

    panel.innerHTML = `
      <div class="monitor-section">
        <div class="monitor-title">DaemonOS Tracked Memory</div>
        <div class="monitor-row"><span>Tracked</span><span>${formatBytes(totals.totalBytes)}</span></div>
        <div class="monitor-row"><span>Budget</span><span>${formatBytes(budget)}</span></div>
        ${heapRow}
        <div class="monitor-row"><span>Device Memory</span><span>${deviceMemory}</span></div>
      </div>
      <div class="monitor-section">
        <div class="monitor-title">Pressure</div>
        <div class="monitor-pressure" data-level="${pressureLabel.toLowerCase()}">
          <div class="monitor-pressure-bar" style="width: ${pressureScore}%"></div>
          <div class="monitor-pressure-label">${pressureLabel} (${pressureScore})</div>
        </div>
        <div class="monitor-warning">${warning}</div>
        <button class="monitor-action" data-action="suspend-background">Suspend Background Apps</button>
      </div>
      <div class="monitor-section">
        <div class="monitor-title">Apps</div>
        ${appRows || '<div class="menu-hint">No running apps.</div>'}
      </div>
    `;

    panel.querySelectorAll(".monitor-app").forEach((row) => {
      const appId = row.getAttribute("data-app-id");
      row.querySelector("[data-action='focus']")?.addEventListener("click", () => focusApp(appId));
      row.querySelector("[data-action='toggle']")?.addEventListener("click", () => {
        const appInfo = apps.find((entry) => entry.appId === appId);
        if (appInfo?.status === "suspended") resumeApp(appId);
        else suspendApp(appId);
        render();
      });
      row.querySelector("[data-action='close']")?.addEventListener("click", () => closeApp(appId));
    });

    panel.querySelector("[data-action='suspend-background']")?.addEventListener("click", () => suspendBackgroundApps());

    if (pressureScore >= PRESSURE_THRESHOLDS.high && Date.now() - lastPressureAction > 6000) {
      freeOptionalCaches();
      lastPressureAction = Date.now();
    }
  };

  render();
  setInterval(render, 1000 / UPDATE_HZ);
}
