# SIVS — Super Intelligence Video Studio

**One app. Three interfaces. Zero cloud.**

```
┌─────────────────────────────────────────────────────────────┐
│  SIVS                                                         │
├──────────────────────┬──────────────────────┬────────────────┤
│  🖥️  TUI (Terminal)  │  🌐 Web UI (Next.js)  │  📱 Mobile     │
│  Keyboard-first      │  Visual timeline      │  On-Device AI  │
│  In-place editing    │  Drag & drop          │  Zero-Cloud    │
│  Instant mpv preview │  Same project data    │  VAYS-Style    │
└──────────────────────┴──────────────────────┴────────────────┘
```

## Quick Start

```bash
# 1. Clone & install (one command does everything)
git clone https://github.com/grzesiolpl/sivs.git
cd sivs
bash tui/install_sivs.sh

# Installer does:
# ✅ Homebrew + ffmpeg, mpv, whisper-cpp
# ✅ Python venv + kinocut, cutagent, textual, rich
# ✅ Global `sivs` command + Desktop shortcut
# ✅ Config at ~/.config/sivs/.env

# 2. Configure (once)
sivs --setup
# → OpenRouter API key, model, workspace

# 3. Use TUI (terminal)
sivs video.mp4
# → Type brief → Enter → AI plan → P (preview) → T (export) → O (finder)

# 4. Use Web UI (browser)
sivs --web
# → Opens http://localhost:3000
```

## Architecture

```
sivs/
├── tui/                    # Terminal UI (Python/Textual)
│   ├── sivs_tui/          # Core TUI package
│   ├── install_sivs.sh    # Idiot-proof installer
│   ├── SIVS.command       # macOS desktop launcher
│   └── sivs               # Global entry point
│
├── web/                    # Web UI (Next.js 15 + Electron)
│   ├── src/               # React components (Editor, Timeline, Preview, DevTimer)
│   ├── electron/          # Native macOS app builder
│   └── package.json
│
├── shared/                 # Shared utilities
│   └── framerate.py       # VFR→CFR normalization, frame-precise timecodes
│
├── scripts/                # CLI pipeline (batch/automation)
│   ├── studio             # Main CLI entry
│   ├── analyze_media      # ffprobe + silence + whisper
│   ├── render_project     # Kinocut/FFmpeg render
│   ├── quality_check      # QC reports
│   └── exporters/         # FCPXML, EDL, FCP7 XML
│
├── templates/              # Project templates
│   ├── anonymized_video.json   # Medical (7 tasks)
│   ├── social_video.json       # 9:16 Reels/TikTok
│   └── documentary.json        # Cinematic 24fps
│
└── mobile/                 # 📱 Mobile Architecture (iOS/Android)
    └── ARCHITECTURE.md    # 100% On-Device AI (VAYS-Style)
```

## Key Features

| Feature | TUI | Web UI | Mobile |
|---------|-----|--------|--------|
| **In-place editing** | ✅ `.sivs/` manifest in video folder | ✅ Same `.sivs/` data | ✅ Local sandbox |
| **AI Brief → Plan** | ✅ OpenRouter (Claude/GPT) | ✅ Same | ✅ Local LLM (Gemma 4 E2B) |
| **3-Level Preview** | ✅ ASCII / mpv EDL (0s!) / ffplay | ✅ Video player | ✅ Native AVMutableComposition |
| **Phone recording support** | ✅ VFR→CFR, HDR→SDR, frame-precise | ✅ Same | ✅ Native AVAsset |
| **Export targets** | ✅ FCP, DaVinci, AE, DAW, Universal | ✅ Same | ✅ Same (AirDrop/LAN) |
| **Input** | ✅ Keyboard (P/B/E/R/T/O/W/Q) | ✅ Mouse/touch | ✅ Touch/Voice |

## TUI Workflow (6 keys)

```
P  ▶ Live Preview (mpv EDL = instant!)
B  💬 Refine Brief / AI re-plan
E  ✏️ Edit Plan JSON ($EDITOR)
R  🚀 Render Output
T  🎞️ Export Timeline (FCP/DaVinci/AE/DAW)
O  📂 Show in Finder
W  🌐 Launch Web UI
Q  ❌ Quit
```

## Phone Recording Support (VFR/HEVC/HDR)

- **VFR normalization**: Auto-detects 29.83/59.88 → 30/60fps
- **Frame-precise timecodes**: Exact fractions (1001/30000 for 29.97)
- **HDR→SDR**: Auto tone-mapping for SDR delivery
- **Media handles**: Full asset duration in XML/EDL for NLE trimming
- **Audio sync**: `setpts` + `atempo` for slow-motion

## Commands

```bash
sivs --setup          # First-time wizard (API key, model, workspace)
sivs --doctor         # System check (ffmpeg, mpv, whisper, Python)
sivs --config         # Show current config
sivs --help           # Full guide
sivs --web            # Launch Web UI
sivs video.mp4        # Open in TUI
```

## 📱 SIVS Mobile (iOS & Android) — Architektura 100% On-Device AI (VAYS-Style)

> **Pełna dokumentacja:** `mobile/ARCHITECTURE.md`

### Założenie: Zero-Cloud / Zero-Backend
Wszystkie dane (wideo, audio, brief, transkrypcja, plan) nigdy nie opuszczają urządzenia. Cały potok: **Audio → VAD → STT → LLM Planer → Instant Preview → Hardware Encode** wykonuje się lokalnie na NPU/GPU (Apple Neural Engine / Metal na iOS, Vulkan/QNN na Androidzie).

### Stos modeli On-Device

| Warstwa | Model | Runtime |
|---------|-------|---------|
| **STT Szybki** | NVIDIA Parakeet TDT v3 (word-level timestamps + diarization) | CoreML (iOS) / ONNX Runtime (Android) |
| **STT Jakość** | WhisperKit (iOS) / whisper.cpp (Android) | CoreML / ONNX |
| **VAD** | Silero VAD (< 2 MB, ONNX) | CoreML / ONNX |
| **LLM Planer** | Gemma 4 E2B (2B params, Q4_K_M ~1.4 GB) | MLX Swift (iOS) / llama.cpp / MediaPipe LLM (Android) |
| **JSON Schema** | GBNF Grammar (constrained decoding) | llama.cpp / MLX Swift |

### Silnik wideo On-Device (zamiast FFmpeg)

| Funkcja | iOS (Apple Silicon) | Android |
|---------|---------------------|---------|
| **Analiza mediów** | `AVAsset` / `AVAssetTrack` | `MediaExtractor` / `MediaMetadataRetriever` |
| **Instant Preview (0s)** | `AVMutableComposition` + `AVPlayer` | `Media3 Transformer` / `CompositionPlayer` |
| **Render fizyczny** | `AVAssetExportSession` (VideoToolbox H.264/HEVC) | `Media3 Transformer` + `MediaCodec` |
| **Face Blur** | `Vision Framework` + `CoreImage` | `ML Kit Face Detection` + OpenGL |
| **Eksport Timeline** | Generator `.fcpxml` + AirDrop / Local Wi-Fi | Generator `.xml/.fcpxml/.edl` + Share Sheet |

### Architektura aplikacji (2 ścieżki)

| Ścieżka | Technologia | Zalety |
|---------|-------------|--------|
| **1. Cross-Platform** | React Native (Expo) + `llama.rn` + `whisper.rn` | 70% kodu z Web UI, jeden kod iOS+Android |
| **2. Native Apple (SwiftUI)** | Swift / SwiftUI + `WhisperKit` + `MLX Swift` | Natywny dostęp do ANE, CoreML, AVFoundation; macOS bonus |

### Sandbox Data (Privacy First)
```
App Sandbox
├── Documents/Projects/     # brief.md, transcript.json, edit_plan.json
├── Documents/Exports/      # edit_01_*.mp4, .fcpxml, .xml
├── Library/AIModels/       # Modele (wykluczone z backupu iCloud)
│   ├── parakeet-tdt-v3.mlmodelc (~600 MB)
│   ├── silero-vad.onnx (~2 MB)
│   └── gemma-4-e2b-it-q4_k_m.gguf (~1.4 GB)
└── tmp/                    # Tymczasowe WAV 16kHz (usuwane po STT)
```

### Roadmap Mobile (2026-10-23)
| Etap | Zadanie | Status |
|------|---------|--------|
| 1 | Wybór ścieżki: SwiftUI vs React Native | 🔄 Decyzja |
| 2 | PoC: `AVMutableComposition` instant preview | ⏳ |
| 3 | Integracja `WhisperKit` + `Silero VAD` | ⏳ |
| 4 | Integracja `MLX Swift` + `Gemma 4 E2B` | ⏳ |
| 5 | `AVAssetExportSession` hardware encode | ⏳ |
| 6 | `Vision Framework` face blur | ⏳ |
| 7 | `.fcpxml` generator + AirDrop / Local Wi-Fi sync | ⏳ |
| 8 | React Native port (jeśli Ścieżka 1) | 📋 |
| 9 | TestFlight / Play Console Internal Testing | 📋 |

**Pełna dokumentacja:** [`mobile/ARCHITECTURE.md`](mobile/ARCHITECTURE.md)

## Requirements

- macOS (Intel or Apple Silicon)
- Homebrew
- OpenRouter API key (for AI features)

## License

MIT