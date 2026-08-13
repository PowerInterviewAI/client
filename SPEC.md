# SPEC.md

Project specification for Power Interview AI - a privacy-first AI-powered interview assistant.

## Overview

Power Interview is an Electron desktop application that provides real-time transcription and AI suggestions during live job interviews. Audio is relayed through the backend to the ASR provider for transcription, but no interview audio or transcript is stored on external servers - transcripts exist only in memory for the duration of the session.

## Tech Stack

| Layer           | Technology                                  |
| --------------- | ------------------------------------------- |
| Desktop shell   | Electron 40                                 |
| Renderer        | React 19, TypeScript, Vite                  |
| Styling         | Tailwind CSS v4, shadcn/ui                  |
| State           | Zustand (config), React Context (app state) |
| Data fetching   | TanStack Query v5                           |
| HTTP            | Native `fetch`, main process only           |
| Persistence     | Electron Store (local settings), backend account (interview config) |
| Build/dist      | electron-builder, GitHub Releases           |
| Package manager | pnpm                                        |

## Process Architecture

```
src/
  main/          Electron main process (Node.js)
    api/         HTTP clients (AuthApi, LLMApi, PaymentApi, HealthCheckApi, UsersApi)
    ipc/         IPC handler files, one per domain
    services/    Business logic called by IPC handlers
    store/       config.store.ts - electron-store wrapper for local settings
    preload.cts  Exposes window.electronAPI to renderer
    consts.ts    Backend URL and other constants
  renderer/      React/Vite frontend
    hooks/       use-app-state.tsx (AppState), use-config-store.ts (ConfigStore)
    router.tsx   Hash-based router
test/            Node-based checks for the main process (pnpm test:main)
```

## IPC Namespaces

`window.electronAPI` exposes the namespaces `config`, `auth`, `account`, `payment`, `llm`, `appState`, `transcription`, `liveSuggestion`, `actionSuggestion`, `tools`, `autoUpdater`, `zoom`, and `permissions`, plus flat window controls (`close`, `minimize`, `maximize`) and shell helpers (`openExternal`, `openFile`, `showInFolder`).

## Key Features

### Dual-Channel Transcription

Real-time ASR via WebSocket streaming on two separate channels - the interviewer (`ch_0`, captured via system audio loopback) and the user (`ch_1`, captured via microphone). Service: [src/main/services/transcript.service.ts](src/main/services/transcript.service.ts).

### Live Suggestions

Streaming AI responses generated from the user's CV and job description, triggered by live transcript context. Service: [src/main/services/suggestion-live.service.ts](src/main/services/suggestion-live.service.ts).

### Action Suggestions

Screenshot-based problem solving. Accepts up to 4 images, sends them to the LLM backend, returns syntax-highlighted code output. Service: [src/main/services/suggestion-action.service.ts](src/main/services/suggestion-action.service.ts).

### Session Window Behaviour

While the assistant is running - or while stealth mode is on - the window is pinned above other windows (`screen-saver` level, and visible over a fullscreen call on macOS) and drops its taskbar button and Dock icon. The two conditions are independent: switching stealth off mid-session leaves both in place until the session actually stops. macOS traffic lights stay visible outside stealth, since the window is still interactive. Service: [src/main/services/window-control.service.ts](src/main/services/window-control.service.ts).

### Interview Config Sync

Full name, profile/CV, and context are stored on the user's backend account and pulled on login or a remembered session, so the setup follows the user across devices. Service: [src/main/services/account.service.ts](src/main/services/account.service.ts). The full values are kept in the main process and fetched on demand over `account:get`; the app-state broadcast carries only a `{ fullName, hasProfileData }` summary, since the profile and context can each run to 128,000 characters.

### Credits and Payments

Purchase and usage tracking via the payment API. Route: `/payment`. Plans and the credit balance are always served by the backend (`/api/payment/plans`, `/api/payment/credits`, plus the balance carried on every 5-second `/api/health-check/ping-client`); the client holds no local pricing, so a failed plan fetch surfaces as an error rather than falling back to stale figures.

### Auto-Updates

electron-updater publishes to GitHub Releases under `PowerInterviewAI/client` (configured in `package.json` build.publish).

## Backend Communication

- REST (HTTP): auth, account / interview config (`/api/users`), payment, LLM suggestions
- WebSocket: real-time transcription streaming
- API client: [src/main/api/client.ts](src/main/api/client.ts) - fetch-based, Bearer token auth, streaming support. Request timeouts are opt-in per call via `timeoutMs` (health-check pings use 10s, `UsersApi` 30s); `requestStream` is deliberately untimed, since suggestion streams are long-lived

## Privacy Model

- Interview configuration (full name, CV/profile, context) is stored on the backend against the
  user's account so it follows them across devices - it is not kept on local disk
- Device-specific settings (audio device, window bounds, scroll preferences) stay on the device
- Only the minimum data needed for AI suggestions is sent to the backend
- No transcript storage on external servers - transcripts stay in memory for the session
- Credentials are stored locally by Electron Store in the OS user-data directory. No encryption key is configured, so the file is plain JSON protected by filesystem permissions

## Platform Support

- Windows 10/11 x64 (NSIS installer)
- macOS 14.4+ Apple Silicon and Intel (DMG + ZIP) - 14.4 is required for system-audio loopback capture

## Project Structure

```
power-interview-client/
  src/
    main/
    renderer/
  test/           Main-process checks, run with `pnpm test:main` (needs Node >= 22.15)
  public/
  build/          Build resources (icons, entitlements)
  release/        electron-builder output (gitignored)
  electron-dist/  Compiled main process (gitignored)
  dist/           Compiled renderer (gitignored)
  .claude/
    skills/       Project-level Claude Code skills
  pnpm-workspace.yaml
  .npmrc
```
