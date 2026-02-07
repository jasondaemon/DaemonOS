import { resourceTracker } from "./resourceTracker.js";
import { DEFAULT_BUDGET_MB, DEVICE_MEMORY_FRACTION } from "./systemMonitorConfig.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

class PerfMonitor {
  constructor() {
    this.running = false;
    this.lastFrame = 0;
    this.fps = 60;
    this.fpsSamples = [];
    this.fpsWindow = 30;
    this.longTaskMs = 0;
    this.longTaskObserver = null;
    this.heapUsed = null;
    this.heapLimit = null;
    this.allocationSpike = 0;
    this.lastAllocation = 0;
    this.lastBudget = this.getBudgetBytes();
    this.lastSampleTime = 0;

    resourceTracker.subscribe((totals) => {
      const delta = totals.totalBytes - this.lastAllocation;
      if (delta > 0) {
        const spike = clamp(delta / Math.max(1, this.lastBudget), 0, 1) * 100;
        this.allocationSpike = Math.max(this.allocationSpike, spike);
      }
      this.lastAllocation = totals.totalBytes;
    });
  }

  getBudgetBytes() {
    if (navigator.deviceMemory) {
      return navigator.deviceMemory * DEVICE_MEMORY_FRACTION * 1024 * 1024 * 1024;
    }
    return DEFAULT_BUDGET_MB * 1024 * 1024;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.lastSampleTime = this.lastFrame;
    this.trackLongTasks();
    this.sampleHeap();
    requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.longTaskObserver) this.longTaskObserver.disconnect();
  }

  tick = (time) => {
    if (!this.running) return;
    const delta = time - this.lastFrame;
    this.lastFrame = time;
    const fps = delta > 0 ? 1000 / delta : 60;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > this.fpsWindow) this.fpsSamples.shift();
    const sum = this.fpsSamples.reduce((acc, v) => acc + v, 0);
    this.fps = sum / this.fpsSamples.length;

    if (time - this.lastSampleTime > 1000) {
      this.sampleHeap();
      this.allocationSpike *= 0.6;
      this.longTaskMs *= 0.6;
      this.lastSampleTime = time;
    }

    requestAnimationFrame(this.tick);
  };

  trackLongTasks() {
    if (typeof PerformanceObserver === "undefined") return;
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const total = entries.reduce((sum, entry) => sum + entry.duration, 0);
        this.longTaskMs = Math.max(this.longTaskMs, total);
      });
      this.longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch {
      this.longTaskObserver = null;
    }
  }

  sampleHeap() {
    if (performance && performance.memory) {
      this.heapUsed = performance.memory.usedJSHeapSize;
      this.heapLimit = performance.memory.jsHeapSizeLimit;
    } else {
      this.heapUsed = null;
      this.heapLimit = null;
    }
  }

  getStats() {
    const fpsScore = clamp((60 - this.fps) / 60, 0, 1) * 100;
    const longTaskScore = clamp(this.longTaskMs / 120, 0, 1) * 100;
    const heapRatio = this.heapUsed && this.heapLimit ? this.heapUsed / this.heapLimit : null;
    const heapScore = heapRatio ? clamp((heapRatio - 0.4) / 0.6, 0, 1) * 100 : 0;
    const allocationScore = clamp(this.allocationSpike, 0, 100);
    const pressureScore = Math.round(
      fpsScore * 0.35 + longTaskScore * 0.25 + allocationScore * 0.2 + heapScore * 0.2,
    );

    return {
      fps: Math.round(this.fps),
      fpsRaw: this.fps,
      longTaskMs: Math.round(this.longTaskMs),
      heapUsed: this.heapUsed,
      heapLimit: this.heapLimit,
      heapRatio,
      allocationScore,
      pressureScore,
    };
  }
}

export const perfMonitor = new PerfMonitor();
