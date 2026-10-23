# SIVS — Super Intelligence Video Studio

**One app. Two interfaces. Zero cloud.**

```
┌─────────────────────────────────────────────────────────────┐
│  SIVS                                                         │
├──────────────────────┬──────────────────────────────────────┤
│  🖥️  TUI (Terminal)  │  🌐 Web UI (Next.js)                 │
│  Keyboard-first      │  Visual timeline editor              │
│  In-place editing    │  Drag & drop                         │
│  Instant mpv preview │  Same project data                   │
└──────────────────────┴──────────────────────────────────────┘
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
│   ├── src/               # React components (Editor, Timeline, Preview)
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
└── templates/              # Project templates
    ├── anonymized_video.json   # Medical (7 tasks)
    ├── social_video.json       # 9:16 Reels/TikTok
    └── documentary.json        # Cinematic 24fps
```

## Key Features

| Feature | TUI | Web UI |
|---------|-----|--------|
| **In-place editing** | ✅ `.sivs/` manifest in video folder | ✅ Same `.sivs/` data |
| **AI Brief → Plan** | ✅ OpenRouter (Claude/GPT) | ✅ Same |
| **3-Level Preview** | ✅ ASCII / mpv EDL (0s!) / ffplay | ✅ Video player |
| **Phone recording support** | ✅ VFR→CFR, HDR→SDR, frame-precise | ✅ Same |
| **Export targets** | ✅ FCP, DaVinci, AE, DAW, Universal | ✅ Same |
| **Keyboard-first** | ✅ P/B/E/R/T/O/W/Q | ❌ Mouse/touch |

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

## Requirements

- macOS (Intel or Apple Silicon)
- Homebrew
- OpenRouter API key (for AI features)

## License

MIT