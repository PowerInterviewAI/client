# Power Interview - Global Hotkeys

This Electron application supports global system hotkeys for controlling window position and size.

## Available Hotkeys

### App / Mode Toggles

- **Ctrl+Alt+Shift+Q**: Toggle stealth mode
- **Ctrl+Alt+Shift+W**: Toggle opacity (only while in stealth mode)

### Window Management

- **Ctrl+Alt+Shift+1-9**: Place window (numpad layout — 7/8/9 top, 4/5/6 middle, 1/2/3 bottom)
- **Ctrl+Alt+Shift+ArrowKeys**: Move window (small step)
- **Ctrl+Alt+Shift+F1-F4**: Resize window (presets)

### Suggestions / Navigation

- **Ctrl+Alt+Shift+U / J**: Scroll interview suggestions (U = up, J = down)
- **Ctrl+Alt+Shift+I / K**: Scroll code suggestions (I = up, K = down)

### Code Suggestions / Actions

- **Ctrl+Alt+Shift+S**: Capture screenshot (renderer action)
- **Ctrl+Alt+Shift+Enter**: Submit (renderer action)

## Notes

- Hotkeys work globally, even when the application is not in focus
- Window placement uses the primary display's work area (excluding taskbar)
- Window bounds are saved when the application closes
- Hotkeys are registered on startup and unregistered on quit

## Technical Details

- Uses Electron's `globalShortcut` for system-wide hotkeys
- Uses `Ctrl+Alt+Shift` modifiers for all global hotkeys in this set
- Scroll events are delivered via `hotkey-scroll` IPC; renderer can subscribe using `onHotkeyScroll`
