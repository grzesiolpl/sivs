"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDuration, secondsToTimecode } from "@/lib/utils";
import { useAppStore } from "@/store";
import { ResizablePanel, ResizableHandle, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Eye, EyeOff, Lock, Unlock, Speaker, VolumeX, Copy, Scissors, Move, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const TRACK_HEIGHT = 80;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const PIXELS_PER_SECOND_BASE = 50;

export function Timeline() {
  const {
    tracks,
    currentTime,
    duration,
    zoom,
    setZoom,
    isPlaying,
    selectedClipIds,
    setSelectedClips,
    updateTrack,
    deleteTrack,
    updateClip,
    removeClip,
    addClipToTrack,
    mediaFiles,
  } = useAppStore();

  const timelineRef = React.useRef<HTMLDivElement>(null);
  const rulerRef = React.useRef<HTMLDivElement>(null);
  const tracksContainerRef = React.useRef<HTMLDivElement>(null);

  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoom;
  const totalWidth = Math.max((duration || 60) * pixelsPerSecond, 1920);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta)));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (rulerRef.current) rulerRef.current.scrollLeft = target.scrollLeft;
    if (tracksContainerRef.current) tracksContainerRef.current.scrollTop = target.scrollTop;
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const time = x / pixelsPerSecond;
    // This would need to update currentTime via store
  };

  const formatTime = (seconds: number) => secondsToTimecode(seconds, true);

  const getTimeMarkers = () => {
    const markers = [];
    const visibleDuration = duration || 60;
    const interval = getTimeInterval(visibleDuration, pixelsPerSecond);
    for (let t = 0; t <= visibleDuration; t += interval) {
      markers.push(t);
    }
    return markers;
  };

  const getTimeInterval = (visibleDuration: number, pxPerSec: number) => {
    const targetPx = 100;
    const intervalSec = targetPx / pxPerSec;
    const intervals = [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600];
    return intervals.find(i => i >= intervalSec) || 600;
  };

  const handleTrackHeaderClick = (trackId: string) => {
    // Select all clips in track
  };

  const handleClipClick = (clipId: string, trackId: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const current = useAppStore.getState().selectedClipIds;
      const updated = current.includes(clipId)
        ? current.filter((id) => id !== clipId)
        : [...current, clipId];
      setSelectedClips(updated);
    } else {
      setSelectedClips([clipId]);
    }
    e.stopPropagation();
  };

  const handleClipDoubleClick = (clipId: string, trackId: string) => {
    // Open clip properties
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      selectedClipIds.forEach(clipId => {
        tracks.forEach(track => {
          const clip = track.clips.find(c => c.id === clipId);
          if (clip) removeClip(track.id, clipId);
        });
      });
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        selectedClipIds.forEach(clipId => {
          tracks.forEach(track => {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) removeClip(track.id, clipId);
          });
        });
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedClipIds, tracks, removeClip]);

  return (
    <div className="flex-1 flex flex-col border-t bg-muted/30" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex h-8 items-center px-3 border-b bg-background">
        <span className="text-xs font-medium text-muted-foreground">Timeline</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="iconSm" onClick={() => setZoom(zoom * 0.8)} aria-label="Oddal">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Oddal</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground w-16 text-center">{Math.round(zoom * 100)}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="iconSm" onClick={() => setZoom(zoom * 1.25)} aria-label="Przybliż">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Przybliż</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="iconSm" onClick={() => setZoom(1)} aria-label="Reset zoomu">
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dopasuj</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 flex overflow-auto" onWheel={handleWheel} onScroll={handleScroll}>
        <div ref={rulerRef} className="w-full h-24 border-b bg-background flex-shrink-0" style={{ width: totalWidth }}>
          <div className="h-full px-3" style={{ width: totalWidth }}>
            {getTimeMarkers().map((time) => (
              <div
                key={time}
                className="absolute top-0 bottom-0 w-px bg-border"
                style={{ left: time * pixelsPerSecond }}
              >
                <span className="absolute -top-20 left-0 text-[10px] text-muted-foreground whitespace-nowrap transform -translate-x-1/2">
                  {formatTime(time)}
                </span>
              </div>
            ))}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-primary pointer-events-none"
              style={{ left: currentTime * pixelsPerSecond }}
            >
              <div className="absolute -top-2 left-1/2 w-3 h-3 -translate-x-1/2 rounded-full bg-primary border-2 border-background" />
            </div>
          </div>
        </div>

        <ResizablePanelGroup direction="vertical" className="flex-1 flex">
          {tracks.map((track, trackIndex) => (
            <React.Fragment key={track.id}>
              <ResizablePanel defaultSize={TRACK_HEIGHT} minSize={60} maxSize={200}>
                <TrackLane
                  track={track}
                  trackIndex={trackIndex}
                  pixelsPerSecond={pixelsPerSecond}
                  totalWidth={totalWidth}
                  currentTime={currentTime}
                  selectedClipIds={selectedClipIds}
                  onClipClick={handleClipClick}
                  onClipDoubleClick={handleClipDoubleClick}
                  mediaFiles={mediaFiles}
                  updateTrack={updateTrack}
                  deleteTrack={deleteTrack}
                />
              </ResizablePanel>
              {trackIndex < tracks.length - 1 && (
                <ResizableHandle withHandle={false} className="bg-border/50 hover:bg-border" />
              )}
            </React.Fragment>
          ))}
          {tracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Brak ścieżek. Dodaj ścieżkę z panelu Media lub Efekty.</p>
            </div>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function TrackLane({
  track,
  trackIndex,
  pixelsPerSecond,
  totalWidth,
  currentTime,
  selectedClipIds,
  onClipClick,
  onClipDoubleClick,
  mediaFiles,
  updateTrack,
  deleteTrack,
}: {
  track: any;
  trackIndex: number;
  pixelsPerSecond: number;
  totalWidth: number;
  currentTime: number;
  selectedClipIds: string[];
  onClipClick: (clipId: string, trackId: string, e: React.MouseEvent) => void;
  onClipDoubleClick: (clipId: string, trackId: string) => void;
  mediaFiles: any[];
  updateTrack: (id: string, updates: any) => void;
  deleteTrack: (id: string) => void;
}) {
  const isSelected = selectedClipIds.some(id => track.clips.some((c: any) => c.id === id));

  return (
    <div className="relative h-full border-b" style={{ backgroundColor: track.locked ? "rgba(0,0,0,0.02)" : "transparent" }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ width: totalWidth }}>
        <div className="w-full h-full" style={{ width: totalWidth }}>
          {Array.from({ length: Math.ceil((totalWidth / pixelsPerSecond) / 10) }).map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: i * 10 * pixelsPerSecond }} />
          ))}
        </div>
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center border-r bg-background/50 flex-shrink-0">
        <div className="p-2 w-full">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: track.color }}
            />
            <span className="text-sm font-medium truncate">{track.name}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="iconSm" onClick={() => updateTrack(track.id, { visible: !track.visible })} aria-label={track.visible ? "Ukryj" : "Pokaż"}>
                  {track.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{track.visible ? "Ukryj ścieżkę" : "Pokaż ścieżkę"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="iconSm" onClick={() => updateTrack(track.id, { locked: !track.locked })} aria-label={track.locked ? "Odblokuj" : "Zablokuj"}>
                  {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{track.locked ? "Odblokuj ścieżkę" : "Zablokuj ścieżkę"}</TooltipContent>
            </Tooltip>
            {track.type === "audio" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="iconSm" onClick={() => updateTrack(track.id, { muted: !track.muted })} aria-label={track.muted ? "Włącz dźwięk" : "Wycisz"}>
                    {track.muted ? <VolumeX className="h-3 w-3" /> : <Speaker className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{track.muted ? "Włącz dźwięk" : "Wycisz ścieżkę"}</TooltipContent>
              </Tooltip>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="iconSm" aria-label="Opcje ścieżki">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Opcje ścieżki</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ścieżka: {track.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateTrack(track.id, { visible: !track.visible })}>
                  {track.visible ? "Ukryj" : "Pokaż"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateTrack(track.id, { locked: !track.locked })}>
                  {track.locked ? "Odblokuj" : "Zablokuj"}
                </DropdownMenuItem>
                {track.type === "audio" && (
                  <DropdownMenuItem onClick={() => updateTrack(track.id, { muted: !track.muted })}>
                    {track.muted ? "Włącz dźwięk" : "Wycisz"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { /* delete track */ }}>
                  Usuń ścieżkę
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div
        className="absolute left-24 right-0 top-0 bottom-0 overflow-hidden"
        style={{ width: `calc(${totalWidth}px - 96px)` }}
      >
        <div className="h-full" style={{ width: totalWidth }}>
          {track.clips.map((clip: any) => {
            const media = mediaFiles.find(m => m.id === clip.mediaId);
            const clipWidth = (clip.endTime - clip.startTime) * pixelsPerSecond;
            const clipLeft = clip.startTime * pixelsPerSecond;
            const isClipSelected = selectedClipIds.includes(clip.id);

            return (
              <div
                key={clip.id}
                className={cn(
                  "absolute top-1 bottom-1 rounded border-2 transition-all cursor-pointer select-none",
                  "flex items-center px-1 overflow-hidden",
                  isClipSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg" : "",
                  track.locked && "opacity-50 pointer-events-none"
                )}
                style={{
                  left: clipLeft,
                  width: Math.max(clipWidth, 2),
                  backgroundColor: track.color + "20",
                  borderColor: track.color,
                  zIndex: isClipSelected ? 10 : 1,
                }}
                onClick={(e) => onClipClick(clip.id, track.id, e)}
                onDoubleClick={() => onClipDoubleClick(clip.id, track.id)}
              >
                {clipWidth > 60 && media && (
                  <span className="text-xs font-medium truncate whitespace-nowrap text-white/90 drop-shadow">
                    {media.name}
                  </span>
                )}
                {clipWidth > 100 && (
                  <span className="text-[10px] text-white/70 ml-1 whitespace-nowrap">
                    {formatDuration(clip.endTime - clip.startTime)}
                  </span>
                )}
                {clip.speed !== 1 && (
                  <span className="absolute -top-4 right-0 text-[9px] bg-primary/90 text-white px-1 rounded">
                    {clip.speed}x
                  </span>
                )}
                <div className="absolute left-0 top-0 w-1 h-full bg-primary/50" />
                <div className="absolute right-0 top-0 w-1 h-full bg-primary/50" />
              </div>
            );
          })}
        </div>
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-primary pointer-events-none"
          style={{ left: currentTime * pixelsPerSecond }}
        />
      </div>
    </div>
  );
}