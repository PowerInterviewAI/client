# Electron Architecture

This document describes the structure and organization of the Electron main process code.

## Directory Structure

```
electron/
├── api/                    # Backend API clients
│   ├── client.ts          # Base HTTP client
│   ├── auth.ts            # Authentication API
│   ├── app.ts             # App state API
│   └── index.ts           # Barrel export
├── config/                 # Configuration modules
│   ├── app.ts             # Application config
│   ├── auth.ts            # Auth config
│   ├── asr.ts             # Speech recognition config
│   ├── llm.ts             # LLM config
│   ├── video.ts           # Video/camera config
│   └── index.ts           # Barrel export
├── services/               # Business logic services
│   ├── config.service.ts          # Configuration persistence
│   ├── audio-device.service.ts    # Audio device management (SKELETON)
│   ├── audio-record.service.ts    # Audio recording (SKELETON)
│   ├── asr.service.ts             # Speech recognition (SKELETON)
│   ├── transcript.service.ts      # Transcript management
│   ├── code-suggestion.service.ts # Code suggestions (SKELETON)
│   ├── reply-suggestion.service.ts # Reply suggestions (SKELETON)
│   ├── webrtc.service.ts          # WebRTC (SKELETON)
│   └── index.ts                   # Barrel export
├── types/                  # TypeScript type definitions
│   ├── app-state.ts       # App state types
│   ├── auth.ts            # Authentication types
│   ├── asr.ts             # Speech recognition types
│   ├── webrtc.ts          # WebRTC types
│   ├── error.ts           # Error classes
│   └── index.ts           # Barrel export
├── utils/                  # Utility functions
│   ├── datetime.ts        # Date/time helpers
│   ├── uuid.ts            # UUID generation
│   ├── random.ts          # Random utilities
│   ├── env.ts             # Environment helpers
│   └── index.ts           # Barrel export
├── main.ts                 # Main process entry point
├── preload.cts             # IPC bridge (CommonJS)
├── engine.ts               # Backend engine manager
├── hotkeys.ts              # Global hotkeys
└── window-controls.ts      # Window positioning & stealth
```

## Module Organization

### Config Modules

Configuration is split into focused modules:

- **app.ts**: Core app settings (ports, paths, debug flags)
- **auth.ts**: Authentication settings (session timeout, cookie name)
- **asr.ts**: Speech recognition settings (engine, model, language)
- **llm.ts**: LLM settings (provider, model, temperature)
- **video.ts**: Video/camera settings (resolution, codec)

All configs are accessible via barrel export: `import { configManager, asrConfig } from './config'`

### Service Layer

Services implement business logic following singleton pattern:

**Fully Implemented:**

- `ConfigService`: Persistent config storage using electron-store
- `TranscriptService`: Manage interview transcription sessions

**Skeletons (require implementation):**

- `AudioDeviceService`: Audio I/O device enumeration
- `AudioRecordService`: Microphone recording
- `AsrService`: Speech-to-text (Whisper/Vosk integration)
- `CodeSuggestionService`: LLM-powered code suggestions
- `ReplySuggestionService`: LLM-powered reply suggestions
- `WebRtcService`: Peer-to-peer video connections

All services are singletons accessed via `getInstance()`:

```typescript
import { asrService } from './services';
await asrService.start();
```

### API Clients

Type-safe HTTP clients for backend communication:

- `ApiClient`: Base HTTP client with auth token management
- `AuthApi`: Login, logout, token refresh
- `AppApi`: App state, health checks

Usage:

```typescript
import { createApi } from './api';
const api = createApi('http://localhost:28080');
const response = await api.auth.login({ email, password });
```

### Type Definitions

Shared TypeScript types for type safety:

- `AppState`: Application state structure
- `Session`, `TranscriptEntry`, `Suggestion`: Transcript types
- `AuthSession`, `AuthToken`: Authentication types
- `AsrResult`, `AsrSegment`: Speech recognition types
- Error classes: `AppError`, `AuthError`, `ValidationError`, `NotFoundError`

### Utilities

Common helper functions:

- `DateTimeUtil`: Date formatting, parsing, manipulation
- `UuidUtil`: UUID v4 generation and validation
- `RandomUtil`: Random number/string generation
- `EnvUtil`: Environment variable helpers

## Design Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **Singleton Services**: Stateful services use singleton pattern
3. **Barrel Exports**: Each directory has `index.ts` for clean imports
4. **Type Safety**: Everything is fully typed with TypeScript
5. **Convention over Configuration**: Standard ES modules with `.js` imports

## Implementing Skeletons

Services marked as SKELETON need implementation:

### AudioDeviceService

- Use `navigator.mediaDevices.enumerateDevices()` in renderer
- Or native addon for main process access
- Listen to `devicechange` events

### AudioRecordService

- Use `node-record-lpcm16` or `portaudio` for audio capture
- Emit `data` events with audio buffers
- Configure sample rate (16kHz recommended for ASR)

### AsrService

- Load Whisper model from `models/` folder
- Use `whisper.cpp` bindings or `@voskapi/vosk-node`
- Process audio chunks → emit transcript events

### Code/Reply SuggestionServices

- Integrate OpenAI/Anthropic API
- Build context-aware prompts
- Parse and structure LLM responses

### WebRtcService

- Set up ICE servers (STUN/TURN)
- Implement signaling mechanism
- Handle peer connections and data channels

## Integration with main.ts

Import and initialize services in `main.ts`:

```typescript
import { configService } from './services';
import { createApi } from './api';

// On app ready
configService.load();
const api = createApi(`http://localhost:${port}`);
```

Services are available globally once initialized.
