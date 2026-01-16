export const HOTKEYS: Array<[string, string, string]> = [
  // App / mode toggles
  ['Ctrl+Shift+Q', 'Toggle stealth', 'Toggle stealth mode on or off'],
  ['Ctrl+Shift+D', 'Toggle opacity', 'Toggle window opacity (only in stealth mode)'],

  // Window management
  ['Ctrl+Shift+1-9', 'Place window', 'Place window in a specific corner, side, or center'],
  ['Ctrl+Alt+Shift+Arrow', 'Move window', 'Move window in the specified direction'],
  ['Ctrl+Win+Shift+Arrow', 'Resize window', 'Resize window in the specified direction'],

  // Suggestions / navigation
  [
    'Ctrl+Shift+U / J',
    'Scroll reply suggestions',
    'Scroll Up/Down in the interview reply suggestions panel',
  ],
  [
    'Ctrl+Shift+I / K',
    'Scroll code suggestions',
    'Scroll Up/Down in the coding test suggestions panel',
  ],
  // Code suggestions
  ['Ctrl+Alt+Shift+S', 'Screenshot', 'Take a screenshot for code suggestions'],
  ['Ctrl+Alt+Shift+C', 'Clear screenshots', 'Clear pending screenshots for code suggestions'],
  ['Ctrl+Alt+Shift+Enter', 'Submit', 'Submit prompt for code suggestions'],
];
