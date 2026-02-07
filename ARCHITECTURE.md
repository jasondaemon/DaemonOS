# Architecture

## Overview
DaemonOS is a static, browser-based desktop experience served by a hardened Nginx container. The UI, window manager, and apps run entirely in the client browser. Apps are modular and lazy-loaded to minimize memory use and startup time.

## Directory Layout
- `site/index.html`: Main shell, menu bar, dock, and window manager root.
- `site/styles.css`: Visual system, dock styling, window chrome, and app styling.
- `site/os.js`: Core OS runtime, settings, dock behavior, and app loader.
- `site/apps/registry.json`: App metadata registry.
- `site/apps/**/<app>.js`: Individual app entrypoints.
- `site/apps/games/shared/gameUtils.js`: Shared helpers for canvas scaling and RAF lifecycle cleanup.
- `docker-compose.yml`: Nginx container with read-only mounts and dropped capabilities.
- `nginx.conf`: Minimal server config with security headers.

## App System
- Apps register in `registry.json` with `id`, `title`, `category`, `description`, and `module`.
- Modules export `createApp(osAPI)` and return `{ title, width, height, content }`.
- Apps are loaded on-demand via dynamic `import()` to avoid preloading.
 

## Security Constraints
- Static hosting only; no backend execution or proxying.
- Strict CSP meta tag in `index.html` allows scripts only from `self`.
- Browser app renders local pages from `site/apps/browser/pages/` and opens external sites in a new tab.

## UX Requirements
- Early MacOS X-inspired dock centered at the bottom with hover zoom.
- Distinct icon style (non-Mac glyphs) with activity indicators.
- Menu bar with time, volume, fullscreen, and screensaver controls.
- Functional settings for wallpaper, themes, dock settings, tray icon size, and screensaver.

## Notable App Categories
- **Games**: puzzle, arcade, and action titles (all canvas-based, client-only).
- **Media**: Music Player with visualizer modes and a local playlist manifest.
- **Utilities**: Diagnostics, Settings, Calculator.
