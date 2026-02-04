import { ipcMain } from 'electron';
import { transcriptService } from '../services/transcript.service.js';

export function registerTranscriptHandlers() {
  ipcMain.handle('transcription:clear', async () => {
    transcriptService.clear();
  });
  ipcMain.handle('transcription:start', async () => {
    await transcriptService.startSelfTranscription();
    await transcriptService.startOtherTranscription();
  });
  ipcMain.handle('transcription:stop', async () => {
    await transcriptService.stopSelfTranscription();
    await transcriptService.stopOtherTranscription();
  });
}
