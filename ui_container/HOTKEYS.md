# Power Interview - Global Hotkeys

This Electron application supports global system hotkeys for controlling window position and size.

## Available Hotkeys

### Window Positioning

- **Ctrl+Alt+1**: Move window to top-left corner
- **Ctrl+Alt+2**: Move window to top-right corner
- **Ctrl+Alt+3**: Move window to bottom-left corner
- **Ctrl+Alt+4**: Move window to bottom-right corner
- **Ctrl+Alt+5**: Center window on screen

### Fine Movement Controls

- **Ctrl+Alt+↑**: Move window up by 20 pixels
- **Ctrl+Alt+↓**: Move window down by 20 pixels
- **Ctrl+Alt+←**: Move window left by 20 pixels
- **Ctrl+Alt+→**: Move window right by 20 pixels

### Suggestion Scrolling

- **Ctrl+Alt+Page Up**: Scroll suggestions up
- **Ctrl+Alt+Page Down**: Scroll suggestions down

### Window Resizing Controls

- **Ctrl+Shift+↑**: Decrease window height by 20 pixels
- **Ctrl+Shift+↓**: Increase window height by 20 pixels
- **Ctrl+Shift+←**: Decrease window width by 20 pixels
- **Ctrl+Shift+→**: Increase window width by 20 pixels

### Window Opacity Controls

- **Ctrl+Shift+X**: Toggle window opacity (only available when Stealth mode is enabled)

### Stealth Mode

- **Ctrl+Alt+S**: Toggle stealth mode — window remains always-on-top and transparent but becomes click-through and non-focusable (mouse/keyboard events pass to underlying apps)

## Notes

- Hotkeys work globally, even when the application is not in focus
- The window position uses the primary display's work area (excluding taskbar)
- Window bounds are automatically saved when the application closes
- Hotkeys are registered when the application starts and unregistered when it quits

## Technical Details

- Uses Electron's `globalShortcut` module for system-wide hotkey registration
- Compatible with Windows (Ctrl+Alt+_) and macOS (Cmd+Alt+_)
- Window positioning calculations account for screen work area and current window size
