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

## 2026-02-06 (Patch 55)
- Increased Pong speed ramp and enabled progressive difficulty by default.
- Added multi-level Frogger with faster traffic, varied car shapes/colors, and a frog player.

## 2026-02-06 (Patch 56)
- Added Frogger scoring and level display; bumped registry version for cache refresh.

## 2026-02-06 (Patch 57)
- Fixed Frogger level advance glitches and capped speed scaling.

## 2026-02-06 (Patch 58)
- Added Frogger modal flow with lives, Oops/Next Level/Game Over states, and restart button.

## 2026-02-06 (Patch 59)
- Added Racecar game with Atari-style graphics, dodge gameplay, and local high score.

## 2026-02-06 (Patch 60)
- Added custom icons for Pineball and Racecar.

## 2026-02-06 (Patch 61)
- Updated Minesweeper with size options, shift-click flags, and a game-over modal.

## 2026-02-06 (Patch 62)
- Added custom icons for Pong, Minesweeper, and Frogger.

## 2026-02-06 (Patch 63)
- Bumped app registry version to refresh Minesweeper updates.

## 2026-02-06 (Patch 64)
- Made Minesweeper flags more visible and added a Paint app icon.

## 2026-02-06 (Patch 65)
- Fixed Frogger modal callbacks so death/level transitions resume correctly.

## 2026-02-06 (Patch 66)
- Dock category icons now open a tray-style launcher instead of separate windows.

## 2026-02-06 (Patch 67)
- Added tray icon size control in Settings and responsive tray spacing.

## 2026-02-06 (Patch 68)
- Reworked Browser toolbar controls, fixed iframe sizing, and enabled popups from the Home page.

## 2026-02-06 (Patch 69)
- Forced browser/home page refresh and added message-based external link opening.

## 2026-02-06 (Patch 70)
- Added light/dark/auto appearance settings with sunrise/sunset auto mode.

## 2026-02-06 (Patch 71)
- Improved light mode contrast for menus and controls.

## 2026-02-06 (Patch 72)
- Added light-mode paint canvas background and light window headers.

## 2026-02-06 (Patch 73)
- Updated Browser home bookmarks list and label.

## 2026-02-06 (Patch 74)
- Bumped registry version to force app updates to load.

## 2026-02-06 (Patch 75)
- Cache-busted Browser home assets using registry version to ensure updates load.

## 2026-02-06 (Patch 76)
- Added Chess game with CPU difficulty levels, two-player mode, and optional timers.

## 2026-02-06 (Patch 77)
- Fixed chess square sizing and move handling.

## 2026-02-06 (Patch 78)
- Switched chess pieces to SVG with selectable themes.

## 2026-02-06 (Patch 79)
- Refined chess knight silhouette.

## 2026-02-06 (Patch 80)
- Added more detailed SVG chess piece designs.

## 2026-02-06 (Patch 81)
- Tweaked chess knight silhouette for a more horse-like head.

## 2026-02-06 (Patch 82)
- Replaced chess AI with local Stockfish WASM and chess.js rules engine.

## 2026-02-06 (Patch 83)
- Tuned chess difficulty levels with Elo caps and move-time limits.

## 2026-02-06 (Patch 84)
- Made chess Level 1 easier with lower Elo and occasional random moves.

## 2026-02-06 (Patch 85)
- Added Checkers with CPU and two-player modes plus themed board styling.

## 2026-02-06 (Patch 86)
- Added optional forced-jump rule toggle and enhanced checker piece styling.

## 2026-02-06 (Patch 87)
- Refined checkers geometry and added king marker + piece detailing.

## 2026-02-06 (Patch 88)
- Rebuilt Pineball with Planck.js physics, neon rendering, and cleanup-safe controls.

## 2026-02-06 (Patch 89)
- Clamp new window sizes/positions to available viewport space.

## 2026-02-07 (Patch 90)
- Rebuilt Pineball playfield geometry and added letterboxed canvas scaling to prevent warping.

## 2026-02-07 (Patch 91)
- Added Frogger preferences menu toggle for sound and ribbit move audio.

## 2026-02-07 (Patch 92)
- Refined Pineball playfield geometry, ball-saver, and resize handling.

## 2026-02-07 (Patch 93)
- Added Frogger hit/win/game-over sounds and cleaned up input listeners on close.

## 2026-02-07 (Patch 94)
- Added Minesweeper explosion audio on mine detonation.

## 2026-02-07 (Patch 95)
- Added a Winamp-inspired Music Player app with playlist and visualizer support.

## 2026-02-07 (Patch 96)
- Added multiple visualizer modes with a selector in the Music Player.

## 2026-02-07 (Patch 97)
- Expanded Music Player visualizer styles and removed the radial mode.

## 2026-02-07 (Patch 98)
- Added a global menu bar volume control that applies across apps.

## 2026-02-07 (Patch 99)
- Switched the global volume control to a vertical slider aligned next to the clock.

## 2026-02-07 (Patch 100)
- Fixed menu-right alignment and applied global volume to non-DOM audio instances.

## 2026-02-07 (Patch 101)
- Aligned volume icon next to the clock and anchored the volume menu under it.

## 2026-02-07 (Patch 102)
- Added a menu bar fullscreen toggle icon using the browser Fullscreen API.

## 2026-02-07 (Patch 103)
- Repositioned open windows back into view when exiting fullscreen.

## 2026-02-07 (Patch 104)
- Added a simple DaemonOS favicon.

## 2026-02-07 (Patch 105)
- Updated vertical range styling to avoid deprecated appearance usage.

## 2026-02-07 (Patch 106)
- Refreshed the Music Player icon styling.

## 2026-02-07 (Patch 107)
- Wired the Music Player icon to show in file browser and trays.

## 2026-02-07 (Patch 108)
- Expanded Diagnostics with real device/network metrics and async storage/battery info.

## 2026-02-07 (Patch 109)
- Added screensaver settings, menu bar toggle, and animated overlay styles.

## 2026-02-07 (Patch 110)
- Improved the Matrix screensaver visuals with layered rain and glow.

## 2026-02-07 (Patch 111)
- Added a true Matrix code rain canvas animation for the screensaver.

## 2026-02-07 (Patch 112)
- Expanded Matrix screensaver glyph set with Katakana characters.

## 2026-02-07 (Patch 113)
- Increased Matrix screensaver glyph size and column density.

## 2026-02-07 (Patch 114)
- Doubled Matrix screensaver column density.

## 2026-02-07 (Patch 115)
- Added a Flying Toasters screensaver style with canvas animation.

## 2026-02-07 (Patch 116)
- Added Connect 4, Snake, Asteroids, Space Invaders, and Spacefighter games plus an Arcade launcher.

## 2026-02-07 (Patch 117)
- Updated Snake to wrap around edges instead of dying on walls.

## 2026-02-07 (Patch 118)
- Asteroids now split into two smaller rocks traveling along shot direction; stabilized asteroid outlines.

## 2026-02-07 (Patch 119)
- Space Invaders now includes player lives, respawn explosion, and smooth movement.

## 2026-02-07 (Patch 120)
- Added pew sound effect on Space Invaders shots.

## 2026-02-07 (Patch 121)
- Removed the Arcade app entry and module.

## 2026-02-07 (Patch 122)
- Added Asteroids sound effects for firing, hits, deaths, and level clears.

## 2026-02-07 (Patch 123)
- Fixed Asteroids level resets and disabled shooting after game over.

## 2026-02-07 (Patch 124)
- Improved Minesweeper light-mode contrast for revealed tiles.

## 2026-02-07 (Patch 125)
- Added Asteroids game over sound.

## 2026-02-07 (Patch 126)
- Added drop animation for Connect 4 pieces.

## 2026-02-07 (Patch 127)
- Rendered Connect 4 falling pieces behind the board cutouts.

## 2026-02-07 (Patch 128)
- Clipped Connect 4 falling pieces to the board holes for continuous visibility.

## 2026-02-07 (Patch 129)
- Fixed Connect 4 board masking so falling pieces remain visible through holes.

## 2026-02-07 (Patch 130)
- Restored Connect 4 board styling and corrected masking for falling pieces.

## 2026-02-07 (Patch 131)
- Fixed Checkers CPU to continue multi-jump captures without hanging.

## 2026-02-07 (Patch 132)
- Fixed Space Invaders wave edge detection to avoid sudden drops.

## 2026-02-07 (Patch 131)
- Slowed Connect 4 CPU response, made easy mode easier, and boosted win glow.

## 2026-02-07 (Patch 132)
- Set Connect 4 default mode to VS Computer.

## 2026-02-07 (Patch 130)
- Updated the Asteroids icon to include the player ship overlay.

## 2026-02-07 (Patch 129)
- Updated Frogger player sprite to match the dock icon style.
