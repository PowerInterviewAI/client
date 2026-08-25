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

[src/main/services/transcript.service.ts](src/main/services/transcript.service.ts) is the central orchestrator. `transcriptService.ingest(channel, type, text)` merges both audio channels, deduplicates overlapping segments, and decides whether a final `Other` transcript is worth answering - with a `LIVE_SUGGESTION_GAP_MS` guard that suppresses the call if Self spoke recently.

- `ch_0` = `Speaker.Other` (interviewer, captured via loopback audio)
- `ch_1` = `Speaker.Self` (candidate, captured via microphone)

**Not every interviewer turn needs an answer**, and deciding that is a cascade, cheapest stage first. `classifyInterviewerTurn()` ([src/main/utils/interviewer-turn.ts](src/main/utils/interviewer-turn.ts)) runs in-process on the *merged* turn and returns one of three verdicts: `Skip` drops the turn outright with no request and no card, `Answer` generates immediately, and `Uncertain` parks on an `INTERVIEWER_TURN_SETTLE_MS` timer that any further `ch_0` final re-arms. The `NO_SUGGESTION_NEEDED` sentinel is the *last* stage of the same cascade, not the only one.

Three things this ordering buys, all of which the sentinel alone could not. A turn caught at `Skip` costs no upload of the profile and context, no model call, and never reaches the panel, so nothing flashes on screen and is retracted. A question the ASR split across two finals - an ASR final is an acoustic endpoint, not the end of a thought - is classified whole instead of firing a request on the fragment that the continuation immediately aborts. And a completed question skips the settle wait entirely, so the latency is paid only by turns that are genuinely ambiguous.

The classifier is deliberately asymmetric, and `test/interviewer-turn.test.mjs` pins both halves. A filler that slips through costs one request and a card that flashes; a question misread as filler produces *nothing at all*, mid-interview, with no error anywhere. So `Skip` is returned only when the backchannel lexicon consumes the whole turn from the front, and everything it cannot fully consume falls through rather than being guessed at.

`Answer` and `Uncertain` both reach the backend, as `turn_verdict` on `GenerateLiveSuggestionRequest` ([types/llm.ts](src/main/types/llm.ts) mirrors the wire values `answer` / `uncertain`; `Skip` never becomes a request and has no wire value). `Answer` tells the backend to trust the client and skip its own classifier; `Uncertain` asks it to run one. The backend's decision is speculative - it runs *beside* the generation it might cancel, not in front of it - and the client cooperates by holding the card back: `generateSuggestion()` in [suggestion-live.service.ts](src/main/services/suggestion-live.service.ts) does not append a `Pending` card on request start. It arms a `LIVE_SUGGESTION_RENDER_DELAY_MS` timer instead, so a turn the backend suppresses within that window produces no card at all rather than one that flashes and is retracted - the exact failure this whole cascade exists to remove. Any real write (loading state once headers arrive, a streamed chunk, an error) cancels the timer and renders immediately through `publish()`; a `Stopped` state from being superseded before ever rendering goes through `refresh()` instead, which is a no-op unless a card already exists, so a card the candidate never saw pending does not appear only to say it was cancelled.

Action suggestions are independent of transcripts - triggered by screenshot captures (up to `ACTION_SUGGESTION_MAX_CAPTURES` = 4 images per request).

**Professional mode** (`professionalMode` in ConfigStore, off by default) asks the backend for hints - a headline plus keyword bullets - instead of full sentences. Both suggestion services read the flag once at the top of `generateSuggestion` and send it as `mode` on the request; the backend defaults it to `normal`, so the field is safe to omit against an older deployment.

The `NO_SUGGESTION_NEEDED` sentinel goes through `isNoSuggestionSentinel()` ([src/main/utils/suggestion-sentinel.ts](src/main/utils/suggestion-sentinel.ts)) rather than a direct comparison. It backs up the deterministic gate above for turns the lexicon cannot settle, and it is in-band by nature - a control decision travelling in the answer stream - which is why it is the fallback rather than the mechanism. It is prefix-matched because it runs on every streamed chunk, and it strips leading markdown first: the professional prompt asks for a bold headline on line 1, so a model that carries that format over emits `**NO_SUGGESTION_NEEDED**` and a bare match would leave the sentinel on screen as a card. `test/suggestion-sentinel.test.mjs` pins both halves - the wrapped forms are suppressed, real answers are not.

Both live modes render through `SafeMarkdown`, the same component the action panel uses. The normal-mode prompt asks for plain text *with light formatting*, so any bold or bullet the model reached for used to land on screen as literal asterisks. Prose is passed through `withHardBreaks()` ([src/renderer/lib/suggestions.ts](src/renderer/lib/suggestions.ts)) first: Markdown folds a single newline into a space, and the `whitespace-pre-wrap` rendering it replaced showed every newline the model emitted.

The backend prompts now ask for inline emphasis on the words an answer turns on, in both modes, so `strong` and `em` are declared explicitly in `SafeMarkdown` rather than left to browser defaults - body copy is deliberately regular weight so that `strong` reads as emphasis against it. Live answers additionally go through `stripDanglingEmphasis()`: the panel re-renders on every streamed chunk, so each emphasized span exists for a few frames as an opening `**` with no closing pair, which Markdown renders as literal asterisks on the card the candidate is reading. It drops that one unmatched marker, leaving the text plain until the span closes. Live only - action suggestions carry code, where an asterisk is a dereference or a glob (`test/suggestion-emphasis.test.mjs` pins both halves, including that a `*` opening a list item is a block marker and never stripped).

Each `LiveSuggestion` still carries the `mode` it was *generated* under, and the panel keys off that rather than the current setting, so toggling mid-interview leaves cards already on screen alone. What the mode selects is the presentation around the Markdown: professional promotes the headline line, normal keeps the 🪄 marker in a column of its own - prepending it to the content instead would swallow whatever structure the answer opens with.

### Assistant lifecycle

`RunningState` is what every control on the bar is gated on, and `Starting` and `Stopping` disable
all of them - Stop included. So the one invariant `useAssistantService` has to hold is that the
state always lands back on a terminal value, whatever went wrong on the way. `stopAssistant`
returns to `Idle` in a `finally`, and tears the four services down through `Promise.allSettled`
rather than `Promise.all`: `all` rejects on the first one that throws and abandons the other three,
so a single failing teardown used to leave the rest running *and* strand the app in `Stopping`
with no reachable control - unrecoverable without restarting the app, mid-interview. A partial
failure is now a toast rather than a throw, because there is nothing left for a caller to do about
it and the session is over either way.

The failed-start path is the mirror of that, and it belongs in exactly one place. `startAssistant`
already tears both services down and returns to `Idle` in its own `catch`, so `doStart` in
[control-panel/index.tsx](src/renderer/components/custom/control-panel/index.tsx) reports the error
and stops there. Calling `stopAssistant()` after it, as it used to, walked the button through a
three-second `Stopping` for a session that never started, and that call's own failure landed
outside the `try` as an unhandled rejection.

`useMediaDevices` reports `ready` alongside the device list because an empty list means two
different things - `enumerateDevices()` has not answered yet, and this machine has none - and the
control panel renders a destructive badge and refuses Start on the second. Reading them as one
put a red `!` on a working microphone for the first frames after every launch, and refused a Start
pressed quickly with a message naming a device that was there all along. An unset
`audioInputDeviceName` is a third state again, and also not "missing": `AudioGroup` is choosing
the default at that moment, in an effect - never in the render body, where the store write
re-enters React mid-commit and a failed IPC call rolls the value back into the same condition that
triggered it, one write per frame.

### Interview language

One setting decides three things: which speech model transcribes the call, what language suggestions come back in, and the language of the exported report. `Language` is mirrored across the processes the way `SuggestionMode` is - [src/main/types/language.ts](src/main/types/language.ts) for the request bodies, [src/renderer/types/language.ts](src/renderer/types/language.ts) for the same enum plus the display metadata the picker needs. 28 languages, which is what the backend's Deepgram Nova-3 provider streams: offering one the ASR cannot hear would not degrade, it would answer a question that was never asked. It was six while the backend was AssemblyAI-only.

A backend still configured for AssemblyAI resolves a language it cannot hear back to English rather than faking it, so a client ahead of its backend degrades one session instead of breaking it. `test/language.test.mjs` pins the two mirrors staying in step, which is the failure the widening made likely: an enum member with no picker entry renders a blank trigger, and a picker entry with no enum member resolves straight back to English when picked. The menu is capped and scrolls, because it opens upward from the bottom-most control into an overflow-hidden `main` - an uncapped 28-item list runs off the top of the window rather than flipping.

**English is the absence of the feature.** `buildStreamingUrl` sends no `language` parameter at all for English rather than `language=en`, and the backend defaults the request field, so a session that never touches the picker produces exactly the traffic it produced before this existed.

`configStore.getConfig()` resolves the language on the way *out*, not on the way in. The disk holds whatever some build wrote - a code a later release dropped, or one an older release never knew - and every consumer reads through `getConfig`, so that is the single place an unknown code can be stopped before it reaches the ASR URL and three request bodies. `test/language.test.mjs` pins it.

**The picker stays live mid-interview**, unlike Model, because an interview that switches language is the case it exists for and not one the candidate can prepare for by restarting. The two halves of the setting move at different speeds and `useInterviewLanguage` is where that is reconciled. Suggestions need nothing: every request reads the config store as it is built, so the next one already follows. The ASR carries its language as a *connection* parameter, so `liveTranscriptionService.setLanguage()` tears both sockets down and re-opens them - a second or two of gap, and whatever utterance was mid-flight is orphaned, which is why the button shows a spinner rather than pretending the change was instant and why the menu says so before the user commits.

Two guards in `AudioWsStream` make that safe, and both protect against the same failure - two sockets on one channel, one of them orphaned and still relaying audio into a dead session. `ws.onclose` ignores a close from a socket that is no longer `this.ws`, since that is the tail of a replacement rather than a disconnect; and the `switching` flag suppresses the ordinary backoff reconnect for the close `setLanguage` causes itself, which it then handles immediately instead of after `WS_RETRY_BASE_DELAY_MS`. `connectWebSocket` rebuilds the URL per attempt rather than capturing it, which is what lets a reconnect pick up the new language at all.

Two consequences of that first guard. `setLanguage` has to report `channelDisconnected` itself rather than leaving it to `onclose`: `new WebSocket` assigns `this.ws` synchronously, so the old socket's close event always arrives after the replacement exists and is correctly ignored. And `setLanguage` keys its own no-op check on `this.ws` rather than on `active`, which `start()` only sets *after* its first connect returns - in that window a socket exists on the old language and an `active` check would skip it.

The setting is persisted *before* the reconnect and never rolled back on failure: a failed reconnect that reverted the setting would leave the user with no route to the language they picked, whereas leaving it set means stopping and starting the assistant recovers.

The trigger shows the code (`EN`, `ES`) next to the icon for the same reason the tooltip names the language - the one question this control has to answer at a glance is what it is currently set to.

The app's own chrome is **not** localised, deliberately: an English button on a Spanish interview is an inconvenience, an English transcript of Spanish speech is a wrong answer read out loud.

### Audio input device

**The microphone can be changed mid-interview**, and for the same reason the language can: the case
it exists for only shows up once the session is running. A headset that dies, is unplugged, or was
the wrong device to begin with is noticed when the interviewer says they cannot hear you, and the
control used to be locked at exactly that moment - the only fix was stopping the assistant, which
drops the transcript and the suggestion history with it.

It is cheaper than the language switch, and the difference is worth keeping straight. The device is
only what feeds the worklet; it is **not** a connection parameter. So `AudioWsStream.setStream()`
replaces the `MediaStreamAudioSourceNode` while the socket, the provider session and any utterance
in flight all survive. Nothing reconnects, there is no gap in the transcript, and the dialog
therefore promises the opposite of what the language menu warns about. Reaching for `setLanguage`'s
machinery here would reintroduce the gap this avoids.

Two things `liveTranscriptionService.setAudioInputDevice()` has to hold, both pinned by
`test/audio-device-switch.test.mjs`. **The replacement stream is acquired before anything is torn
down**, and the previous one stopped only after the swap succeeds, so a device that is unplugged,
held by another app, or refused by permissions leaves the interview on the microphone it already
had. Releasing first reads as the obvious cleanup order and works every time the new device is
present; on the one path that matters it leaves the session with no microphone at all, mid-answer.
And a stream that finishes opening *after* the session stopped is released rather than left holding
the device with its indicator light on, since nothing else keeps a reference to it.

`setStream` reuses the existing `AudioContext` rather than building one. Its `sampleRate` is fixed
at construction and `convertTo16kPcm` reads it, so a fresh context would resample every frame
against the wrong rate - quietly, and only for users whose second device runs at a different rate
than their first.

Only `ch_1` moves. `ch_0` is loopback audio captured from the call and has no device to change.

The setting is persisted before the swap and never rolled back on failure, the same as the language
picker: a failed swap leaves the audio running, so reverting would only remove the user's route to
the device they picked.

The tests are source-level, unusually for this directory - every other one loads a built
main-process module, and this is renderer code with no runtime harness. They are worth the
awkwardness because the ordering above is what a later tidy-up breaks, with no symptom a type
checker or a linter can see.

### Navigation and external links

The panels render Markdown that came from a language model, and `remark-gfm` autolinks bare URLs,
so an anchor in this app is not necessarily one a person wrote. `installNavigationGuard()`
([src/main/navigation-guard.ts](src/main/navigation-guard.ts)) is installed before the window's
first load and closes the two routes that follow from that, neither of which announced itself.

`setWindowOpenHandler` denies **every** new window. A `target="_blank"` anchor - which is what
`SafeMarkdown` renders - asks Electron for one, and with no handler installed the default is to
make it: a chromeless BrowserWindow with no address bar showing a page the user did not choose.
A web URL is handed to the real browser instead, through `setImmediate` as Electron's own
guidance requires.

`will-navigate` pins the window to the app's own document. An anchor without a target navigates
the frame it is in, and that frame is the app - preload runs on whatever document loads next, so
a remote page would inherit `window.electronAPI`, and with it the session token through
`config.get()` and the candidate's CV through `account.get()`. `file:` origins serialize to
`"null"`, so the packaged build is matched on its exact document URL rather than on an origin
comparison that could never hold.

Both routes and the `external:open` IPC handler go through the same `openExternally()`, which
allows `http:`, `https:` and `mailto:` only. `shell.openExternal` delegates to the OS protocol
handler, so `file:` launches whatever the path points at and a registered custom scheme runs
whatever claimed it. `test/navigation-guard.test.mjs` pins all three.

### Routing

Hash-based router (required for Electron `file://` protocol). Routes: `/` (index, redirects based on login state) -> `/auth/login`, `/auth/signup`, or `/auth/forgot-password` -> `/main` (interview UI) -> `/payment`.

`/auth/forgot-password` is a three-step wizard shaped like the signup one (email -> code -> password), and the reset is code-based rather than an emailed link because a link opens the system browser, which has no way to hand a token back without a registered deep-link protocol handler.

**Step one advances on success alone and never reports "no such account".** The backend answers `forgot-password` identically for a registered and an unregistered address so that the endpoint cannot be used to test who has one, and a UI that reported the difference would hand that oracle straight back - which is why the copy on step two is conditional ("if an account exists for..."). `AuthService.forgotPassword` resolving true means the request went through, nothing more.

**The signup wizard works the same way, for the same reason.** `send-verification-code` used to answer 409 for an address that already had an account, so signup reported it inline and immediately - which made the care taken in the reset wizard pointless, since the same question was answerable one screen over. The backend now answers 200 either way and mails a code to a free address or a "you already have an account" notice to a taken one, so signup's step two copy is conditional in the same shape ("if x@y.z does not already have an account...") and mentions the notice, because for that user the code they are waiting to paste is never coming. `AuthService.sendVerificationCode` resolving true means the request went through, not that the address is free.

`AuthService.resetPassword` rewrites the stored password behind **two** guards, `rememberMe` and the address matching the remembered one. The login form pre-fills from that store, so skipping the write leaves a filled-in password that has just stopped working; writing it on `rememberMe` alone puts credentials on disk for a user who did not opt in. The address check is specific to reset, the only password flow that runs while signed out and therefore the only one that can be run for an account other than the remembered one - on a shared machine, writing unconditionally would replace someone else's remembered login with this one. That write is wrapped in its own `try`, separate from the request. By the time it runs the password has already changed and the code is spent, so letting a disk failure decide the return value would report a failure for a reset that succeeded and send the user to retry with a code that can no longer work - the same trap the login form avoids when it persists remember-me. `test/password-reset.test.mjs` pins all of it, including the failed-reset case and a store that throws.

The final step latches on success. `loading` is already back to false while the two-second redirect runs, so a live button there would let a second click resend a code the backend has just spent, toasting a guaranteed failure over the success still on screen.

It also carries its own way out, which the signup wizard does not need. `AuthLayout` renders this card and nothing else - no navigation of its own - and the reset code expires on `PASSWORD_RESET_CODE_EXPIRE_MINUTES` while the user is choosing a password. A failure there is therefore both likely and unrecoverable in place, since retrying the same dead code cannot succeed, so the step offers `Start over` (back to step one, address kept and code dropped) and a link to sign in, and the failure copy sends the user for a new code rather than telling them to try again.

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
