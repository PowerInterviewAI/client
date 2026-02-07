# Power Interview - Privacy-First AI Interview Assistant

<div align="center">

**Your Personal AI-Powered Interview Coach with Real-Time Face Swap Technology**

[![Version](https://img.shields.io/badge/version-0.9.0-blue.svg)](https://github.com/yourusername/power-interview)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

## 🌟 Overview

Power Interview is a privacy-first AI assistant designed to help you ace technical and behavioral interviews. With real-time transcription, intelligent suggestions, and cutting-edge face swap technology, you'll have the confidence and support you need during live interviews—all while maintaining your privacy.

## 🔒 Privacy First

**Your data stays with you.** Power Interview is built with privacy as a core principle:

- 🏠 **Local Processing**: All sensitive data is processed locally on your machine
- 🔐 **Secure Storage**: Credentials and personal information stored securely using Electron Store
- 🚫 **No Data Mining**: We don't collect, sell, or share your personal information
- 🎯 **Minimal Server Communication**: Only necessary API calls for AI suggestions
- 💾 **Your Control**: All your CV, profile data, and configurations remain on your device

## ✨ Key Features

### 🎭 Real-Time Face Swap

Transform your video appearance during live interviews with advanced face swap technology:

- **Virtual Camera Integration**: Seamlessly replaces your face with your chosen photo
- **WebRTC Streaming**: Low-latency, high-quality video processing
- **Face Enhancement**: Optional AI-powered face enhancement for natural-looking results
- **OBS Virtual Camera Support**: Professional-grade virtual camera output
- **Configurable Settings**: Adjust video resolution, quality, and audio sync

### 🎤 Real-Time Transcription

Stay on top of the conversation with live ASR (Automatic Speech Recognition):

- **Dual-Channel Transcription**: Separate transcription for interviewer and yourself
- **WebSocket Streaming**: Real-time, low-latency transcription
- **Speaker Detection**: Automatically identifies who's speaking
- **Transcript History**: Full conversation history available during the interview

### 💡 Intelligent AI Suggestions

Get instant, context-aware help during interviews:

#### Reply Suggestions

- **Personalized Responses**: AI generates answers based on your CV, job description, and conversation
- **Streaming Responses**: Real-time suggestions as the conversation unfolds
- **Context-Aware**: Takes into account the full interview context
- **Natural Language**: Human-like responses tailored to your profile

#### Code Suggestions

- **Screenshot Analysis**: Captures your screen to understand coding problems
- **Multi-Image Support**: Analyzes up to 3 screenshots for comprehensive context
- **LLM-Powered**: Advanced language models generate optimal solutions
- **Syntax Highlighting**: Code rendered with proper highlighting for readability

### 🎮 Stealth Mode & Hotkeys

Operate discreetly during interviews:

- **Stealth Mode** (`Ctrl+Shift+Q`): Minimize window visibility
- **Opacity Control** (`Ctrl+Shift+D`): Adjust window transparency
- **Window Positioning** (`Ctrl+Shift+1-9`): Quick window placement (numpad layout)
- **Scroll Controls**:
  - `Ctrl+Shift+J/K`: Scroll interview suggestions
  - `Ctrl+Shift+U/I`: Scroll code suggestions
- **Window Management**:
  - `Ctrl+Alt+Shift+Arrow`: Move window
  - `Ctrl+Win+Shift+Arrow`: Resize window

### ⚙️ Smart Configuration

Tailor the experience to your needs:

- **Profile Management**: Store your name, CV/resume, and job descriptions
- **Photo Upload**: Choose your preferred face swap photo
- **Audio Device Selection**: Pick the right microphone for transcription
- **Camera Selection**: Choose your video input device
- **Language Support**: Currently supports English with more languages coming
- **Persistent Settings**: All configurations saved between sessions

### 🔧 Advanced Features

- **Health Monitoring**: Real-time backend and GPU server status checks
- **Action Locking**: Prevents conflicting operations during critical tasks
- **Push Notifications**: Desktop notifications for important events
- **Auto-Scroll**: Smart scrolling for suggestions and transcripts
- **State Persistence**: All app state maintained across page refreshes
- **Audio Delay Compensation**: Configurable audio sync for perfect video/audio alignment

## 🏗️ Architecture

### Desktop Application

- **Framework**: Electron with React + TypeScript
- **UI Library**: Radix UI + Tailwind CSS
- **State Management**: Zustand + React Query
- **IPC Communication**: Electron IPC for main-renderer communication

### Python Agents

- **ASR Agent**: Real-time audio capture and transcription
- **VCam Agent**: Virtual camera with face swap processing
- **Audio Control Agent**: Audio device management and routing

### Communication

- **ZeroMQ**: High-performance inter-process communication
- **WebSocket**: Real-time ASR streaming
- **WebRTC**: Low-latency video streaming

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.12)
- **OBS Virtual Camera** (for face swap feature)
- **VB-Audio Virtual Cable** (for audio routing)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/PowerInterviewAI/power-interview-assistant
   cd power-interview-assistant
   ```

2. **Install dependencies**

   ```bash
   # Install Node.js dependencies
   cd app
   npm install

   # Install Python dependencies
   cd ..
   pip install -r requirements.txt
   ```

3. **Build Python agents**

   ```bash
   python -m scripts.build_***_agents
   ```

4. **Run the application**
   ```bash
   cd app
   npm run start
   ```

### Configuration

1. **Launch the app** and sign in with your credentials
2. **Configure your profile**:
   - Click the profile icon in the control panel
   - Upload your face swap photo
   - Enter your name, CV/resume content, and job description
3. **Select your devices**:
   - Choose your microphone for transcription
   - Select your camera for video (if using face swap)
4. **Start your interview prep**:
   - Click "Start" to begin transcription and AI assistance
   - Enable face swap if needed for your video call

## 📦 Building for Production

### 1. Build Python Agents

```bash
python -m scripts.build_*_agents
```

### 2. Build Electron App

```bash
python -m scripts.build_electron_app
```

The built application will be available in the `build` and `dist` directories.

### #. Build All

```bash
python -m scripts.build_all
```

This will build both the Python agents and the Electron app in one step.

## 🎯 Use Cases

### Technical Interviews

- Real-time code suggestions for algorithm questions
- Screen capture analysis for debugging help
- Live transcription to review questions later

### Behavioral Interviews

- AI-generated responses based on your experience
- Context-aware suggestions using your CV
- Transcript history to maintain conversation flow

### Practice Sessions

- Monitor your own responses in real-time
- Get feedback on your answers
- Build confidence with AI support

### Anonymous Interviewing

- Use face swap for privacy protection
- Control your video appearance
- Maintain professionalism while staying anonymous

## 🔐 Security & Privacy

### Local Data Storage

All sensitive data is stored locally using Electron Store with encryption:

- Login credentials
- Session tokens
- Profile information
- Interview configurations

### Secure Communication

- HTTPS for all backend API calls
- WebSocket secure connections for real-time data
- No persistent storage of transcripts on external servers

### Data Control

- Clear all data with one click
- Export your transcripts and suggestions
- Full control over what data is shared

## 🛠️ Technology Stack

### Frontend

- **Electron** - Cross-platform desktop framework
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library

### Backend Agents

- **Python 3.12** - Core agent language
- **PyAudio** - Audio capture and processing
- **OpenCV** - Video processing
- **PyVirtualCam** - Virtual camera driver
- **ZeroMQ** - Message queue communication
- **WebSocket** - Real-time streaming

### Build & Deployment

- **Electron Builder** - Desktop app packaging
- **Nuitka** - Python to executable compilation
- **Ruff** - Python linting and formatting

## 📝 Project Structure

```
power-interview-client/
├── agents/                  # Python agents
│   ├── asr/                # Automatic Speech Recognition
│   ├── audio_control/      # Audio device management
│   ├── vcam/               # Virtual camera with face swap
│   └── shared/             # Shared utilities
├── app/                    # Electron application
│   ├── src/
│   │   ├── main/          # Electron main process
│   │   └── renderer/      # React application
│   └── electron-dist/     # Compiled Electron code
├── build/                 # Build output
├── scripts/               # Build and deployment scripts
└── requirements.txt       # Python dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for interview candidates everywhere
- Special thanks to the open-source community
- Powered by cutting-edge AI and computer vision technology

## 📞 Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Contact: support@power-interview.com

---

<div align="center">

**Made with 💪 to help you ace your interviews while protecting your privacy**

[Website](https://power-interview.com) • [Documentation](https://docs.power-interview.com) • [Community](https://community.power-interview.com)

</div>
