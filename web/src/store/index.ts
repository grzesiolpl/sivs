import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Project, MediaFile, TimelineClip, TimelineTrack, EditPlan, QAReport, RenderJob, ProjectSettings, AppSettings, Notification, ExportTarget, ExportMode } from "@/types";

interface AppState {
  // Projects
  projects: Project[];
  currentProjectId: string | null;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => Project | undefined;

  // Media
  mediaFiles: MediaFile[];
  setMediaFiles: (files: MediaFile[]) => void;
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  updateMediaFile: (id: string, updates: Partial<MediaFile>) => void;

  // Timeline
  tracks: TimelineTrack[];
  setTracks: (tracks: TimelineTrack[]) => void;
  addTrack: (track: TimelineTrack) => void;
  updateTrack: (id: string, updates: Partial<TimelineTrack>) => void;
  deleteTrack: (id: string) => void;
  addClipToTrack: (trackId: string, clip: TimelineClip) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;

  // Edit Plan
  editPlan: EditPlan | null;
  setEditPlan: (plan: EditPlan | null) => void;
  updateEditPlan: (updates: Partial<EditPlan>) => void;

  // Export Settings
  exportTarget: "fcp" | "davinci" | "after_effects" | "daw_audio" | "universal";
  exportMode: "timeline" | "render";
  exportPreset: string;
  setExportTarget: (target: string) => void;
  setExportMode: (mode: string) => void;
  setExportPreset: (preset: string) => void;

  // QC Reports
  qaReports: QAReport[];
  setQAReports: (reports: QAReport[]) => void;
  addQAReport: (report: QAReport) => void;

  // Render Jobs
  renderJobs: RenderJob[];
  setRenderJobs: (jobs: RenderJob[]) => void;
  addRenderJob: (job: RenderJob) => void;
  updateRenderJob: (id: string, updates: Partial<RenderJob>) => void;

  // Playback
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  muted: boolean;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;

  // Viewport
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Selection
  selectedClipIds: string[];
  setSelectedClips: (ids: string[]) => void;
  toggleClipSelection: (id: string) => void;
  clearSelection: () => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activePanel: "media" | "effects" | "transitions" | "audio" | "export";
  setActivePanel: (panel: "media" | "effects" | "transitions" | "audio" | "export") => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // History (Undo/Redo)
  history: Project[];
  historyIndex: number;
  pushHistory: (project: Project) => void;
  undo: () => Project | null;
  redo: () => Project | null;
  canUndo: boolean;
  canRedo: boolean;
}

const defaultSettings: AppSettings = {
  studioPath: "/Users/mac/AI-Video-Studio",
  ffmpegPath: "ffmpeg",
  ffprobePath: "ffprobe",
  davinciPath: "/Applications/DaVinci Resolve/DaVinci Resolve.app",
  defaultTemplate: "anonymized_video",
  autoSave: true,
  autoSaveInterval: 30000,
  theme: "light",
  language: "pl",
  previewQuality: "low",
  waveformResolution: 1024,
  thumbnailCount: 10,
  maxUndoHistory: 50,
  enableGPUAcceleration: true,
  enableHardwareEncoding: true,
};

const defaultProjectSettings: ProjectSettings = {
  resolution: { width: 1920, height: 1080 },
  framerate: 30,
  videoCodec: "libx264",
  audioCodec: "aac",
  crf: 20,
  preset: "medium",
  backgroundColor: "#000000",
  audioSampleRate: 48000,
  audioChannels: 2,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Projects
      projects: [],
      currentProjectId: null,
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p)),
        })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        })),
      setCurrentProject: (id) => set({ currentProjectId: id }),
      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId);
      },

      // Media
      mediaFiles: [],
      setMediaFiles: (mediaFiles) => set({ mediaFiles }),
      addMediaFile: (file) => set((state) => ({ mediaFiles: [...state.mediaFiles, file] })),
      removeMediaFile: (id) =>
        set((state) => ({ mediaFiles: state.mediaFiles.filter((f) => f.id !== id) })),
      updateMediaFile: (id, updates) =>
        set((state) => ({
          mediaFiles: state.mediaFiles.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),

      // Timeline
      tracks: [],
      setTracks: (tracks) => set({ tracks }),
      addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
      updateTrack: (id, updates) =>
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
      addClipToTrack: (trackId, clip) =>
        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
          ),
        })),
      updateClip: (trackId, clipId, updates) =>
        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)) }
              : t
          ),
        })),
      removeClip: (trackId, clipId) =>
        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
              : t
          ),
        })),
      moveClip: (clipId, newTrackId, newStartTime) =>
        set((state) => {
          let clip: TimelineClip | null = null;
          const newTracks = state.tracks.map((t) => {
            const clipIndex = t.clips.findIndex((c) => c.id === clipId);
            if (clipIndex !== -1) {
              clip = t.clips[clipIndex];
              return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
            }
            return t;
          });
          if (clip) {
            return {
              tracks: newTracks.map((t) =>
                t.id === newTrackId
                  ? { ...t, clips: [...t.clips, { ...clip!, startTime: newStartTime }] }
                  : t
              ),
            };
          }
          return { tracks: newTracks };
        }),

      // Edit Plan
      editPlan: null,
      setEditPlan: (editPlan) => set({ editPlan }),
      updateEditPlan: (updates) =>
        set((state) => ({ editPlan: state.editPlan ? { ...state.editPlan, ...updates } : null })),

      // Export Settings
      exportTarget: "fcp",
      exportMode: "timeline",
      exportPreset: "",
      setExportTarget: (target: string) => set({ exportTarget: target as "fcp" | "davinci" | "after_effects" | "daw_audio" | "universal" }),
      setExportMode: (mode: string) => set({ exportMode: mode as "timeline" | "render" }),
      setExportPreset: (preset: string) => set({ exportPreset: preset }),

      // QC Reports
      qaReports: [],
      setQAReports: (qaReports) => set({ qaReports }),
      addQAReport: (report) => set((state) => ({ qaReports: [...state.qaReports, report] })),

      // Render Jobs
      renderJobs: [],
      setRenderJobs: (renderJobs) => set({ renderJobs }),
      addRenderJob: (job) => set((state) => ({ renderJobs: [...state.renderJobs, job] })),
      updateRenderJob: (id, updates) =>
        set((state) => ({
          renderJobs: state.renderJobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
        })),

      // Playback
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
      volume: 1,
      muted: false,
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setVolume: (volume) => set({ volume }),
      setMuted: (muted) => set({ muted }),

      // Viewport
      zoom: 1,
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
      zoomIn: () => set((state) => ({ zoom: Math.min(10, state.zoom * 1.2) })),
      zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom / 1.2) })),
      resetZoom: () => set({ zoom: 1 }),

      // Selection
      selectedClipIds: [],
      setSelectedClips: (selectedClipIds) => set({ selectedClipIds }),
      toggleClipSelection: (id) =>
        set((state) => ({
          selectedClipIds: state.selectedClipIds.includes(id)
            ? state.selectedClipIds.filter((i) => i !== id)
            : [...state.selectedClipIds, id],
        })),
      clearSelection: () => set({ selectedClipIds: [] }),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      activePanel: "media",
      setActivePanel: (activePanel) => set({ activePanel }),

      // Notifications
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, { ...notification, id: crypto.randomUUID() }],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // Settings
      settings: defaultSettings,
      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      // History
      history: [],
      historyIndex: -1,
      pushHistory: (project) =>
        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(project);
          if (newHistory.length > (state.settings.maxUndoHistory || 50)) {
            newHistory.shift();
          }
          return { history: newHistory, historyIndex: newHistory.length - 1 };
        }),
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          set({ historyIndex: historyIndex - 1 });
          return history[historyIndex - 1];
        }
        return null;
      },
      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          set({ historyIndex: historyIndex + 1 });
          return history[historyIndex + 1];
        }
        return null;
      },
      get canUndo() {
        return get().historyIndex > 0;
      },
      get canRedo() {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
      },
    }),
    {
      name: "sivs-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        projects: state.projects.map((p) => ({
          ...p,
          media: [],
          tracks: p.tracks.map((t) => ({ ...t, clips: [] })),
        })),
      }),
    }
  )
);