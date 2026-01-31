# Power Interview - Electron App

AI-powered interview preparation assistant with stealth mode overlay.

## Features

- 🎯 **Real-time Interview Assistance** - AI-powered suggestions during interviews
- 👁️ **Stealth Mode** - Transparent overlay window that stays on top
- ⌨️ **Global Hotkeys** - Control the app from anywhere (see [HOTKEYS.md](HOTKEYS.md))
- 🚀 **Auto-Engine Management** - Backend starts automatically
- 💾 **Persistent Settings** - Window position and preferences saved

## Development

```bash
# Install dependencies
npm install

# Run in development mode (Vite + Electron)
npm run electron:dev

# Build for production
npm run electron:build
```

## Scripts

- `npm run dev` - Start Vite dev server only
- `npm run build` - Build renderer (React app)
- `npm run electron:build-main` - Compile Electron main process
- `npm run electron:dev` - Full development with hot reload
- `npm run electron:build` - Build complete installer
- `npm run clean` - Remove dist folder
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Tech Stack

- **Electron 40.1** - Desktop application framework
- **React 19** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **React Router 7** - Navigation
- **Electron Builder** - Packaging and distribution

## Project Structure

```
app/
├── electron/           # Electron main process
│   ├── main.ts        # Entry point
│   ├── preload.cts    # IPC bridge (CommonJS)
│   ├── engine.ts      # Backend management
│   ├── hotkeys.ts     # Global shortcuts
│   └── window-controls.ts  # Window positioning & stealth
├── src/               # React renderer process
│   ├── pages/         # Route components
│   ├── components/    # Reusable components
│   ├── hooks/         # Custom React hooks
│   └── types/         # TypeScript definitions
└── electron-dist/     # Compiled Electron code
```

## Building

The build creates a Windows installer at `../dist/PowerInterview-Setup-{version}.exe`

```bash
npm run electron:build
```

## Hotkeys

See [HOTKEYS.md](HOTKEYS.md) for complete list of keyboard shortcuts.
