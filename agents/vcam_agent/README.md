# Virtual Camera Agent

A standalone Python agent that receives video frames via ZeroMQ and outputs them to a virtual camera device. Useful for injecting custom video feeds into video conferencing applications or any software that uses webcams.

## Features

- **ZeroMQ Frame Reception**: Receives compressed video frames via ZeroMQ SUB socket
- **Virtual Camera Output**: Outputs frames to a virtual camera using pyvirtualcam
- **Automatic Reconnection**: Automatically reconnects to ZeroMQ on connection loss
- **Frame Queue Management**: Buffers frames with automatic dropping on overflow
- **FPS Maintenance**: Maintains configured frame rate regardless of input rate
- **Datetime Overlay**: Optional datetime display when no frames available
- **Statistics Reporting**: Periodic logging of frame rates and queue status
- **Graceful Shutdown**: Handles keyboard interrupts and signals cleanly

## Usage

### Basic Usage

```bash
# Use default settings (1280x720, 30fps, port 50001)
python -m vcam_agent.main

# Specify custom resolution and frame rate
python -m vcam_agent.main --width 1920 --height 1080 --fps 60

# Use custom ZeroMQ port
python -m vcam_agent.main --port 50010

# Disable datetime overlay
python -m vcam_agent.main --no-datetime
```

### Command-line Arguments

- `-w, --width`: Frame width in pixels (default: 1280)
- `-H, --height`: Frame height in pixels (default: 720)
- `-f, --fps`: Target frames per second (default: 30)
- `-p, --port`: ZeroMQ port to listen on (default: 50001)
- `-n, --no-datetime`: Disable datetime overlay on black frames

### Examples

```bash
# Standard HD configuration
python -m vcam_agent.main --width 1280 --height 720 --fps 30

# Full HD configuration
python -m vcam_agent.main --width 1920 --height 1080 --fps 60

# Listen on different port
python -m vcam_agent.main --port 50005

# Low resolution for testing
python -m vcam_agent.main --width 640 --height 480 --fps 15
```

## Architecture

### Module Structure

```
vcam_agent/
├── __init__.py       # Package initialization
├── main.py           # CLI entry point
└── vcam_agent.py     # Virtual camera agent implementation
```

### Components

**main.py**:

- Command-line interface
- Argument parsing
- Signal handling for graceful shutdown

**vcam_agent.py**:

- ZeroMQ frame reception (SUB socket)
- Frame queue management with overflow handling
- Virtual camera initialization and writing
- Multi-threaded architecture (receiver, writer, stats)
- Automatic reconnection logic

### Data Flow

```
ZeroMQ Publisher → ZeroMQ Socket → Frame Queue → Virtual Camera
                                         ↓
                              (if empty: Black Frame + DateTime)
```

### Threading Model

The agent uses three threads:

1. **Receiver Thread**: Receives frames from ZeroMQ and enqueues them
2. **Writer Thread**: Dequeues frames and writes to virtual camera at target FPS
3. **Stats Thread**: Periodically logs performance statistics

## Frame Format

The agent expects frames to be sent as compressed images (JPEG/PNG) via ZeroMQ. Frames are:

- Decoded using OpenCV's `cv2.imdecode()`
- Resized to target resolution if needed
- Converted from BGR to RGB color space
- Written to virtual camera

## Error Handling

The agent implements robust error handling:

- **ZeroMQ Connection Loss**: Automatically attempts to reconnect
- **Frame Decode Failures**: Logged and skipped, agent continues
- **Queue Overflow**: Drops oldest frames to prevent memory issues
- **Virtual Camera Errors**: Logged, agent attempts to continue
- **Graceful Shutdown**: Properly closes all resources on exit

## Statistics

The agent logs statistics every 5 seconds (by default):

```
Stats - Received: 1500 (30.0 fps), Dropped: 0, Written: 1500 (30.0 fps), Queue size: 2
```

- **Received**: Total frames received from ZeroMQ and current receive FPS
- **Dropped**: Frames dropped due to queue overflow
- **Written**: Total frames written to virtual camera and current write FPS
- **Queue size**: Current number of frames in buffer

## Requirements

### Dependencies

- `pyvirtualcam`: Virtual camera library
- `pyzmq`: ZeroMQ Python bindings
- `opencv-python`: Image decoding and processing
- `numpy`: Array operations
- `loguru`: Logging

### Virtual Camera Backend

The agent requires a virtual camera backend:

**Windows**:

- OBS Virtual Camera (recommended)
- Unity Video Capture

**Linux**:

- v4l2loopback kernel module

**macOS**:

- OBS Virtual Camera

## Troubleshooting

### No virtual camera found

Ensure you have a virtual camera backend installed:

- Windows: Install OBS Studio and enable Virtual Camera
- Linux: Install and load v4l2loopback module
- macOS: Install OBS Studio with virtual camera plugin

### Connection refused

Ensure the ZeroMQ publisher is running and bound to the correct port before starting the agent.

### Frame dropping

If frames are being dropped:

- Increase queue size in code (default: 10 frames)
- Reduce input frame rate at publisher
- Check system resources (CPU/memory)

### Wrong frame rate

The agent maintains its target FPS by:

- Writing frames at fixed intervals
- Reusing last frame if queue is empty
- Dropping frames if queue is full

## Use Cases

- **Video Processing Pipeline**: Inject processed video into conferencing apps
- **Screen Sharing**: Share custom content as a webcam feed
- **Testing**: Simulate webcam input with recorded or generated content
- **Augmented Reality**: Overlay graphics on video and output to virtual camera
- **Remote Video**: Forward video from remote sources as local webcam

## Integration

To send frames to this agent, publish to ZeroMQ as PUB socket:

```python
import zmq
import cv2

context = zmq.Context()
socket = context.socket(zmq.PUB)
socket.bind("tcp://*:50001")

# Send frame
frame = cv2.imread("image.jpg")
_, encoded = cv2.imencode('.jpg', frame)
socket.send(encoded.tobytes())
```

## Notes

- The agent displays a black frame with datetime when no frames are available
- Frame queue prevents memory overflow by dropping oldest frames
- Virtual camera device name depends on the backend (e.g., "OBS Virtual Camera")
- ZeroMQ uses SUB socket pattern, suitable for one-to-many distribution
