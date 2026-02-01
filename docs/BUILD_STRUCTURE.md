# Build Structure for Agent Executables

## Problem Solved

Previously, all agents were built to the same `build/agents/main.dist/` folder, causing:

1. **Build conflicts**: Building ASR agent would overwrite VCam agent exe
2. **Duplication**: Each agent had duplicate Python packages and DLL files

## New Structure

Each agent now has **separate build folders** but outputs to a **shared dist folder**:

```
build/agents/
├── asr.build/           # ASR agent build artifacts (isolated)
│   └── main.build/
├── vcam.build/          # VCam agent build artifacts (isolated)
│   └── main.build/
├── audio_control.build/ # Audio Control agent build artifacts (isolated)
│   └── main.build/
├── asr_agent.exe        # Final executables in shared folder
├── vcam_agent.exe
├── audio_control_agent.exe
└── [shared dependencies] # Python packages, DLLs shared by all agents
```

## Benefits

✅ **No conflicts**: Each agent builds independently with separate `.build` folders
✅ **Clean paths**: All executables in one place: `build/agents/<agent>_agent.exe`
✅ **Shared dependencies**: Python packages and DLLs are shared, reducing total size
✅ **Easier packaging**: Single folder to copy for production
✅ **Simpler service paths**: All agents in `resources/agents/`

## Build Commands

From project root:

```bash
# Build individual agents
python -m scripts.build_asr_agent
python -m scripts.build_vcam_agent
python -m scripts.build_audio_control_agent

# Build all agents
python -m scripts.build_all
```

## Production Packaging

The Electron app's `package.json` is configured to copy the entire `build/agents/` folder (excluding `.build` subdirectories):

- `build/agents/*.exe` and dependencies → `resources/agents/`

Build artifacts (`.build` folders) are **excluded** from the final installer via filter, keeping package size optimal.

## Development vs Production

**Development mode** (transcription service):

- Uses Python directly: `python agents/asr/main.py`
- No build required

**Production mode**:

- Uses compiled executable: `resources/agents/asr_agent.exe`
- Must run build scripts before packaging

## Notes on Dependencies

All agents now **share the same dependency folder** in `build/agents/`. This means:

**Pros of shared folder**:

- **Much smaller total size**: Python packages and DLLs are shared (~50-100MB total vs 150-300MB with separate folders)
- Simple deployment structure
- All agents in one place
- Easy to update common dependencies

**How it works**:

- Nuitka builds each agent in isolation (separate `.build` folders prevent conflicts)
- Final output moves to shared `build/agents/` folder
- Later builds can reuse existing dependencies if compatible
- Each `.exe` has a different name so they don't overwrite each other
