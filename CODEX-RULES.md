# Codex Rules

## Operating Requirements
- Serve content exclusively from the `site` directory.
- Avoid interpreted user input (no eval, no arbitrary command execution, no server-side scripting).
- Keep the attack surface minimal and default to static assets.
- Load applications lazily; do not preload app code unless an app is opened.
- Prefer browser-native APIs and sandboxed iframes for untrusted content.
- Preserve existing behavior unless explicitly asked to refactor.

## Security Posture
- Enforce a strict Content Security Policy in `site/index.html`.
- Keep network access limited to the user's browser (no proxying).
- Use hardened Nginx configuration and drop privileges in the container.

## App Model
- Apps live under `site/apps/` and are registered in `site/apps/registry.json`.
- Apps export `createApp(osAPI)` and return window content via DOM nodes.
