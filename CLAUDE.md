# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Lookups

Always use Context7 MCP (`mcp__context7__resolve-library-id` then `mcp__context7__query-docs`) before answering any question about a library, framework, SDK, or API. This includes Electron, React, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query, Vite, electron-builder, and electron-updater. Never answer from training data alone.

## Writing Rules

- Never generate em-dashes (--). Use a hyphen (-) or rewrite the sentence instead.
- No filler phrases, no trailing summaries, no explanations of what the code does.
- Comments only when the WHY is non-obvious.

## Commands

```bash
pnpm dev                       # Vite renderer dev server only (http://localhost:15173)
pnpm electron:dev-hide         # Electron + renderer dev, hidden window
pnpm electron:dev-show         # Electron + renderer dev, visible window
pnpm start                     # Alias for electron:dev-hide

pnpm build                     # tsc + vite build (renderer only)
pnpm electron:build-main       # Build Electron main process to electron-dist/
pnpm electron:build            # Full distribution build via electron-builder

pnpm lint                      # ESLint check
pnpm format                    # Prettier + ESLint auto-fix

pnpm test:main                 # Main-process checks (builds first; needs Node >= 22.15)
```

`.github/workflows/ci.yml` runs eslint, both `tsc` configs, the renderer build, and `pnpm test:main` on every pull request to `main`. Run the same locally first; CI is a backstop, not the first check. Releases are separate: `.github/workflows/release.yml` is `workflow_dispatch` only, so merging never publishes a build.

Prettier is not enforced anywhere, and a number of files do not currently satisfy it, so `pnpm format` produces unrelated churn. Format the files you touch, not the tree.

## Architecture

This is an Electron 40 desktop app. `src/main/` is the Node.js main process; `src/renderer/` is the React/Vite renderer. The renderer **never** calls backend APIs - all network calls go through IPC to main.

Path alias: `@/*` resolves to `./src/renderer/*`.

### IPC Bridge

[src/main/preload.cts](src/main/preload.cts) is compiled to CJS (required by Electron) and exposes `window.electronAPI` (aliased as `window.electron`) via `contextBridge`. Renderer types are declared in [src/renderer/types/electron-api.d.ts](src/renderer/types/electron-api.d.ts).

IPC channel naming convention: `domain:action` (e.g., `config:get`, `auth:login`, `live-suggestion:stop`).

Handler registration lives in [src/main/ipc/](src/main/ipc/) - one file per domain. Each `register*Handlers()` is called in `app.whenReady()` inside [src/main/index.ts](src/main/index.ts). Business logic lives in [src/main/services/](src/main/services/) and is exported as singletons (`export const fooService = new FooService()`).

### State: AppState vs ConfigStore

**AppState** ([src/renderer/hooks/use-app-state.tsx](src/renderer/hooks/use-app-state.tsx)) is read-only in the renderer. An `AppStateManager` singleton (pinned to `globalThis` to survive HMR) subscribes to `app-state-updated` push events from main; it falls back to 1-second polling when that API is unavailable. Never mutate AppState from the renderer - call the appropriate IPC method on main instead.

`AppState` and what the renderer receives are not the same object. `appStateService.getRendererState()` reduces `interviewConfig` to a `{ fullName, hasProfileData }` summary, because the whole state is broadcast on every change and the profile and context can each run to 128,000 characters. Never put the full CV back into the broadcast - `test/app-state.test.mjs` pins this. The configuration dialog fetches the real values on demand over `account:get`.

**ConfigStore** ([src/renderer/hooks/use-config-store.ts](src/renderer/hooks/use-config-store.ts)) is a Zustand store backed by the main-process Electron Store ([src/main/store/config.store.ts](src/main/store/config.store.ts)). Mutations call `window.electronAPI.config.update(...)` via IPC. A runtime migration IIFE at the bottom of the main store backfills newly-added keys on first launch.

**Interview config** (full name, profile/CV, context) is *not* in ConfigStore - the backend account is its durable store, managed by [src/main/services/account.service.ts](src/main/services/account.service.ts) and pulled on login or a remembered session. A pre-sync `runtime.interviewConf` may still exist on disk from older builds; it is migrated onto the account and only deleted once the backend confirms the write, so do not drop it eagerly (`test/config-store.test.mjs` pins this).

### Transcription and Suggestion Flow

[src/main/services/transcript.service.ts](src/main/services/transcript.service.ts) is the central orchestrator. `transcriptService.ingest(channel, type, text)` merges both audio channels, deduplicates overlapping segments, and triggers `liveSuggestionService.startGenerateSuggestion()` when a final `Other` transcript arrives - with a `LIVE_SUGGESTION_GAP_MS` guard that suppresses the call if Self spoke recently.

- `ch_0` = `Speaker.Other` (interviewer, captured via loopback audio)
- `ch_1` = `Speaker.Self` (candidate, captured via microphone)

Action suggestions are independent of transcripts - triggered by screenshot captures (up to `ACTION_SUGGESTION_MAX_CAPTURES` = 4 images per request).

**Professional mode** (`professionalMode` in ConfigStore, off by default) asks the backend for hints - a headline plus keyword bullets - instead of full sentences. Both suggestion services read the flag once at the top of `generateSuggestion` and send it as `mode` on the request; the backend defaults it to `normal`, so the field is safe to omit against an older deployment.

The `NO_SUGGESTION_NEEDED` sentinel goes through `isNoSuggestionSentinel()` ([src/main/utils/suggestion-sentinel.ts](src/main/utils/suggestion-sentinel.ts)) rather than a direct comparison. It is prefix-matched because it runs on every streamed chunk, and it strips leading markdown first: the professional prompt asks for a bold headline on line 1, so a model that carries that format over emits `**NO_SUGGESTION_NEEDED**` and a bare match would leave the sentinel on screen as a card. `test/suggestion-sentinel.test.mjs` pins both halves - the wrapped forms are suppressed, real answers are not.

Both live modes render through `SafeMarkdown`, the same component the action panel uses. The normal-mode prompt asks for plain text *with light formatting*, so any bold or bullet the model reached for used to land on screen as literal asterisks. Prose is passed through `withHardBreaks()` ([src/renderer/lib/suggestions.ts](src/renderer/lib/suggestions.ts)) first: Markdown folds a single newline into a space, and the `whitespace-pre-wrap` rendering it replaced showed every newline the model emitted.

Each `LiveSuggestion` still carries the `mode` it was *generated* under, and the panel keys off that rather than the current setting, so toggling mid-interview leaves cards already on screen alone. What the mode selects is the presentation around the Markdown: professional promotes the headline line, normal keeps the 🪄 marker in a column of its own - prepending it to the content instead would swallow whatever structure the answer opens with.

### Routing

Hash-based router (required for Electron `file://` protocol). Routes: `/` (index, redirects based on login state) -> `/auth/login` or `/auth/signup` -> `/main` (interview UI) -> `/payment`.

### Window and Stealth Mode

The main window reference is passed to `windowControlService` and `zoomService` after creation. Window bounds persist to Electron Store on `close` and are restored on next launch with minimum-size clamping (`MIN_WIDTH` / `MIN_HEIGHT` from [src/main/consts.ts](src/main/consts.ts)).

The app keeps itself off the surfaces a screen share exposes, but only where it has to. There is never a desktop shortcut (the NSIS installer creates none, and `build/installer.nsh` deletes one left by an older install). The taskbar button and the macOS Dock icon are driven by `applySurfaceVisibility()` in [src/main/services/window-control.service.ts](src/main/services/window-control.service.ts) - `setSkipTaskbar(hidden)` plus, on macOS, `app.setActivationPolicy('accessory')` + `app.dock.hide()` going in and `'regular'` + `app.dock.show()` coming out. There is deliberately no `LSUIElement` in the packaged Info.plist: it would pin the app to accessory from launch and there would be no Dock icon to give back.

`hidden` comes from `shouldHideSurfaces()`, which is `_stealth || isAssistantRunning()`. **The two inputs are independent, not nested.** A running assistant is when a screen share is most likely live, so it hides the same surfaces stealth does; leaving stealth mid-session must therefore *not* hand the taskbar button back. The macOS traffic lights are the deliberate exception - they follow `_stealth` alone, because a merely running window is still focusable and interactive and needs its close and minimise buttons. `test/running-surface.test.mjs` pins all of it.

Two consequences. A window minimized *in stealth mode* has no button to click, so it can only be brought back by relaunching the app - the single instance lock routes to `restoreWindow()`. And `window-all-closed` quits on every platform including macOS, because a windowless process in stealth mode would otherwise sit there holding the global hotkeys unreachable. `test/stealth-surface.test.mjs` pins all of it.

Always-on-top follows the same `shouldHideSurfaces()` predicate and is owned by `applySurfaceVisibility()`, not by the stealth toggles - that is what keeps the pin when stealth is switched off mid-session. The level is `'screen-saver'`: levels from `'floating'` to `'status'` put the window *below* the Dock and taskbar, so only `'pop-up-menu'` and above are actually on top. `setVisibleOnAllWorkspaces(pinned, { visibleOnFullScreen: pinned })` goes with it, because on macOS an always-on-top window still vanishes when the user switches to a fullscreen Space - which is how most people run a video call. Within `applySurfaceVisibility()` the z-order call must come **before** `setSkipTaskbar`, since changing it re-registers the window with the shell.

Hiding the taskbar button is *registration* state (`ITaskbarList::DeleteTab` on Windows), not a window style, so it does not survive `setFocusable` or z-order changes - the button reappears after a stealth toggle. `applySurfaceVisibility()` re-asserts the right state, is wired to the window's `show`/`restore`/`maximize`/`unmaximize` events, and must be called after anything that reshapes or re-shows the window - and after `_stealth` is updated, since it reads it. `test/stealth-toggle.test.mjs` pins that.

The Dock half has a failure mode of its own: **macOS drops a Dock call made within one second of the previous one**, silently. Toggling stealth twice quickly would otherwise leave the icon on screen for the rest of the session. `applyDockVisibility()` therefore skips no-op calls (so window events do not spend the one-second budget), and when a call does land inside the window it schedules a re-assert `DOCK_RATE_LIMIT_MS` later that re-reads `_stealth`. The activation policy carries no such limit and is applied immediately, so the icon still goes away at once in the swallowed case. `test/stealth-dock.test.mjs` pins this; it loads a second copy of the service through `loadMainAs('darwin', ...)`, since these branches are dead code on the Linux runner CI uses.

Whether the *shell* actually acts on `setSkipTaskbar` is not something a unit test can reach, and it fails without an error. `test/manual/taskbar-probe.mjs` drives the real service in a real Electron process and reads the taskbar back through UI Automation - Windows only, run by hand (`pnpm exec electron test/manual/taskbar-probe.mjs`), deliberately not in `test/run.mjs`.

Stealth mode hides the window from screen capture via `setContentProtection`. The main process emits `stealth-changed`; the preload script toggles a `stealth` CSS class on `document.body`. Content protection is on by default; pass `--disable-content-protection` at launch to disable it (dev/testing only).

Background throttling is disabled globally (via `app.commandLine` switches and `backgroundThrottling: false` in `webPreferences`) so audio keeps running when the window is occluded.

### Backend and Constants

Backend URL: `localhost:8080` in dev, `api.powerinterviewai.com` in prod - switched by `EnvUtil.isDev()` in [src/main/consts.ts](src/main/consts.ts). All feature constants (zoom steps, suggestion gaps, transcript merge window) live in the same file.

[src/main/api/client.ts](src/main/api/client.ts) reads `sessionToken` from the config store before every request and sets it as the Bearer token. Streaming responses return a raw `ReadableStream<Uint8Array>`.

## Project Spec

See [SPEC.md](SPEC.md) for full feature details, tech stack table, and platform support.
