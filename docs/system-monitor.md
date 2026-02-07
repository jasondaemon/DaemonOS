# System Monitor (Client-Only)

DaemonOS includes a lightweight System Monitor widget in the top menu bar. It provides an **estimate** of memory pressure and performance so users can decide when to close or suspend apps. All data is computed locally in the browser with no external telemetry.

## What It Shows
- **Memory %**: Estimated usage vs a budget (see below).
- **Apps**: Running + suspended count.
- **FPS**: Moving-average render performance.
- **Pressure**: A 0–100 score combining FPS, long tasks, allocation spikes, and heap ratio (if available).

Click the widget to open the panel and view:
- DaemonOS Tracked Memory (estimated bytes)
- JS Heap (if supported by the browser)
- Device memory hint (if supported)
- Pressure meter + guidance
- Per-app list with **Focus / Suspend / Close**
- Quick action: **Suspend Background Apps**

## Budget Model (Estimate)
Because real free RAM is not available in the browser, DaemonOS uses a budget model:
- If `navigator.deviceMemory` exists:
  - `budget = deviceMemoryGB * 0.30 * 1024^3`
- Else:
  - `budget = 768 MB`

**Tracked memory** is only what apps report via the ResourceTracker API. The percent is:
```
trackedTotal / budget
```

## ResourceTracker API
Apps can report estimated memory allocations:

```js
import { resourceTracker } from "/core/resourceTracker.js";

const tex = resourceTracker.claim("myapp", "texture", 2 * 1024 * 1024, "spritesheet");
resourceTracker.release(tex);

resourceTracker.setAppTotal("myapp", "entities", 200_000, "Entity buffers");
```

Supported methods:
- `claim(appId, category, bytes, label?) -> token`
- `release(token)`
- `setAppTotal(appId, category, bytes, label?)`
- `getTotals()`
- `subscribe(fn)`

## App Lifecycle Hooks
Apps can opt into lifecycle controls to throttle or suspend:

```js
export function createApp() {
  return {
    title: "My App",
    content,
    onSuspend: () => { /* pause audio or loops */ },
    onResume: () => { /* resume work */ },
    freeOptionalCaches: () => { /* drop optional buffers */ },
  };
}
```

For render loops, use the helper:

```js
import { createLoop } from "/core/appLifecycle.js";

const loop = createLoop("myapp", { step, render, isActive: () => content.isConnected });
loop.start();
```

## Notes
- All metrics are **estimates** based on client-side signals.
- The monitor works even if apps do not report resources (they show 0 tracked).
- Browsers vary in API support; heap stats and long tasks are feature-detected.
