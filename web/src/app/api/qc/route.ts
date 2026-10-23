import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const STUDIO_PATH = process.env.STUDIO_PATH || "/Users/mac/AI-Video-Studio";

// NLE/DAW specific requirements
interface VideoReq {
  codec: string[];
  pix_fmt?: string[];
  cfr?: boolean;
  gop?: number;
  bframes?: number;
  profile?: string;
  level?: string;
}

interface AudioReq {
  codec: string[];
  sample_rate: number;
  channels: number;
  bitrate?: string;
}

interface NLEReg {
  video: VideoReq;
  audio: AudioReq;
  container: string[];
}

const NLE_REQUIREMENTS: Record<string, NLEReg> = {
  fcp: {
    video: { codec: ["prores_ks", "libx264"], pix_fmt: ["yuv422p10le", "yuv420p"], cfr: true },
    audio: { codec: ["pcm_s24le", "pcm_s16le"], sample_rate: 48000, channels: 2 },
    container: ["mov", "mp4"],
  },
  davinci: {
    video: { codec: ["prores_ks", "dnxhd"], pix_fmt: ["yuv422p10le", "yuv422p"], cfr: true },
    audio: { codec: ["pcm_s24le", "pcm_s16le"], sample_rate: 48000, channels: 2 },
    container: ["mov"],
  },
  after_effects: {
    video: { codec: ["libx264"], pix_fmt: ["yuv420p"], cfr: true, gop: 1, bframes: 0 },
    audio: { codec: ["pcm_s16le"], sample_rate: 48000, channels: 2 },
    container: ["mov"],
  },
  daw_audio: {
    video: { codec: ["none"] },
    audio: { codec: ["pcm_s24le", "pcm_s16le"], sample_rate: 48000, channels: 2 },
    container: ["wav"],
  },
  universal: {
    video: { codec: ["libx264"], pix_fmt: ["yuv420p"], profile: "high", level: "4.1" },
    audio: { codec: ["aac"], bitrate: "192k", sample_rate: 48000, channels: 2 },
    container: ["mp4"],
  },
};

interface QARequest {
  projectId: string;
  stage: "preview" | "final";
  expectedDuration?: number;
  expectedResolution?: string;
  expectedCodec?: string;
  targetNLE?: keyof typeof NLE_REQUIREMENTS; // fcp, davinci, after_effects, daw_audio, universal
}

export async function POST(request: NextRequest) {
  try {
    const body: QARequest = await request.json();
    const { projectId, stage = "preview", expectedDuration, expectedResolution = "1920x1080", expectedCodec = "libx264", targetNLE } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const projectDir = path.join(STUDIO_PATH, "projects", projectId);
    const targetDir = stage === "preview"
      ? path.join(projectDir, "previews")
      : path.join(projectDir, "output");

    const outputFile = stage === "preview" ? "preview_draft.mp4" : "final.mp4";
    const outputPath = path.join(targetDir, outputFile);

    if (!fs.existsSync(outputPath)) {
      return NextResponse.json({ error: `Output file not found: ${outputFile}` }, { status: 404 });
    }

    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${outputPath}"`);
    const metadata = JSON.parse(stdout);

    const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
    const audioStream = metadata.streams?.find((s: any) => s.codec_type === "audio");

    const actualDuration = parseFloat(metadata.format.duration || "0");
    const actualResolution = videoStream ? `${videoStream.width}x${videoStream.height}` : "unknown";
    const actualCodec = videoStream?.codec_name || "unknown";
    const actualPixFmt = videoStream?.pix_fmt || "unknown";
    const actualGop = videoStream?.gop_size || 0;
    const actualBFrames = videoStream?.max_b_frames || 0;
    const hasAudio = !!audioStream;
    const isCFR = metadata.format.duration && videoStream && videoStream.nb_frames 
      ? Math.abs(actualDuration - (videoStream.nb_frames / (videoStream.avg_frame_rate ? eval(videoStream.avg_frame_rate) : 30))) < 1
      : true;

    const durationTolerance = 0.5;
    const durationOk = expectedDuration ? Math.abs(actualDuration - expectedDuration) <= durationTolerance : true;
    const resolutionOk = actualResolution === expectedResolution;
    const codecOk = actualCodec === expectedCodec;
    const audioOk = hasAudio;

    // NLE/DAW specific checks
    let nleChecks: any = {};
    let nleIssues: any[] = [];
    
    if (targetNLE && NLE_REQUIREMENTS[targetNLE]) {
      const req = NLE_REQUIREMENTS[targetNLE];
      
      // Container check
      const container = metadata.format.format_name?.split(',')[0] || "unknown";
      const containerOk = req.container.includes(container);
      nleChecks.container = { expected: req.container.join(", "), actual: container, ok: containerOk };
      if (!containerOk) nleIssues.push({ type: "error", message: `Container mismatch for ${targetNLE.toUpperCase()}: expected ${req.container.join("/")}, got ${container}` });
      
      // Video checks
      if (req.video.codec[0] !== "none" && videoStream) {
        const codecOk = req.video.codec.includes(actualCodec);
        nleChecks.videoCodec = { expected: req.video.codec.join(", "), actual: actualCodec, ok: codecOk };
        if (!codecOk) nleIssues.push({ type: "error", message: `Video codec mismatch for ${targetNLE.toUpperCase()}: expected ${req.video.codec.join("/")}, got ${actualCodec}` });
        
        if (req.video.pix_fmt) {
          const pixFmtOk = req.video.pix_fmt.includes(actualPixFmt);
          nleChecks.pixFmt = { expected: req.video.pix_fmt.join(", "), actual: actualPixFmt, ok: pixFmtOk };
          if (!pixFmtOk) nleIssues.push({ type: "error", message: `Pixel format mismatch for ${targetNLE.toUpperCase()}: expected ${req.video.pix_fmt.join("/")}, got ${actualPixFmt}` });
        }
        
        if (req.video.cfr) {
          nleChecks.cfr = { expected: true, actual: isCFR, ok: isCFR };
          if (!isCFR) nleIssues.push({ type: "error", message: `${targetNLE.toUpperCase()} requires Constant Frame Rate (CFR)` });
        }
        
        if (req.video.gop === 1 && videoStream) {
          const gopOk = actualGop === 1 || actualGop === 0;
          nleChecks.gop = { expected: 1, actual: actualGop, ok: gopOk };
          if (!gopOk) nleIssues.push({ type: "error", message: `After Effects requires All-Intra (GOP=1), got GOP=${actualGop}` });
        }
        
        if (req.video.bframes === 0 && videoStream) {
          const bframeOk = actualBFrames === 0;
          nleChecks.bframes = { expected: 0, actual: actualBFrames, ok: bframeOk };
          if (!bframeOk) nleIssues.push({ type: "error", message: `After Effects requires zero B-frames, got ${actualBFrames}` });
        }
      }
      
      // Audio checks
      if (audioStream && req.audio) {
        const audioCodecOk = req.audio.codec.includes(audioStream.codec_name);
        nleChecks.audioCodec = { expected: req.audio.codec.join(", "), actual: audioStream.codec_name, ok: audioCodecOk };
        if (!audioCodecOk) nleIssues.push({ type: "error", message: `Audio codec mismatch for ${targetNLE.toUpperCase()}: expected ${req.audio.codec.join("/")}, got ${audioStream.codec_name}` });
        
        const sampleRateOk = audioStream.sample_rate == req.audio.sample_rate;
        nleChecks.audioSampleRate = { expected: req.audio.sample_rate, actual: audioStream.sample_rate, ok: sampleRateOk };
        if (!sampleRateOk) nleIssues.push({ type: "error", message: `Sample rate mismatch for ${targetNLE.toUpperCase()}: expected ${req.audio.sample_rate}Hz, got ${audioStream.sample_rate}Hz` });
        
        const channelsOk = audioStream.channels == req.audio.channels;
        nleChecks.audioChannels = { expected: req.audio.channels, actual: audioStream.channels, ok: channelsOk };
        if (!channelsOk) nleIssues.push({ type: "error", message: `Channel count mismatch for ${targetNLE.toUpperCase()}: expected ${req.audio.channels}, got ${audioStream.channels}` });
      }
    }

    const checks = {
      duration: { expected: expectedDuration || actualDuration, actual: actualDuration, ok: durationOk },
      resolution: { expected: expectedResolution, actual: actualResolution, ok: resolutionOk },
      codec: { expected: expectedCodec, actual: actualCodec, ok: codecOk },
      audio: { ok: audioOk, details: audioStream ? `${audioStream.codec_name}, ${audioStream.channels}ch, ${audioStream.sample_rate}Hz` : "No audio track" },
      faces: { checked: false, note: "Manual review required in DaVinci Resolve (Power Window + Tracker + Blur)" },
      ...nleChecks,
    };

    const issues = [];
    if (!durationOk) issues.push({ type: "error", message: `Duration mismatch: expected ~${expectedDuration}s, got ${actualDuration.toFixed(1)}s` });
    if (!resolutionOk) issues.push({ type: "error", message: `Resolution mismatch: expected ${expectedResolution}, got ${actualResolution}` });
    if (!codecOk) issues.push({ type: "warning", message: `Codec mismatch: expected ${expectedCodec}, got ${actualCodec}` });
    if (!audioOk) issues.push({ type: "warning", message: "No audio track found" });
    issues.push(...nleIssues);

    const passed = issues.filter(i => i.type === "error").length === 0;

    const report = {
      id: `qa_${Date.now()}`,
      stage,
      createdAt: new Date().toISOString(),
      checks,
      issues,
      passed,
    };

    const reportsDir = path.join(projectDir, "qa_reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, `qa_report_${stage}_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Error running QC:", error);
    return NextResponse.json({ error: error.message || "Failed to run QC" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const projectDir = path.join(STUDIO_PATH, "projects", projectId);
    const reportsDir = path.join(projectDir, "qa_reports");

    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ reports: [] });
    }

    const files = fs.readdirSync(reportsDir)
      .filter(f => f.endsWith(".json"))
      .map(file => {
        const filePath = path.join(reportsDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ reports: files });
  } catch (error) {
    console.error("Error listing QC reports:", error);
    return NextResponse.json({ error: "Failed to list QC reports" }, { status: 500 });
  }
}