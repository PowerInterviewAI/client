# Quick Reference Guide - Power Interview Client

## Development Commands

### Start Development Server

```bash
npm run electron:dev
```

This will:

1. Build Electron main process (TypeScript → JavaScript)
2. Start Vite dev server on http://localhost:5173
3. Launch Electron app with hot reload

### Build for Production

```bash
npm run electron:build
```

This creates a distributable package in the `dist/` folder.

### Linting and Type Checking

```bash
# Run ESLint
npm run lint

# Build main process (TypeScript check)
npm run electron:build-main

# Build renderer (Vite + TypeScript)
npm run build
```

## Key Features

### Authentication with Credential Storage

- Login credentials are securely stored in Electron store
- Auto pre-fill email and password on next login
- Token saved for API authentication
- Credentials cleared on logout

### State Persistence

- All app state stored in Electron main process
- State persists across page refreshes
- React Context polls state every 1 second

### Health Checks

- Backend health check every 60s (when live)
- Rapid retry every 1s (when offline)
- GPU server monitoring
- App state updates automatically

### Global Hotkeys

- `Ctrl+Shift+Q`: Toggle stealth mode
- `Ctrl+Shift+D`: Toggle opacity (stealth only)
- `Ctrl+Shift+1-9`: Place window (numpad layout)
- `Ctrl+Alt+Shift+Arrow`: Move window
- `Ctrl+Win+Shift+Arrow`: Resize window
- `Ctrl+Shift+J/K`: Scroll interview suggestions
- `Ctrl+Shift+U/I`: Scroll code suggestions

## Project Structure

```
src/
├── main/          # Electron main process (Node.js)
│   ├── index.ts   # Entry point
│   ├── ipc/       # IPC handlers
│   ├── services/  # Business logic
│   └── store/     # Persistent storage
│
└── renderer/      # React app (Browser)
    ├── components/
    ├── hooks/
    ├── pages/
    └── types/
```

## Common Tasks

### Adding a New IPC Handler

1. Create handler in `src/main/ipc/your-handler.ts`
2. Register in `src/main/index.ts`
3. Add type definition in `src/renderer/types/electron-api.d.ts`
4. Expose in `src/main/preload.cts`
5. Use in React: `window.electronAPI.yourHandler()`

### Adding State to App State

1. Update type in `src/renderer/types/app-state.ts`
2. Update `src/main/services/health-check.service.ts`
3. Add handler in `src/main/ipc/app-state.ts`
4. Access via `useAppState()` hook in React

### Updating Config

1. Modify type in `src/renderer/types/config.ts`
2. Update `src/main/services/config.service.ts`
3. Use `useConfigStore()` hook in React

## Troubleshooting

### "Module not found" errors

- Run `npm run electron:build-main` to compile TypeScript
- Check `.js` extension in imports (required for ESM)

### State not updating in React

- Check Electron main process console for errors
- Verify IPC handlers are registered in `src/main/index.ts`
- Ensure `useAppState()` is wrapped in `<AppStateProvider>`

### Backend connection failures

- Normal when backend server is not running
- Start backend on http://localhost:28080
- Check `serverUrl` in config

### Window not opening

- Check Electron console for errors
- Verify `index.html` exists in root
- Check Vite dev server is running on port 5173

## File Locations

### Configuration

- Main process: `src/main/config/`
- Persistent storage: Electron's app data folder
  - Windows: `%APPDATA%/power-interview/`
  - macOS: `~/Library/Application Support/power-interview/`
  - Linux: `~/.config/power-interview/`

### Logs

- Console output in terminal running `npm run electron:dev`
- Renderer logs in DevTools (Ctrl+Shift+I)

### Build Output

- Electron compiled: `electron-dist/`
- React compiled: `dist/`
- Final package: `build/` (after `npm run electron:build`)

## Dependencies

### Key Libraries

- **Electron**: Desktop app framework
- **React 19**: UI framework
- **Vite**: Build tool and dev server
- **electron-store**: Persistent configuration storage
- **axios**: HTTP client
- **@tanstack/react-query**: API state management
- **Radix UI**: Headless UI components

### Build Tools

- **TypeScript**: Type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Environment Variables

### Development

- `NODE_ENV=development`: Set automatically by `electron:dev`
- `VITE_DEV_SERVER_URL`: Vite dev server (http://localhost:5173)

### Production

- `NODE_ENV=production`: Set by build process

## Backend Integration

### Expected Backend Endpoints

- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `GET /auth/logout` - User logout
- `POST /auth/change-password` - Password change
- `GET /api/health` - Health check
- `POST /api/ping-client` - Client ping
- `GET /api/gpu-health` - GPU server health
- `POST /api/gpu-wakeup` - Wake GPU server
- `WS /api/asr/streaming` - ASR transcription stream

### Default Backend URL

- Development: `http://localhost:28080`
- Configurable via Electron config

## Testing

### Manual Testing Checklist

- [ ] App launches without errors
- [ ] Login page loads
- [ ] Credentials pre-fill on subsequent launches
- [ ] Health status updates (when backend running)
- [ ] Global hotkeys work
- [ ] Window controls work (minimize, close, resize)
- [ ] Stealth mode toggles
- [ ] Transcription starts/stops
- [ ] Suggestions display correctly

### Automated Testing

Currently not implemented. Future enhancement.

## Performance Tips

- Use React DevTools Profiler to identify slow components
- Check for unnecessary re-renders with `useMemo` and `useCallback`
- Monitor IPC call frequency (avoid calling too often)
- Use `console.time()` for performance measurements

## Security Notes

- Auth credentials are encrypted with `electron-store`
- Encryption key is currently hardcoded (TODO: use machine-specific key)
- Session tokens stored securely
- No sensitive data in renderer console
- IPC communication is sandboxed

## Contributing

### Code Style

- Follow existing patterns
- Use TypeScript strict mode
- Add JSDoc comments for complex functions
- Run `npm run lint` before committing

### Git Workflow

- Keep commits atomic and descriptive
- Test changes with `npm run electron:dev`
- Ensure `npm run electron:build` succeeds

## Support

For issues or questions:

1. Check this guide
2. Review `docs/REFACTORING_SUMMARY.md`
3. Check console logs for errors
4. Review IPC handlers in `src/main/ipc/`
