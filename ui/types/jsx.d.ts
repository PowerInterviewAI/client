// Some dependencies (e.g. react-markdown) reference the global `JSX` namespace.
// Ensure it exists by wiring it to React's JSX definitions.

import type { JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

export {};
