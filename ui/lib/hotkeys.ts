export const HOTKEYS: Array<[string, string]> = [
  // App / mode toggles
  ['Ctrl+Alt+Shift+Q', 'Toggle stealth mode'],
  ['Ctrl+Alt+Shift+W', 'Toggle opacity'], // only in stealth mode

  // Window management
  ['Ctrl+Alt+Shift+1-9', 'Place window'], //  corner / side / center
  ['Ctrl+Alt+Shift+ArrowKeys', 'Move window'],
  ['Ctrl+Alt+Shift+F9-F12', 'Resize window'],

  // Suggestions / navigation
  ['Ctrl+Alt+Shift+U / J', 'Scroll interview suggestions'],
  ['Ctrl+Alt+Shift+I / K', 'Scroll code suggestions'],

  // Code suggestions
  ['Ctrl+Alt+Shift+S', 'Capture screenshot'],
  ['Ctrl+Alt+Shift+P', 'Set prompt'],
  ['Ctrl+Alt+Shift+Enter', 'Submit'],
];
