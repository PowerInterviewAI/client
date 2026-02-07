# Audio Control Agent

A standalone Python agent that captures audio from a specified input device, applies configurable delay, and routes it to VB-CABLE virtual audio device. Useful for synchronizing audio with delayed video streams or testing audio processing pipelines.

## Features

- **Audio Device Selection**: Choose any audio input device by name (partial match supported)
- **Configurable Delay**: Apply precise audio delay in milliseconds
- **VB-CABLE Integration**: Automatically routes to VB-CABLE Input for system-wide audio routing
- **Device Enumeration**: List all available audio devices
- **Real-time Processing**: Low-latency audio streaming with chunk-based processing
- **Graceful Shutdown**: Handles interrupts and cleans up resources properly
- **Statistics**: Periodic logging of processed audio chunks

## Usage

### Basic Usage

```bash
# List all available audio devices
python -m audio_control_agent.main --list-devices

# Capture from microphone with no delay
python -m audio_control_agent.main --input "Microphone" --delay 0

# Capture from USB audio with 500ms delay
python -m audio_control_agent.main --input "USB Audio" --delay 500

# Short form
python -m audio_control_agent.main -i "Microphone" -d 1000
```

### Command-line Arguments

- `-i, --input`: Audio input device name (partial match supported) - **required**
- `-d, --delay`: Audio delay in milliseconds (default: 0)
- `--list-devices`: List all available audio devices and exit

### Examples

```bash
# List devices to find your input device name
python -m audio_control_agent.main --list-devices

# Capture from microphone with 500ms delay
python -m audio_control_agent.main --input "Microphone" --delay 500

# Capture from HD Pro Webcam audio
python -m audio_control_agent.main --input "HD Pro Webcam" --delay 0

# High delay for testing (2 seconds)
python -m audio_control_agent.main --input "Line In" --delay 2000
```

## Architecture

### Module Structure

```
audio_control_agent/
├── __init__.py          # Package initialization
├── main.py              # CLI entry point
└── audio_controller.py  # Audio processing implementation
```

### Components

**main.py**:

- Command-line interface
- Argument parsing and validation
- Signal handling for graceful shutdown
- Device listing functionality

**audio_controller.py**:

- Audio device discovery (uses `shared.audio_device_service`)
- Audio stream management
- Delay buffer implementation
- Real-time audio processing loop

### Data Flow

```
Input Device → Audio Stream → Delay Buffer → VB-CABLE Input
                                    ↓
                            (Circular buffer with
                             configurable size)
```

### How Delay Works

1. Audio chunks are read from input device
2. Each chunk is added to a circular delay buffer (deque)
3. After buffer fills to desired delay chunks, oldest chunk is output
4. Delay chunks = (delay_ms / 1000) × (sample_rate / chunk_size)

Example: 500ms delay at 44.1kHz with 1024 chunk size = ~21 chunks

## Audio Configuration

Default audio settings:

- **Sample Rate**: 44,100 Hz
- **Channels**: Stereo (2) input, Mono (1) output to VB-CABLE
- **Chunk Size**: 1024 samples
- **Data Type**: 16-bit signed integer (int16)

## Requirements

### Dependencies

- `sounddevice`: Audio I/O library
- `numpy`: Array operations for audio data
- `loguru`: Logging

Uses `shared.audio_device_service` for audio device enumeration and management.

### VB-CABLE Virtual Audio Device

This agent requires **VB-CABLE** to be installed:

**Windows**:

1. Download VB-CABLE from [VB-Audio.com](https://vb-audio.com/Cable/)
2. Install VB-CABLE Driver
3. After installation, "CABLE Input" will appear as an output device

The agent automatically detects "CABLE Input (VB-Audio Virtual Cable)" device.

## Device Selection

The agent uses partial name matching for device selection:

```bash
# These all match "Microphone (Realtek HD Audio)"
--input "Microphone"
--input "Realtek"
--input "HD Audio"
```

### Listing Devices

Use `--list-devices` to see all available devices:

```
=== Available Audio Devices ===
[0] Microsoft Sound Mapper - Input (INPUT)
[1] Microphone (Realtek HD Audio) (INPUT)
[2] CABLE Output (VB-Audio Virtual Cable) (INPUT, OUTPUT)
[3] Speakers (Realtek HD Audio) (OUTPUT)
[4] CABLE Input (VB-Audio Virtual Cable) (OUTPUT)
==================================================
```

## Error Handling

The agent handles common errors:

- **Device Not Found**: Shows available devices and exits
- **VB-CABLE Not Found**: Shows error message with installation instructions
- **Stream Errors**: Logs errors and attempts to continue
- **Keyboard Interrupt**: Cleanly stops streams and exits

## Performance

- **Latency**: Base latency = chunk_size / sample_rate (~23ms at default settings)
- **CPU Usage**: Minimal (< 5% on modern processors)
- **Memory**: Delay buffer size = delay_chunks × chunk_size × channels × 2 bytes

Example: 1 second delay ≈ 180 KB memory

## Use Cases

### Audio-Video Synchronization

When video is delayed (e.g., processing pipeline), delay audio to match:

```bash
python -m audio_control_agent.main --input "Microphone" --delay 500
```

### Echo/Feedback Testing

Test echo cancellation or feedback systems:

```bash
python -m audio_control_agent.main --input "Microphone" --delay 1000
```

### Audio Pipeline Testing

Route audio through VB-CABLE for testing processing chains:

```bash
python -m audio_control_agent.main --input "USB Audio" --delay 0
```

### Karaoke Effects

Add delay for karaoke-style audio effects:

```bash
python -m audio_control_agent.main --input "Microphone" --delay 200
```

## Integration

After starting the agent, audio from the input device is available at "CABLE Output (VB-Audio Virtual Cable)" for any application to use:

1. Start the agent with your input device
2. In your target application (Zoom, Discord, OBS, etc.)
3. Select "CABLE Output" as the microphone/input device
4. Your audio will be routed through the agent with applied delay

## Troubleshooting

### VB-CABLE not found

Error: `VBCABLE output device not found!`

**Solution**: Install VB-CABLE from [vb-audio.com/Cable](https://vb-audio.com/Cable/)

### Input device not found

Error: `Input device 'Microphone' not found!`

**Solutions**:

- Use `--list-devices` to see exact device names
- Check device name spelling
- Ensure device is connected and enabled
- Try partial name matching (e.g., just "USB" instead of full name)

### No audio output

**Solutions**:

- Verify VB-CABLE is installed correctly
- Check that target application is using "CABLE Output" as input
- Verify input device is not muted
- Check Windows sound settings

### Audio stuttering

**Solutions**:

- Reduce delay (smaller delay buffer)
- Close other audio applications
- Check CPU usage
- Increase chunk size in code (reduces callback frequency)

## Statistics

The agent logs statistics every 100 chunks:

```
Processed 100 chunks...
Processed 200 chunks...
```

Each chunk represents ~23ms of audio at default settings.

## Notes

- Audio is converted from stereo input to mono output for VB-CABLE
- Delay buffer is implemented using Python's `collections.deque` with fixed max length
- The agent uses sounddevice's blocking read/write for simplicity
- Minimum delay is ~23ms (one chunk) due to buffering
- VB-CABLE Input appears as an output device (it receives audio to route)
- Maximum practical delay depends on available memory (several seconds possible)

## Advanced Usage

### Modifying Audio Settings

To change audio settings, edit `audio_controller.py`:

```python
self.chunk_size = 2048  # Larger chunks = lower CPU, higher latency
self.sample_rate = 48000  # Higher quality
self.channels = 2  # Stereo input
```

### Custom Output Device

To route to a different output device, modify `start()` method:

```python
# Instead of VB-CABLE, use any output device
output_device_index = AudioDeviceService.get_device_index_by_name("Your Device")
```

## Related Agents

- **ASR Agent**: Transcribes audio using ASR backend
- **VCam Agent**: Similar concept for video frames

All agents follow similar architecture patterns for consistency.
