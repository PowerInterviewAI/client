export const HOTKEYS: Array<[string, string, string]> = [
  // General
  ['Ctrl+Shift+Q', 'Stop', 'Stop assistant'],

  // App / mode toggles
  ['Ctrl+Shift+M', 'Stealth', 'Toggle stealth mode on or off'],
  ['Ctrl+Shift+N', 'Opacity', 'Toggle window opacity (only in stealth mode)'],

  // Window management
  ['Ctrl+Shift+1-9', 'Place Win', 'Place window in a specific corner, side, or center'],
  ['Ctrl+Alt+Shift+Arrow', 'Move Win', 'Move window in the specified direction'],
  ['Ctrl+Win+Shift+Arrow', 'Resize Win', 'Resize window in the specified direction'],

  // Suggestions / navigation
  [
    'Ctrl+Shift+J / K',
    'Scroll reply suggestions',
    'Scroll Down/Up in the interview reply suggestions panel',
  ],
  [
    'Ctrl+Shift+U / I',
    'Scroll code suggestions',
    'Scroll Down/Up in the coding test suggestions panel',
  ],
  // Code suggestions
  ['Ctrl+Alt+Shift+P', 'Capture', 'Take a screenshot for code suggestions'],
  ['Ctrl+Alt+Shift+X', 'Clear captures', 'Clear pending screenshots for code suggestions'],
  ['Ctrl+Alt+Shift+Enter', 'Submit', 'Submit prompt for code suggestions'],
];
