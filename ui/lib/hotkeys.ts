export const HOTKEYS: Array<[string, string]> = [
  // App / mode toggles
  ['Win+Shift+Q', 'Toggle stealth mode'],
  ['Win+Shift+W', 'Toggle opacity'], // only in stealth mode

  // Window management
  ['Win+Ctrl+1-9', 'Place window'], //  corner / side / center
  ['Win+Ctrl+ArrowKeys', 'Move window'],
  ['Win+Ctrl+Shift+ArrowKeys', 'Resize window'],

  // Suggestions / navigation
  ['Ctrl+Shift+U / J', 'Scroll interview suggestions'],
  ['Ctrl+Shift+I / K', 'Scroll code suggestions'],

  // Code suggestions
  ['Ctrl+Shift+S', 'Capture screenshot'],
  ['Ctrl+Shift+P', 'Set prompt'],
  ['Ctrl+Shift+Enter', 'Submit'],
];
