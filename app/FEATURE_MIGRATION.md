# Feature Migration: ui_container → app

This document describes all features that have been migrated from the `ui_container` project to the `app` project.

## Migrated Features

### 1. **Engine Management** (`engine.ts`)

- Automatic engine process spawning and management
- Dynamic port allocation (finds free port starting from 28080)
- Automatic engine restart on crashes with rate limiting
- Server health check before loading UI
- Development vs production mode support

### 2. **Window Controls** (`window-controls.ts`)

- **Window Positioning**: Move window to 9 predefined positions (numpad layout)
- **Window Movement**: Fine-grained window movement by arrow keys
- **Window Resizing**: Dynamic window resizing with minimum size enforcement
- **Bounds Persistence**: Window bounds saved and restored between sessions

### 3. **Stealth Mode** (`window-controls.ts`)

- **Transparent Overlay**: Semi-transparent window (85% opacity by default)
- **Click-Through**: Mouse events pass through to underlying windows
- **Always On Top**: Window stays above all other applications
- **Non-Focusable**: Doesn't capture keyboard focus
- **Multi-Workspace Support**: Visible on all workspaces and in fullscreen
- **Opacity Toggle**: Switch between high (85%) and low (20%) opacity
- **State Persistence**: Stealth state saved between sessions

### 4. **Global Hotkeys** (`hotkeys.ts`)

All hotkeys work system-wide, even when the app is not focused:

#### Mode Toggles

- `Ctrl+Shift+Q`: Toggle stealth mode
- `Ctrl+Shift+D`: Toggle opacity (stealth mode only)

#### Window Positioning (Numpad Layout)

- `Ctrl+Shift+1-9`: Place window at specific position
  - 7, 8, 9: Top row (left, center, right)
  - 4, 5, 6: Middle row (left, center, right)
  - 1, 2, 3: Bottom row (left, center, right)

#### Window Movement

- `Ctrl+Alt+Shift+Arrow`: Move window in small steps (20px)

#### Window Resizing

- `Ctrl+Win+Shift+Arrow`: Resize window (20px increments)

#### Content Navigation

- `Ctrl+Shift+J/K`: Scroll interview suggestions (J=down, K=up)
- `Ctrl+Shift+U/I`: Scroll code suggestions (U=down, I=up)

### 5. **IPC Communication** (`preload.ts`)

Secure bridge between main and renderer processes:

- Window control commands (minimize, close, resize)
- Stealth mode controls
- Hotkey scroll event forwarding
- Type-safe API using TypeScript interfaces

### 6. **Persistent Storage**

Using `electron-store` for:

- Window bounds (position, size)
- Stealth mode state (disabled by default)

### 7. **Performance Optimizations**

- Background timer throttling disabled for smooth video playback
- Renderer backgrounding disabled
- Occluded windows rendering maintained
- Content protection enabled (prevents screen capture)

### 8. **Single Instance Lock**

- Only one instance of the application can run
- Focuses existing window when second instance is launched

### 9. **Custom Window Frame**

- Frameless window with custom title bar support
- Transparent window support
- Menu bar hidden and disabled

## File Structure

```
app/
├── electron/
│   ├── main.ts              # Main Electron process with all integrations
│   ├── preload.ts           # IPC bridge with type safety
│   ├── engine.ts            # Engine process management
│   ├── window-controls.ts   # Window positioning and stealth mode
│   └── hotkeys.ts           # Global hotkey registration
├── src/
│   ├── electron.d.ts        # TypeScript definitions for renderer
│   └── hooks/
│       └── useElectron.ts   # React hooks for Electron features
├── HOTKEYS.md              # Hotkey documentation
└── package.json            # Updated with electron-store and build config
```

## Usage in React Components

### Window Controls

```typescript
import { useWindowControls } from '@/hooks/useElectron';

function MyComponent() {
  const { minimize, close, toggleStealth } = useWindowControls();

  return (
    <div>
      <button onClick={minimize}>Minimize</button>
      <button onClick={close}>Close</button>
      <button onClick={toggleStealth}>Toggle Stealth</button>
    </div>
  );
}
```

### Hotkey Scroll Events

```typescript
import { useHotkeyScroll } from '@/hooks/useElectron';

function SuggestionsList() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useHotkeyScroll('0', (direction) => {
    if (direction === 'up') {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else {
      setSelectedIndex(i => Math.min(items.length - 1, i + 1));
    }
  });

  return <div>...</div>;
}
```

## Build Configuration

### Development

```bash
pnpm run electron:dev
```

### Production Build

```bash
pnpm run electron:build
```

The build configuration includes:

- NSIS installer for Windows
- Custom app ID: `ai.power-interview`
- Desktop and Start Menu shortcuts
- Engine binary bundled in `bin/` directory
- Resources bundled in `resources/` directory

## Dependencies Added

- `electron-store@^11.0.2` - Persistent storage for settings

## Breaking Changes from ui_container

1. **Language**: Converted from JavaScript to TypeScript
2. **Module System**: Using ES modules instead of CommonJS in renderer
3. **Build Output**: Files compiled to `electron-dist/` with `.cjs` extension
4. **Type Safety**: All APIs now have TypeScript definitions
5. **React Integration**: Added custom hooks for using features in React

## Testing Checklist

- [ ] Single instance lock works (can't open multiple instances)
- [ ] Window positioning hotkeys work (Ctrl+Shift+1-9)
- [ ] Window movement works (Ctrl+Alt+Shift+Arrows)
- [ ] Window resizing works (Ctrl+Win+Shift+Arrows)
- [ ] Stealth mode toggle works (Ctrl+Shift+Q)
- [ ] Opacity toggle works in stealth (Ctrl+Shift+D)
- [ ] Hotkey scroll events reach renderer (Ctrl+Shift+J/K/U/I)
- [ ] Window bounds persist between restarts
- [ ] Engine starts automatically in production
- [ ] Content protection prevents screen capture
- [ ] Window is frameless with custom title bar
- [ ] Menu bar is hidden

## Future Enhancements

- [ ] Add window snapping to screen edges
- [ ] Add custom window dragging zones
- [ ] Add window shake to restore from stealth
- [ ] Add hotkey customization UI
- [ ] Add multiple monitor support
- [ ] Add window state persistence (maximized, minimized)
