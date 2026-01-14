# Power Interview - Global Hotkeys

This Electron application supports global system hotkeys for controlling window position and size.

## Available Hotkeys

### App / Mode Toggles

- **Win+Shift+Q**: Toggle stealth mode
- **Win+Shift+W**: Toggle opacity (only while in stealth mode)

### Window Management

- **Win+Ctrl+1-9**: Place window (numpad layout — 7/8/9 top, 4/5/6 middle, 1/2/3 bottom)
- **Win+Ctrl+ArrowKeys**: Move window (small step)
- **Win+Ctrl+Shift+ArrowKeys**: Resize window (small step)

### Suggestions / Navigation

- **Ctrl+Shift+U / J**: Scroll interview suggestions (U = up, J = down)
- **Ctrl+Shift+I / K**: Scroll code suggestions (I = up, K = down)

### Code Suggestions / Actions

- **Ctrl+Shift+S**: Capture screenshot (renderer action)
- **Ctrl+Shift+P**: Set prompt (renderer action)
- **Ctrl+Shift+Enter**: Submit (renderer action)

## Notes

- Hotkeys work globally, even when the application is not in focus
- Window placement uses the primary display's work area (excluding taskbar)
- Window bounds are saved when the application closes
- Hotkeys are registered on startup and unregistered on quit

## Technical Details

- Uses Electron's `globalShortcut` for system-wide hotkeys
- Uses `Super` (Win) + modifiers for window-positioning and mode toggles
- Scroll events are delivered via `hotkey-scroll` IPC; renderer can subscribe using `onHotkeyScroll`
- Other renderer actions are delivered via `hotkey-action` IPC and can be subscribed using `onHotkeyAction`
