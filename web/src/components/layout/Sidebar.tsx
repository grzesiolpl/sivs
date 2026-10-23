"use client";

import * as React from "react";
import { 
  FolderOpen, FileVideo, FileAudio, Image, Plus, Search, MoreVertical, 
  Trash2, Eye, EyeOff, Lock, Unlock, Copy, Move, Scissors, Zap, Sparkles, 
  Music, Type, Layers, Grid, List, Play, Download, CheckCircle, Target, 
  Layers as LayersIcon, Film, Music as MusicIcon, Globe, FileCode 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/store";
import { formatDuration, formatFileSize, isVideoFile, isAudioFile, isImageFile, generateId } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import type { MediaFile, QAReport, RenderJob } from "@/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function Sidebar() {
  const {
    mediaFiles,
    setMediaFiles,
    addMediaFile,
    removeMediaFile,
    updateMediaFile,
    tracks,
    setTracks,
    addTrack,
    updateTrack,
    deleteTrack,
    addClipToTrack,
    activePanel,
    setActivePanel,
    currentProjectId,
    getCurrentProject,
    editPlan,
    setEditPlan,
    qaReports,
    renderJobs,
    settings,
  } = useAppStore();

  const project = getCurrentProject();

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const mediaFile = {
        id: generateId(),
        name: file.name,
        path: URL.createObjectURL(file),
        type: isVideoFile(file.name) ? "video" : isAudioFile(file.name) ? "audio" : "image",
        size: file.size,
        duration: 0,
        createdAt: new Date(),
      } as MediaFile;
      addMediaFile(mediaFile);
    });
  }, [addMediaFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "video/*": [], "audio/*": [], "image/*": [] } });

  const handleCreateTrack = (type: "video" | "audio" | "text" | "effect") => {
    const colors = { video: "bg-blue-500", audio: "bg-green-500", text: "bg-purple-500", effect: "bg-orange-500" };
    const newTrack = {
      id: generateId(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter(t => t.type === type).length + 1}`,
      type,
      height: 80,
      visible: true,
      locked: false,
      muted: false,
      clips: [],
      color: colors[type],
    };
    addTrack(newTrack);
  };

  const handleImportMedia = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "video/*,audio/*,image/*";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      onDrop(files);
    };
    input.click();
  };

  return (
    <div className="flex h-full flex-col border-r bg-card" {...getRootProps()}>
      <input {...getInputProps()} />
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">SIVS</h2>
          <Button variant="ghost" size="icon" onClick={handleImportMedia} aria-label="Importuj media">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div
          className={`
            rounded-lg border-2 p-4 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-dashed border-muted-foreground/25"
            }
          `}
        >
          <input {...getInputProps()} />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? "Upuść pliki tutaj" : "Przeciągnij pliki lub kliknij, aby zaimportować"}
          </p>
        </div>
      </div>

      <Tabs value={activePanel} onValueChange={setActivePanel} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 p-2">
          <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
          <TabsTrigger value="effects" className="text-xs">Efekty</TabsTrigger>
          <TabsTrigger value="transitions" className="text-xs">Przejścia</TabsTrigger>
          <TabsTrigger value="audio" className="text-xs">Audio</TabsTrigger>
          <TabsTrigger value="export" className="text-xs">Eksport</TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="flex-1 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-2 border-b">
              <Input placeholder="Szukaj mediów..." className="text-sm" onChange={(e) => {}} />
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {mediaFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">Brak zaimportowanych mediów</p>
                    <p className="text-xs">Przeciągnij pliki lub kliknij +</p>
                  </div>
                ) : (
                  mediaFiles.map((media) => (
                    <MediaItem
                      key={media.id}
                      media={media}
                      onRemove={() => removeMediaFile(media.id)}
                      onAddToTimeline={() => {
                        const videoTracks = tracks.filter(t => t.type === "video");
                        if (videoTracks.length > 0) {
                          addClipToTrack(videoTracks[0].id, {
                            id: generateId(),
                            mediaId: media.id,
                            trackIndex: 0,
                            startTime: 0,
                            endTime: media.duration || 10,
                            sourceStart: 0,
                            sourceEnd: media.duration || 10,
                            speed: 1,
                            volume: 1,
                            opacity: 1,
                          });
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="effects" className="flex-1 overflow-hidden p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Efekty wideo</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "blur", name: "Rozmycie", icon: Zap },
                  { id: "color", name: "Korekcja kolorów", icon: Sparkles },
                  { id: "transform", name: "Transformacja", icon: Move },
                  { id: "crop", name: "Przycinanie", icon: Scissors },
                ].map((effect) => (
                  <Button key={effect.id} variant="outline" className="justify-start gap-2 h-auto p-2">
                    <effect.icon className="h-4 w-4" />
                    <span className="text-sm">{effect.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-medium mb-2">Efekty audio</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "volume", name: "Głośność", icon: Music },
                  { id: "fade", name: "Fade In/Out", icon: Music },
                  { id: "eq", name: "Equalizer", icon: Zap },
                  { id: "noise", name: "Redukcja szumu", icon: Sparkles },
                ].map((effect) => (
                  <Button key={effect.id} variant="outline" className="justify-start gap-2 h-auto p-2">
                    <effect.icon className="h-4 w-4" />
                    <span className="text-sm">{effect.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transitions" className="flex-1 overflow-hidden p-4">
          <h3 className="text-sm font-medium mb-2">Przejścia</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "cut", name: "Cięcie", icon: Scissors },
              { id: "fade", name: "Fade", icon: Zap },
              { id: "dissolve", name: "Rozwiewanie", icon: Sparkles },
              { id: "slide", name: "Przesunięcie", icon: Move },
              { id: "wipe", name: "Wycieranie", icon: Zap },
              { id: "zoom", name: "Zoom", icon: Sparkles },
            ].map((transition) => (
              <Button key={transition.id} variant="outline" className="justify-start gap-2 h-auto p-2">
                <transition.icon className="h-4 w-4" />
                <span className="text-sm">{transition.name}</span>
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audio" className="flex-1 overflow-hidden p-4">
          <div className="space-y-4">
            <div>
              <Label className="block mb-1">Głośność główna</Label>
              <Slider value={[1]} max={1} step={0.01} onValueChange={([v]) => {}} />
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-medium mb-2">Ścieżki audio</h3>
              <div className="space-y-2">
                {tracks.filter(t => t.type === "audio").map((track) => (
                  <AudioTrackControl key={track.id} track={track} onUpdate={updateTrack} onDelete={deleteTrack} />
                ))}
                {tracks.filter(t => t.type === "audio").length === 0 && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleCreateTrack("audio")}>
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj ścieżkę audio
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="export" className="flex-1 overflow-hidden p-4">
          <ExportPanel project={project} editPlan={editPlan} setEditPlan={setEditPlan} qaReports={qaReports} renderJobs={renderJobs} settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MediaItem({ media, onRemove, onAddToTimeline }: { media: any; onRemove: () => void; onAddToTimeline: () => void }) {
  const Icon = media.type === "video" ? FileVideo : media.type === "audio" ? FileAudio : Image;
  const color = media.type === "video" ? "text-blue-600" : media.type === "audio" ? "text-green-600" : "text-purple-600";

  return (
    <Card className="p-2">
      <CardContent className="p-0">
        <div className="flex items-center gap-2">
          <Icon className={`h-8 w-8 ${color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{media.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(media.size)} • {media.duration > 0 ? formatDuration(media.duration) : "Nieznany czas"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="iconSm" onClick={onAddToTimeline} aria-label="Dodaj do timeliny">
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="iconSm" onClick={onRemove} aria-label="Usuń">
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AudioTrackControl({ track, onUpdate, onDelete }: { track: any; onUpdate: (id: string, updates: any) => void; onDelete: (id: string) => void }) {
  return (
    <Card className="p-3">
      <CardContent className="p-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{track.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Label className="flex items-center gap-1">
                <input type="checkbox" checked={track.muted} onChange={(e) => onUpdate(track.id, { muted: e.target.checked })} /> Wycisz
              </Label>
              <Label className="flex items-center gap-1">
                <input type="checkbox" checked={track.locked} onChange={(e) => onUpdate(track.id, { locked: e.target.checked })} /> Zablokuj
              </Label>
              <Label className="flex items-center gap-1">
                <input type="checkbox" checked={track.visible} onChange={(e) => onUpdate(track.id, { visible: e.target.checked })} /> Ukryj
              </Label>
            </div>
          </div>
          <Button variant="ghost" size="iconSm" onClick={() => onDelete(track.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportPanel({ project, editPlan, setEditPlan, qaReports, renderJobs, settings }: any) {
  const [exportName, setExportName] = React.useState("");
  const [isRendering, setIsRendering] = React.useState(false);

  const { 
    exportTarget, exportMode, exportPreset, 
    setExportTarget, setExportMode, setExportPreset,
    addNotification 
  } = useAppStore();

  const handleExport = async () => {
    if (!project || !editPlan) return;
    setIsRendering(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          target: exportTarget,
          mode: exportMode,
          preset: exportPreset || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addNotification({ type: "success", title: "Eksport zakończony", message: `Wygenerowano pliki dla ${exportTarget}` });
      } else {
        addNotification({ type: "error", title: "Błąd eksportu", message: data.error });
      }
    } catch (error) {
      addNotification({ type: "error", title: "Błąd eksportu", message: String(error) });
    } finally {
      setIsRendering(false);
    }
  };

  const handleRenderPreview = () => {
    if (!project) return;
    setIsRendering(true);
    setTimeout(() => setIsRendering(false), 2000);
  };

  const handleRenderFinal = () => {
    if (!project) return;
    setIsRendering(true);
    setTimeout(() => setIsRendering(false), 5000);
  };

  const handleGeneratePlan = () => {
    if (!project) return;
  };

  const handleValidatePlan = () => {
    if (!editPlan) return;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Nazwa pliku wyjściowego</Label>
        <Input value={exportName} onChange={(e) => setExportName(e.target.value)} placeholder="final_video" className="mt-1" />
      </div>

      <div>
        <Label>Docelowy program (DAW / NLE)</Label>
        <Select value={exportTarget} onValueChange={setExportTarget} className="mt-1 w-full">
          <SelectTrigger className="w-full">
            <SelectValue>{exportTarget || "Wybierz program"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fcp">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                <span>Final Cut Pro</span>
              </div>
            </SelectItem>
            <SelectItem value="davinci">
              <div className="flex items-center gap-2">
                <LayersIcon className="h-4 w-4" />
                <span>DaVinci Resolve</span>
              </div>
            </SelectItem>
            <SelectItem value="after_effects">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>After Effects / Premiere</span>
              </div>
            </SelectItem>
            <SelectItem value="daw_audio">
              <div className="flex items-center gap-2">
                <MusicIcon className="h-4 w-4" />
                <span>Audio DAW (Logic/Reaper/PT)</span>
              </div>
            </SelectItem>
            <SelectItem value="universal">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Universal / Social / CapCut</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Tryb eksportu</Label>
        <Select value={exportMode} onValueChange={setExportMode} className="mt-1 w-full">
          <SelectTrigger className="w-full">
            <SelectValue>{exportMode || "Wybierz tryb"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timeline">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                <span>Błyskawiczna oś czasu (XML/FCPXML/EDL)</span>
                <span className="text-xs text-muted-foreground ml-auto">Bez re-enkodowania</span>
              </div>
            </SelectItem>
            <SelectItem value="render">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                <span>Render pliku wideo/audio</span>
                <span className="text-xs text-muted-foreground ml-auto">FFmpeg + kodeki NLE</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleGeneratePlan} disabled={!project}>
          <Zap className="h-4 w-4 mr-1" />
          Generuj plan (LLM)
        </Button>
        <Button variant="outline" onClick={handleValidatePlan} disabled={!editPlan}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Waliduj plan
        </Button>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-2">Render podglądu</h3>
        <Button variant="secondary" className="w-full" onClick={handleRenderPreview} disabled={isRendering || !editPlan}>
          {isRendering ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Renderowanie...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Renderuj podgląd (szybki)
            </>
          )}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Render finalny</h3>
        <Button className="w-full" onClick={handleRenderFinal} disabled={isRendering || !editPlan}>
          {isRendering ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Renderowanie...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-1" />
              Renderuj finalny (wysoka jakość)
            </>
          )}
        </Button>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-2">Eksport do NLE/DAW</h3>
        <Button variant="outline" className="w-full" onClick={handleExport} disabled={isRendering || !editPlan}>
          {isRendering ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Eksportowanie...
            </>
          ) : (
            <>
              <Target className="h-4 w-4 mr-1" />
              Eksportuj do {exportTarget.toUpperCase()} ({exportMode === "timeline" ? "Oś czasu" : "Render"})
            </>
          )}
        </Button>
      </div>

      {qaReports.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Raporty QC</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {qaReports.slice(-3).map((report: QAReport) => (
              <Badge key={report.id} variant={report.passed ? "success" : "destructive"} className="w-full justify-start gap-2">
                {report.stage === "preview" ? "Podgląd" : "Finalny"} - {report.passed ? "✓" : "✗"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {renderJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Zadania renderowania</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {renderJobs.slice(-3).map((job: RenderJob) => (
              <div key={job.id} className="text-xs text-muted-foreground">
                {job.stage} - {job.status} {job.progress > 0 ? `(${job.progress}%)` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Rozdzielczość: {settings.resolution?.width}x{settings.resolution?.height}</p>
        <p>Klatkaż: {settings.framerate}fps</p>
        <p>Kodek: {settings.videoCodec}</p>
        <p>CRF: {settings.crf}</p>
      </div>
    </div>
  );
}