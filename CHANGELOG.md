# Changelog

## 2026-02-06
- Added containerized Nginx service with hardened defaults.
- Built initial DaemonOS interface with menu bar, dock, and window manager.
- Implemented settings for wallpaper and dock behavior with persistence.
- Added modular app registry with lazy-loading.
- Shipped core apps: Notepad, Web Browser, Diagnostics.
- Shipped games: Pong, Minesweeper, Frogger.
- Added local apps folder picker (File System Access API).
- Authored initial architecture and operating rules documents.

## 2026-02-06 (Patch)
- Adjusted container runtime to avoid nginx entrypoint chown failures under read-only/rootless setups.

## 2026-02-06 (Patch 2)
- Defaulted SITE_ROOT to a relative `../site` path to avoid local absolute paths.

## 2026-02-06 (Patch 3)
- Corrected default SITE_ROOT to `../../site` to match repo layout and prevent 403 on `/`.

## 2026-02-06 (Patch 4)
- Moved system menu under the DaemonOS menu and removed banana icon.
- Added distinctive dock glyphs for core categories.
- Fixed app loading by switching the OS script to ES modules.

## 2026-02-06 (Patch 5)
- Fixed app loading by normalizing module paths and using absolute URLs in the registry.

## 2026-02-06 (Patch 6)
- Prevented duplicate File Browser and category windows; now focus existing windows.
- Fixed close button dragging interference that caused window bumps on close.

## 2026-02-06 (Patch 7)
- Added window minimization and a Windows task switcher panel.
- Persisted per-window positions/sizes in local storage.
- Rebuilt File Browser as a virtual filesystem explorer.

## 2026-02-06 (Patch 8)
- Added dock-minimize behavior with animated minimize/restore and a dock tray.

## 2026-02-06 (Patch 9)
- Added labeled minimized window icons in the dock tray.

## 2026-02-06 (Patch 10)
- Minimized tray items now match dock icon size and use inline SVG window icons.

## 2026-02-06 (Patch 11)
- Added dock trash can with empty/full visual states and a Trash window.

## 2026-02-06 (Patch 12)
- Persisted open windows and minimized state across reloads via local storage.
- Remembered task switcher open state across reloads.

## 2026-02-06 (Patch 13)
- Unified icon-based window contents with centered labels and draggable layouts.
- Added window maximize toggle and per-window icon layout persistence.
- Added desktop aliases with right-click context menu and Get Info panels.

## 2026-02-06 (Patch 14)
- Increased default icon size and added a Desktop icon size setting.

## 2026-02-06 (Patch 15)
- Scaled icon SVGs with larger glyphs inside icon tiles.

## 2026-02-06 (Patch 16)
- Restored single-click app launching while keeping icon dragging.

## 2026-02-06 (Patch 17)
- Added icon selection outlines, drag-selection, and keyboard navigation (arrows + Enter).
- Switched icon launching to double-click to align with OS-style selection.

## 2026-02-06 (Patch 18)
- Added per-app menu bar with desktop-style menus and a Files menu when no app is focused.
- Renamed File Browser dock item to Files and added window maximize control.
- Expanded Pong with mode selection, high scores (cookie), vs-computer mode, and progressive difficulty toggle.

## 2026-02-06 (Patch 19)
- Removed the Windows menu and added window management actions under the Window menu.

## 2026-02-06 (Patch 20)
- Added an About DaemonOS panel to the system menu.

## 2026-02-06 (Patch 21)
- Styled the About DaemonOS panel with official-style layout, metadata, and copyright.

## 2026-02-06 (Patch 22)
- Adjusted About DaemonOS panel sizing and added playful system specs based on platform heuristics.

## 2026-02-06 (Patch 23)
- Added edge/corner resize handles for Files windows with size persistence.

## 2026-02-06 (Patch 24)
- Raised menu bar and dropdown z-index to ensure menus render above windows.

## 2026-02-06 (Patch 25)
- Moved resize handles inside window bounds to keep them accessible after tiling.

## 2026-02-06 (Patch 26)
- Enabled resize handles for all windows, not just Files.

## 2026-02-06 (Patch 27)
- Moved settings into a dedicated Settings window and updated DaemonOS menu actions.
- Added reboot and shutdown behaviors.

## 2026-02-06 (Patch 28)
- Added Settings and Calculator utilities, with a safe calculator expression parser.

## 2026-02-06 (Patch 29)
- Simplified the DaemonOS system menu to standard dropdown items and moved dock settings into Settings.

## 2026-02-06 (Patch 30)
- Renamed app entrypoints to match app names and updated the registry.

## 2026-02-06 (Patch 31)
- Fixed DaemonOS menu closing immediately due to global dropdown click handler.

## 2026-02-06 (Patch 32)
- Added colorful icon themes per app/category.

## 2026-02-06 (Patch 33)
- Reverted icon color themes to the neutral style.

## 2026-02-06 (Patch 34)
- Added colored SVG glyphs for icons, including calculator, settings, and diagnostics.

## 2026-02-06 (Patch 35)
- Added Pineball pinball game with multiball, lights, and high score tracking.

## 2026-02-06 (Patch 36)
- Added Paint app with palette, brush types, size slider, and eraser.

## 2026-02-06 (Patch 37)
- Refreshed category and Files windows when re-opened to reflect new apps.

## 2026-02-06 (Patch 38)
- Reworked Pineball with flipper physics, rails, slingshots, and improved playfield layout.

## 2026-02-06 (Patch 39)
- Adjusted Pineball flipper rest/active angles and refined gutter guides to feed the flippers.

## 2026-02-06 (Patch 40)
- Tuned Pineball side gutters to guide balls toward flipper tips and reduce wall stalls.

## 2026-02-06 (Patch 41)
- Simplified Pineball gutter rails, reduced drain gap, and tuned gutter nudges.

## 2026-02-06 (Patch 42)
- Rebuilt Pineball bottom lane geometry to standard inlane/outlane feeds and narrowed the drain gap.

## 2026-02-06 (Patch 43)
- Rebuilt Pineball playfield geometry to mirror the provided pinball layout.

## 2026-02-06 (Patch 44)
- Added registry versioning to cache-bust app modules after updates.

## 2026-02-06 (Patch 45)
- Rebuilt Pineball geometry and bumper layout to closely match the reference machine.

## 2026-02-06 (Patch 46)
- Rebuilt Pineball using Matter.js for accurate geometry and collisions; updated CSP to allow esm.sh.

## 2026-02-06 (Patch 47)
- Refined Pineball Matter.js rails and inlane/outlane geometry to better match reference.

## 2026-02-06 (Patch 48)
- Reworked Pineball geometry to match the provided simplified reference layout.

## 2026-02-06 (Patch 49)
- Overhauled Pineball geometry to more closely match the simplified reference silhouette.

## 2026-02-06 (Patch 50)
- Rebuilt Pineball geometry and bumpers to match the annotated reference layout.

## 2026-02-06 (Patch 51)
- Refined Pineball boundary and bumper placements to better align with the latest reference.

## 2026-02-06 (Patch 52)
- Fixed Pineball flipper control and plunger launch; adjusted lower geometry to guide balls to flippers.

## 2026-02-06 (Patch 53)
- Moved `site` into the repo and updated docker compose default SITE_ROOT.

## 2026-02-06 (Patch 54)
- Removed local apps feature and tightened CSP/security headers.
- Reworked Browser app to render local home pages and open searches in a new tab.
- Added modular browser pages under `site/apps/browser/pages`.
