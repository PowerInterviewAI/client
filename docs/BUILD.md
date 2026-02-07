# Build Guide

## Project Structure

```
power-interview-client/
├── agents/                  # Python agents
│   ├── asr/                # Automatic Speech Recognition agent
│   ├── vcam/               # Virtual Camera agent
│   ├── audio_control/      # Audio control agent
│   └── shared/             # Shared utilities
├── app/                    # Electron application
│   ├── electron/           # Electron main process
│   └── renderer/           # React frontend
├── scripts/                # Build scripts
├── docs/                   # Documentation
├── build/                  # Build output for agents
│   └── agents/
│       └── win-x64/        # Windows x64 agent executables
└── dist/                   # Final distribution packages
```

## Build Configuration

### Agents Build

The Python agents are built using Nuitka and output to `build/agents/win-x64/`:

- `asr_agent.exe` - Speech recognition agent
- `vcam_agent.exe` - Virtual camera agent
- `audio_control_agent.exe` - Audio control agent

### Electron Build

The Electron app packages the agent executables from `../build/agents/win-x64/` into the final distribution in the `dist/` folder.

## Build Commands

### Build Individual Agents

```bash
# Build ASR agent
python scripts/build_asr_agent.py

# Build VCam agent
python scripts/build_vcam_agent.py

# Build Audio Control agent
python scripts/build_audio_control_agent.py
```

### Build Electron App

```bash
cd app
npm run electron:build
```

### Build Everything

```bash
python scripts/build_all.py
```

## Output Locations

- **Agent executables**: `build/agents/win-x64/*.exe`
- **Electron app installer**: `dist/PowerInterview-Setup-{version}.exe`
- **Unpacked Electron app**: `dist/win-unpacked/`
