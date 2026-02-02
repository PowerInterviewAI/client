/**
 * Transcription Service
 * Manages self and other party transcription using ASR agents
 */

import { spawn, ChildProcess } from 'child_process';
import * as zmq from 'zeromq';
import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { configManager } from '../config/app.js';
import { ConfigStore } from '../store/config-store.js';
import { EnvUtil } from '../utils/env.js';

interface TranscriptMessage {
  text: string;
  isFinal: boolean;
  speaker: 'user' | 'interviewer';
  timestamp: Date;
}

interface AgentProcess {
  process: ChildProcess;
  socket: zmq.Subscriber | null;
  port: number;
  speaker: 'user' | 'interviewer';
  restartCount: number;
  isRestarting: boolean;
}

// Constants
const SELF_ZMQ_PORT = 50002;
const OTHER_ZMQ_PORT = 50003;
const MAX_RESTART_COUNT = 5;
const RESTART_DELAY_MS = 2000;

class TranscriptionService {
  private selfAgent: AgentProcess | null = null;
  private otherAgent: AgentProcess | null = null;
  private configService: ConfigStore;

  constructor() {
    this.configService = ConfigStore.getInstance();
  }

  /**
   * Start self transcription (user's audio)
   */
  async startSelfTranscription(): Promise<void> {
    if (this.selfAgent) {
      console.log('Self transcription already active');
      return;
    }

    console.log('Starting self transcription...');

    // Get audio device from config
    const config = await this.configService.getConfig();
    const audioDevice = config.audio_input_device_name || 'loopback';

    try {
      this.selfAgent = await this.startAgent(SELF_ZMQ_PORT, audioDevice, 'user');
      console.log('Self transcription started successfully');
    } catch (error) {
      console.error('Failed to start self transcription:', error);
      this.selfAgent = null;
      throw error;
    }
  }

  /**
   * Stop self transcription
   */
  async stopSelfTranscription(): Promise<void> {
    if (!this.selfAgent) {
      console.log('Self transcription not active');
      return;
    }

    console.log('Stopping self transcription...');
    await this.stopAgent(this.selfAgent);
    this.selfAgent = null;
    console.log('Self transcription stopped');
  }

  /**
   * Start other party transcription (remote audio via loopback)
   */
  async startOtherTranscription(): Promise<void> {
    if (this.otherAgent) {
      console.log('Other transcription already active');
      return;
    }

    console.log('Starting other party transcription...');

    try {
      // Other party always uses loopback
      this.otherAgent = await this.startAgent(OTHER_ZMQ_PORT, 'loopback', 'interviewer');
      console.log('Other transcription started successfully');
    } catch (error) {
      console.error('Failed to start other transcription:', error);
      this.otherAgent = null;
      throw error;
    }
  }

  /**
   * Stop other party transcription
   */
  async stopOtherTranscription(): Promise<void> {
    if (!this.otherAgent) {
      console.log('Other transcription not active');
      return;
    }

    console.log('Stopping other party transcription...');
    await this.stopAgent(this.otherAgent);
    this.otherAgent = null;
    console.log('Other transcription stopped');
  }

  /**
   * Start an ASR agent process
   */
  private async startAgent(
    port: number,
    audioSource: string,
    speaker: 'user' | 'interviewer'
  ): Promise<AgentProcess> {
    // Get agent executable path
    const { command, args: baseArgs } = this.getAgentCommand();
    const serverUrl = configManager.get('serverUrl');
    const wsUrl = `${serverUrl.replace('http', 'ws')}/api/asr/streaming`;

    // Get session token (will be added when auth service is available)
    const sessionToken = ''; // TODO: Get from auth service

    console.log(`Starting ASR agent: ${command}`);
    console.log(`Audio source: ${audioSource}, Port: ${port}, Speaker: ${speaker}`);

    // Build arguments
    const args = [
      ...baseArgs,
      '--port',
      port.toString(),
      '--source',
      audioSource,
      '--url',
      wsUrl,
      '--watch-parent', // Enable parent process monitoring
    ];

    if (sessionToken) {
      args.push('--token', sessionToken);
    }

    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false,
    });

    // Log agent output
    proc.stdout?.on('data', (data) => {
      console.log(`[ASR ${speaker}]`, data.toString().trim());
    });

    proc.stderr?.on('data', (data) => {
      console.error(`[ASR ${speaker} ERROR]`, data.toString().trim());
    });

    const agentProcess: AgentProcess = {
      process: proc,
      socket: null,
      port,
      speaker,
      restartCount: 0,
      isRestarting: false,
    };

    // Setup ZeroMQ subscriber
    await this.setupZmqSubscriber(agentProcess);

    // Handle process exit
    proc.on('exit', (code, signal) => {
      console.log(`ASR agent (${speaker}) exited: code=${code}, signal=${signal}`);
      this.handleAgentExit(agentProcess);
    });

    proc.on('error', (error) => {
      console.error(`ASR agent (${speaker}) process error:`, error);
    });

    return agentProcess;
  }

  /**
   * Setup ZeroMQ subscriber for an agent
   */
  private async setupZmqSubscriber(agent: AgentProcess): Promise<void> {
    try {
      const sock = new zmq.Subscriber();
      sock.connect(`tcp://localhost:${agent.port}`);
      sock.subscribe(''); // Subscribe to all messages

      agent.socket = sock;

      // Start receiving messages
      this.receiveMessages(agent);

      console.log(`ZeroMQ subscriber connected on port ${agent.port}`);
    } catch (error) {
      console.error('Failed to setup ZeroMQ subscriber:', error);
      throw error;
    }
  }

  /**
   * Receive messages from ZeroMQ socket
   */
  private async receiveMessages(agent: AgentProcess): Promise<void> {
    if (!agent.socket) return;

    try {
      for await (const [msg] of agent.socket) {
        const message = msg.toString();
        console.log(`[ZMQ ${agent.speaker}] Received:`, message);

        // Parse message format: "FINAL: text" or "PARTIAL: text"
        const isFinal = message.startsWith('FINAL:');
        const text = message.replace(/^(FINAL|PARTIAL):\s*/, '').trim();

        if (text) {
          const transcript: TranscriptMessage = {
            text,
            isFinal,
            speaker: agent.speaker,
            timestamp: new Date(),
          };

          // Send to renderer
          this.sendTranscriptToRenderer(transcript);
        }
      }
    } catch (error) {
      if (agent.socket) {
        console.error(`Error receiving ZMQ messages for ${agent.speaker}:`, error);
      }
    }
  }

  /**
   * Send transcript to renderer process
   */
  private sendTranscriptToRenderer(transcript: TranscriptMessage): void {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('transcript-update', transcript);
    }
  }

  /**
   * Stop an agent process
   */
  private async stopAgent(agent: AgentProcess): Promise<void> {
    // Close ZeroMQ socket
    if (agent.socket) {
      try {
        agent.socket.close();
        agent.socket = null;
      } catch (error) {
        console.error('Error closing ZeroMQ socket:', error);
      }
    }

    // Kill the process
    if (agent.process && !agent.process.killed) {
      try {
        agent.process.kill('SIGTERM');

        // Wait for graceful shutdown, then force kill if needed
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (!agent.process.killed) {
              console.log('Force killing agent process...');
              agent.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);

          agent.process.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (error) {
        console.error('Error stopping agent process:', error);
      }
    }
  }

  /**
   * Handle agent process exit
   */
  private async handleAgentExit(agent: AgentProcess): Promise<void> {
    // Close socket
    if (agent.socket) {
      try {
        agent.socket.close();
        agent.socket = null;
      } catch (error) {
        console.error('Error closing socket on exit:', error);
      }
    }

    // Check if we should restart
    if (!agent.isRestarting && agent.restartCount < MAX_RESTART_COUNT) {
      console.log(
        `Agent ${agent.speaker} will restart (attempt ${agent.restartCount + 1}/${MAX_RESTART_COUNT})`
      );
      agent.isRestarting = true;
      agent.restartCount++;

      // Wait before restarting
      await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));

      try {
        // Determine audio source based on speaker
        const config = await this.configService.getConfig();
        const audioSource =
          agent.speaker === 'user' ? config.audio_input_device_name || 'loopback' : 'loopback';

        // Start new agent
        const newAgent = await this.startAgent(agent.port, audioSource, agent.speaker);
        newAgent.restartCount = agent.restartCount;

        // Update reference
        if (agent.speaker === 'user') {
          this.selfAgent = newAgent;
        } else {
          this.otherAgent = newAgent;
        }

        console.log(`Agent ${agent.speaker} restarted successfully`);
      } catch (error) {
        console.error(`Failed to restart agent ${agent.speaker}:`, error);
        agent.isRestarting = false;
      }
    } else if (agent.restartCount >= MAX_RESTART_COUNT) {
      console.error(`Agent ${agent.speaker} exceeded max restart attempts`);
      // Notify renderer about failure
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send('transcription-error', {
          speaker: agent.speaker,
          error: 'Agent crashed and exceeded max restart attempts',
        });
      }
    }
  }

  /**
   * Get the command and args to run the ASR agent
   */
  private getAgentCommand(): { command: string; args: string[] } {
    // In production, use built executable
    let buildDir = path.join(process.resourcesPath, 'agents');
    // In development, use local build
    if (EnvUtil.isDev()) {
      buildDir = path.join(process.cwd(), '..', 'build', 'agents', 'dist');
    }
    const exeName = process.platform === 'win32' ? 'asr_agent.exe' : 'asr_agent';
    return {
      command: path.join(buildDir, exeName),
      args: [],
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      selfTranscriptionActive: this.selfAgent !== null,
      otherTranscriptionActive: this.otherAgent !== null,
      selfRestartCount: this.selfAgent?.restartCount ?? 0,
      otherRestartCount: this.otherAgent?.restartCount ?? 0,
    };
  }

  /**
   * Stop all transcription services
   */
  async stopAll(): Promise<void> {
    await Promise.all([this.stopSelfTranscription(), this.stopOtherTranscription()]);
  }

  async registerHandlers(): Promise<void> {
    ipcMain.handle('transcription:start-self', async () => {
      await this.startSelfTranscription();
    });

    ipcMain.handle('transcription:stop-self', async () => {
      await this.stopSelfTranscription();
    });

    ipcMain.handle('transcription:start-other', async () => {
      await this.startOtherTranscription();
    });

    ipcMain.handle('transcription:stop-other', async () => {
      await this.stopOtherTranscription();
    });

    ipcMain.handle('transcription:get-status', async () => {
      return this.getStatus();
    });
  }
}

export const transcriptionService = new TranscriptionService();
