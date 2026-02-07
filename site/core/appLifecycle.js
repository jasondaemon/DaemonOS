import { resourceTracker } from "./resourceTracker.js";
import { BACKGROUND_FPS, MAX_STEP_HZ } from "./systemMonitorConfig.js";

const apps = new Map();
let focusedAppId = null;

const ensureApp = (appId) => {
  if (!apps.has(appId)) {
    apps.set(appId, {
      appId,
      title: appId,
      status: "running",
      loops: new Set(),
      hooks: {},
      windowNode: null,
    });
  }
  return apps.get(appId);
};

export function registerApp(appId, info = {}) {
  const entry = ensureApp(appId);
  entry.title = info.title || entry.title;
  entry.windowNode = info.windowNode || entry.windowNode;
  entry.hooks = info.hooks || entry.hooks;
  entry.status = entry.status || "running";
  applyFocusThrottling();
}

export function unregisterApp(appId) {
  const entry = apps.get(appId);
  if (entry) {
    entry.loops.forEach((loop) => loop.stop());
  }
  apps.delete(appId);
  resourceTracker.clearApp(appId);
}

export function setFocusedApp(appId) {
  focusedAppId = appId || null;
  applyFocusThrottling();
}

export function getFocusedApp() {
  return focusedAppId;
}

export function getAppList() {
  return Array.from(apps.values()).map((entry) => ({
    appId: entry.appId,
    title: entry.title,
    status: entry.status,
    windowNode: entry.windowNode,
  }));
}

export function getAppStats() {
  let running = 0;
  let suspended = 0;
  apps.forEach((entry) => {
    if (entry.status === "suspended") suspended += 1;
    else running += 1;
  });
  return { running, suspended, total: running + suspended };
}

function applyFocusThrottling() {
  apps.forEach((entry) => {
    entry.loops.forEach((loop) => {
      if (entry.status === "suspended") return;
      if (!focusedAppId || entry.appId !== focusedAppId) {
        loop.setTargetFps(BACKGROUND_FPS);
      } else {
        loop.setTargetFps(MAX_STEP_HZ);
      }
    });
  });
}

export function suspendApp(appId) {
  const entry = apps.get(appId);
  if (!entry) return;
  entry.status = "suspended";
  entry.loops.forEach((loop) => loop.suspend());
  entry.hooks?.onSuspend?.();
}

export function resumeApp(appId) {
  const entry = apps.get(appId);
  if (!entry) return;
  entry.status = "running";
  entry.loops.forEach((loop) => loop.resume());
  entry.hooks?.onResume?.();
  applyFocusThrottling();
}

export function suspendBackgroundApps() {
  apps.forEach((entry) => {
    if (focusedAppId && entry.appId === focusedAppId) return;
    suspendApp(entry.appId);
  });
}

export function freeOptionalCaches() {
  apps.forEach((entry) => entry.hooks?.freeOptionalCaches?.());
}

export function createLoop(appId, { step, render, isActive } = {}) {
  const entry = ensureApp(appId);
  let running = false;
  let suspended = false;
  let rafId = null;
  let lastTime = 0;
  let accumulator = 0;
  let targetFps = MAX_STEP_HZ;

  const tick = (time) => {
    if (!running) return;
    if (typeof isActive === "function" && !isActive()) {
      stop();
      return;
    }
    if (!lastTime) lastTime = time;
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    if (!suspended) {
      const stepInterval = 1 / targetFps;
      accumulator += delta;
      let steps = 0;
      let shouldRender = false;
      if (!step && accumulator >= stepInterval) {
        accumulator = 0;
        shouldRender = true;
      } else {
        while (accumulator >= stepInterval && steps < 5) {
          step?.(stepInterval);
          accumulator -= stepInterval;
          steps += 1;
          shouldRender = true;
        }
      }
      if (shouldRender) render?.();
    }

    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (running) return;
    running = true;
    suspended = false;
    lastTime = 0;
    accumulator = 0;
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  };

  const suspend = () => {
    suspended = true;
  };

  const resume = () => {
    suspended = false;
    lastTime = 0;
  };

  const setTargetFps = (fps) => {
    targetFps = Math.max(5, fps || MAX_STEP_HZ);
  };

  const controller = { start, stop, suspend, resume, setTargetFps };
  entry.loops.add(controller);
  applyFocusThrottling();
  return controller;
}
