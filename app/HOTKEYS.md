# Power Interview - Global Hotkeys

This Electron application supports global system hotkeys for controlling window position and size.

## Available Hotkeys

### App / Mode Toggles

- **Ctrl+Shift+Q**: Toggle stealth mode
- **Ctrl+Shift+D**: Toggle opacity (only while in stealth mode)

### Window Management

- **Ctrl+Shift+1-9**: Place window (numpad layout — 7/8/9 top, 4/5/6 middle, 1/2/3 bottom)
- **Ctrl+Alt+Shift+ArrowKeys**: Move window (small step)
- **Ctrl+Win+Shift+ArrowKeys**: Resize window

### Suggestions / Navigation

- **Ctrl+Shift+J / K**: Scroll interview suggestions (J = down, K = up)
- **Ctrl+Shift+U / I**: Scroll code suggestions (U = down, I = up)

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
- Scroll events are delivered via `hotkey-scroll` IPC; renderer can subscribe using `onHotkeyScroll`

## Stealth Mode

Stealth mode makes the window:

- Transparent (semi-transparent overlay)
- Click-through (mouse events pass to windows below)
- Always on top (stays above all other windows)
- Non-focusable (doesn't capture keyboard focus)
- Visible on all workspaces and in fullscreen mode

Use this mode to overlay the application over interview platforms while maintaining access to other windows.
