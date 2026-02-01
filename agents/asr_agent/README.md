# ASR Agent

A standalone Python agent that captures audio from a single source, transcribes it via a backend websocket endpoint, and publishes the results to ZeroMQ.

## Architecture

The agent is structured into modular components for maintainability and testability:

### Module Structure

```
asr_agent/
├── __init__.py           # Package initialization
├── main.py               # CLI entry point and argument parsing
├── asr_agent.py          # Main agent orchestration
├── audio_capture.py      # Audio capture service
├── websocket_client.py   # WebSocket ASR client
└── zmq_publisher.py      # ZeroMQ publisher
```

### Components

1. **main.py**:
   - Command-line interface
   - Argument parsing
   - Signal handling for graceful shutdown

2. **asr_agent.py**:
   - Main orchestration logic
   - Coordinates all components
   - Lifecycle management (start/stop)
   - Statistics reporting

3. **audio_capture.py**:
   - Audio device enumeration (uses `shared.audio_device_service`)
   - PyAudioWPATCH-based capture
   - Resampling to 16kHz mono
   - Thread-safe audio queue

4. **websocket_client.py**:
   - WebSocket connection management
   - Audio streaming to backend
   - Transcript reception
   - Reconnection logic

5. **zmq_publisher.py**:
   - ZeroMQ PUB socket
   - Transcript publishing
   - Connection management

## Features

- **Audio Capture**: Supports system loopback (default) or any named audio device
- **Real-time Transcription**: Connects to backend ASR websocket endpoint for streaming transcription
- **ZeroMQ Publishing**: Publishes transcription results (both partial and final) to ZeroMQ
- **Robust Error Handling**: Automatic reconnection on websocket failures
- **Safe Exit**: Handles keyboard interrupts and signals gracefully
- **Statistics**: Periodic logging of audio frames captured and transcripts processed
- **Modular Design**: Clean separation of concerns for easy testing and maintenance

## Usage

### Basic Usage

```bash
# Use default settings (loopback audio, port 50002)
python -m asr_agent.main

# Specify custom ZeroMQ port
python -m asr_agent.main --port 50003

# Use a specific audio device by name
python -m asr_agent.main --source "Microphone"

# Specify custom backend URL
python -m asr_agent.main --url ws://localhost:8000/api/asr/streaming
```

### Command-line Arguments

- `-p, --port`: ZeroMQ port (default: 50002)
- `-s, --source`: Audio source - use `"loopback"` for system audio or specify device name (default: loopback)
- `-u, --url`: Backend websocket URL (default: ws://localhost:8000/api/asr/streaming)

### Examples

```bash
# Capture from loopback and publish to ZeroMQ port 50002
python -m asr_agent.main

# Capture from a specific microphone
python -m asr_agent.main --source "HD Pro Webcam"

# Use a different backend server
python -m asr_agent.main --url wss://my-backend.com/api/asr/streaming

# Combine options
python -m asr_agent.main --port 50010 --source "USB Audio" --url ws://192.168.1.100:8000/api/asr/streaming
```

## Architecture

### Data Flow

```
Audio Source → AudioCapture → Audio Queue → WebSocketClient (send)
                                                      ↓
                                               Backend ASR
                                                      ↓
                                          WebSocketClient (receive)
                                                      ↓
                                              ZMQPublisher
```

### Component Interactions

```
main.py
  └── ASRAgent
       ├── AudioCapture (uses shared.audio_device_service)
       ├── WebSocketClient
       └── ZMQPublisher
```

## Error Handling

The agent implements robust error handling:

- **Audio Capture Failures**: Logs errors and exits if capture cannot be initialized
- **WebSocket Disconnections**: Automatically reconnects after 3-second delay
- **Queue Overflow**: Drops oldest frames to prevent memory issues
- **Graceful Shutdown**: Cleans up all resources on exit

## Dependencies

- `pyaudiowpatch`: Windows audio capture with WASAPI loopback support
- `websockets`: WebSocket client for backend communication
- `pyzmq`: ZeroMQ messaging library
- `numpy`: Audio data processing
- `scipy`: Audio resampling
- `loguru`: Logging

## Notes

- The agent uses 16kHz mono PCM16 audio format for ASR
- Audio is captured in blocks of 0.1 seconds
- Silence frames are sent every 10 seconds to keep the websocket alive
- Statistics are printed every 10 seconds

The agent also uses `shared.audio_device_service` for audio device enumeration and management.

## Development

### Adding New Features

- **Audio sources**: Extend `AudioCapture` class
- **Transcription formats**: Modify `WebSocketClient` callbacks
- **Publishing protocols**: Replace or extend `ZMQPublisher`

### Testing

Each component can be tested independently:

```python
# Test audio capture
from asr_agent.audio_capture import AudioCapture
capture = AudioCapture("loopback")
capture.start()

# Test ZeroMQ publisher
from asr_agent.zmq_publisher import ZMQPublisher
publisher = ZMQPublisher(50002)
publisher.connect()
publisher.publish("test message", is_final=True)
```

## Troubleshooting

### Audio device not found

If you get "Audio device not found", list available devices:

```python
import pyaudiowpatch as pyaudio
pa = pyaudio.PyAudio()
for i in range(pa.get_device_count()):
    info = pa.get_device_info_by_index(i)
    print(f"{i}: {info['name']}")
```

### Connection refused

Ensure the backend server is running and the URL is correct. Default is `ws://localhost:8000/api/asr/streaming`.

### No transcription output

Check that the backend ASR service is properly configured and accessible.
