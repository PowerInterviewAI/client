import * as React from 'react';

// Lets any descendant (menu item, start-checks) open the configuration dialog without each
// owning its own dialog instance - the dialog itself is mounted once in MainFrame.
interface ConfigurationDialogContextValue {
  openConfigurationDialog: () => void;
}

export const ConfigurationDialogContext =
  React.createContext<ConfigurationDialogContextValue | null>(null);

export function useConfigurationDialog(): ConfigurationDialogContextValue {
  const ctx = React.useContext(ConfigurationDialogContext);
  if (!ctx) {
    throw new Error('useConfigurationDialog must be used within MainFrame');
  }
  return ctx;
}
