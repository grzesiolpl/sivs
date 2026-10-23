"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDuration, secondsToTimecode } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, Camera, Download } from "lucide-react";

export function Preview() {
  const {
    currentTime,
    duration,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    muted,
    setMuted,
    mediaFiles,
    tracks,
    selectedClipIds,
  } = useAppStore();

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => secondsToTimecode(seconds, true);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = currentTime;
    video.playbackRate = playbackRate;
    video.volume = muted ? 0 : volume;
    video.muted = muted;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [currentTime, isPlaying, playbackRate, volume, muted]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      // Update currentTime in store would need to be throttled
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      // Duration would be set from project
    }
  };

  const handleProgress = () => {
    const video = videoRef.current;
    if (video) {
      // Buffered ranges
    }
  };

  const handleVideoClick = () => {
    setIsPlaying(!isPlaying);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      setIsPlaying(!isPlaying);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      setCurrentTime(Math.max(0, currentTime - (e.shiftKey ? 10 : 1)));
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      setCurrentTime(Math.min(duration, currentTime + (e.shiftKey ? 10 : 1)));
    } else if (e.code === "ArrowUp") {
      e.preventDefault();
      setVolume(Math.min(1, volume + 0.1));
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      setVolume(Math.max(0, volume - 0.1));
    } else if (e.code === "KeyM") {
      setMuted(!muted);
    } else if (e.code === "KeyF") {
      // Toggle fullscreen
    }
  };

  const getCurrentFrame = () => {
    // Determine which clip should be playing at currentTime
    for (const track of tracks) {
      if (!track.visible || track.muted) continue;
      for (const clip of track.clips) {
        if (currentTime >= clip.startTime && currentTime < clip.endTime) {
          const media = mediaFiles.find(m => m.id === clip.mediaId);
          if (media && media.type === "video") {
            return { clip, media, progress: (currentTime - clip.startTime) / (clip.endTime - clip.startTime) };
          }
        }
      }
    }
    return null;
  };

  const currentFrame = getCurrentFrame();

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col bg-black overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {currentFrame && videoRef.current ? (
          <video
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            src={currentFrame.media.path}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onProgress={handleProgress}
            onClick={handleVideoClick}
            playsInline
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white/50 gap-4">
            <div className="text-6xl">🎬</div>
            <p className="text-lg">SIVS Preview</p>
            <p className="text-sm">
              {currentFrame
                ? `Odtwarzanie: ${currentFrame.media.name} (${Math.round(currentFrame.progress * 100)}%)`
                : "Brak klipu na bieżącej pozycji timeliny"}
            </p>
            {tracks.length === 0 && <p className="text-xs">Dodaj ścieżki i klipy do timeliny</p>}
          </div>
        )}

        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
              <Pause className="h-12 w-12 text-white" />
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-mono min-w-[80px] text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={([value]) => setCurrentTime(value)}
              className="flex-1"
              disabled={duration === 0}
            />
            <span className="text-white text-sm font-mono min-w-[80px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
            <span className="text-white text-sm font-medium">SIVS Preview</span>
            {currentFrame && (
              <span className="text-white/70 text-xs px-2 py-0.5 bg-white/10 rounded">
                {currentFrame.media.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="iconSm" onClick={() => { /* snapshot */ }} aria-label="Zrzut ekranu">
                  <Camera className="h-4 w-4 text-white" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zrzut ekranu (S)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="iconSm" onClick={() => { /* fullscreen */ }} aria-label="Pełny ekran">
                  <Maximize className="h-4 w-4 text-white" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pełny ekran (F)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="flex h-16 items-center justify-between px-4 border-t bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.max(0, currentTime - 10))} aria-label="Cofnij 10s">
                <SkipBack className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cofnij 10s (Shift+←)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPlaying ? "default" : "ghost"}
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pauza" : "Odtwórz"}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? "Pauza" : "Odtwórz"} (Spacja)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))} aria-label="Przewiń 10s">
                <SkipForward className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Przewiń 10s (Shift+→)</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Select value={String(playbackRate)} onValueChange={(v) => setPlaybackRate(Number(v))}>
                <SelectTrigger className="w-[70px] h-8 bg-background/80 text-sm">
                  <SelectValue>{playbackRate}x</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.25">0.25x</SelectItem>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>Prędkość</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setMuted(!muted)} aria-label={muted ? "Włącz dźwięk" : "Wycisz"}>
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{muted ? "Włącz dźwięk" : "Wycisz"} (M)</TooltipContent>
          </Tooltip>
          <Slider
            value={[volume]}
            max={1}
            step={0.05}
            onValueChange={([value]) => setVolume(value)}
            className="w-32"
            disabled={muted}
          />
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Eksportuj klatkę">
                <Download className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eksportuj obecną klatkę</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// Need Select imports
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";