import { getElectron } from '@/lib/utils';
import { useState } from 'react';

export default function useTools() {
  const [exporting, setExporting] = useState(false);

  const exportTranscript = async () => {
    setExporting(true);
    try {
      const electron = getElectron();
      if (!electron) {
        throw new Error('Electron API not available');
      }
      await electron.tools.exportTranscript();
    } catch (error) {
      console.error('Failed to export transcript:', error);
      throw error;
    } finally {
      setExporting(false);
    }
  };
  return {
    exporting,
    exportTranscript,
  } as const;
}
