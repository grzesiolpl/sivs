export interface MediaFile {
  id: string;
  name: string;
  path: string;
  type: "video" | "audio" | "image";
  size: number;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  bitrate?: number;
  audioTracks?: AudioTrack[];
  thumbnail?: string;
  waveform?: number[];
  createdAt: Date;
}

export interface AudioTrack {
  index: number;
  codec: string;
  channels: number;
  sampleRate: number;
  language?: string;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackIndex: number;
  startTime: number;
  endTime: number;
  sourceStart: number;
  sourceEnd: number;
  speed: number;
  volume: number;
  opacity: number;
  transform?: ClipTransform;
  effects?: ClipEffect[];
  transitions?: Transition[];
}

export interface ClipTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
}

export interface ClipEffect {
  id: string;
  type: "blur" | "color" | "transform" | "audio" | "custom";
  name: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

export interface Transition {
  id: string;
  type: "cut" | "fade" | "dissolve" | "slide" | "wipe" | "zoom";
  duration: number;
  easing: string;
  direction?: "in" | "out" | "cross";
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "text" | "effect";
  height: number;
  visible: boolean;
  locked: boolean;
  muted: boolean;
  clips: TimelineClip[];
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  template?: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  media: MediaFile[];
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  zoom: number;
  playbackRate: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  editPlan?: EditPlan;
  qaReports: QAReport[];
}

export interface ProjectSettings {
  resolution: { width: number; height: number };
  framerate: number;
  videoCodec: string;
  audioCodec: string;
  crf: number;
  preset: string;
  backgroundColor: string;
  audioSampleRate: number;
  audioChannels: number;
  exportTarget?: "fcp" | "davinci" | "after_effects" | "daw_audio" | "universal";
  exportMode?: "timeline" | "render";
  exportPreset?: string;
}

export interface EditPlan {
  project: string;
  output: {
    container: string;
    video_codec: string;
    audio_codec: string;
    crf: number;
    preset: string;
    resolution: string;
    framerate: number;
  };
  operations: EditOperation[];
  approval_required: boolean;
  post_processing: {
    face_blur: { enabled: boolean; note?: string };
    upscale: { enabled: boolean; note?: string };
  };
}

export type EditOperationAction = "keep_range" | "remove_range" | "slow_motion" | "concat";

export interface EditOperation {
  action: EditOperationAction;
  file: string;
  start: number;
  end: number;
  speed?: number;
  description?: string;
}

export interface QAReport {
  id: string;
  stage: "preview" | "final";
  createdAt: Date;
  checks: {
    duration: { expected: number; actual: number; ok: boolean };
    resolution: { expected: string; actual: string; ok: boolean };
    codec: { expected: string; actual: string; ok: boolean };
    audio: { ok: boolean; details?: string };
    faces: { checked: boolean; note?: string };
  };
  issues: QAIssue[];
  passed: boolean;
}

export interface QAIssue {
  type: "error" | "warning" | "info";
  message: string;
  details?: string;
  clipId?: string;
  timecode?: number;
}

export interface RenderJob {
  id: string;
  projectId: string;
  stage: "preview" | "final";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  currentOperation?: string;
  outputPath?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  log: string[];
}

export interface AppSettings {
  studioPath: string;
  ffmpegPath: string;
  ffprobePath: string;
  davinciPath?: string;
  defaultTemplate: string;
  autoSave: boolean;
  autoSaveInterval: number;
  theme: "light" | "dark" | "system";
  language: "pl" | "en";
  previewQuality: "low" | "medium" | "high";
  waveformResolution: number;
  thumbnailCount: number;
  maxUndoHistory: number;
  enableGPUAcceleration: boolean;
  enableHardwareEncoding: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: string;
  description: string;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface FileDropResult {
  files: File[];
  rejectedFiles: { file: File; reason: string }[];
}

export interface DragState {
  isDragging: boolean;
  dragType: "media" | "clip" | "track" | null;
  dragData?: unknown;
  dropTarget?: string;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}

export interface PlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  muted: boolean;
  buffered: TimeRanges | null;
  error?: string;
}

export interface ExportOptions {
  format: "mp4" | "webm" | "mov";
  codec: "h264" | "hevc" | "vp9" | "av1";
  quality: "low" | "medium" | "high" | "custom";
  resolution: { width: number; height: number };
  framerate: number;
  bitrate?: number;
  crf?: number;
  preset?: string;
  audioCodec: "aac" | "mp3" | "opus";
  audioBitrate: number;
  includeAudio: boolean;
  includeSubtitles: boolean;
  subtitlesPath?: string;
}

export type ExportTarget = "fcp" | "davinci" | "after_effects" | "daw_audio" | "universal";
export type ExportMode = "timeline" | "render";