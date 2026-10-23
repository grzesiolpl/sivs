"use client";

import * as React from "react";
import { Menu, X, Save, Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw, Download, Settings, ChevronDown, Monitor, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store";

export function Header() {
  const {
    currentProjectId,
    getCurrentProject,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    muted,
    setMuted,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    canUndo,
    canRedo,
    undo,
    redo,
    settings,
    updateSettings,
    addNotification,
  } = useAppStore();

  const project = getCurrentProject();
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleStop = () => { setIsPlaying(false); setCurrentTime(0); };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex h-full items-center gap-1 mr-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label="Cofnij">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cofnij (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} aria-label="Ponów">
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ponów (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <div className="flex h-full items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleStop} aria-label="Stop">
              <span className="flex h-4 w-4 items-center justify-center">
                <div className="h-4 w-4 bg-current rounded-sm" />
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.max(0, currentTime - 10))} aria-label="Cofnij 10s">
              <SkipBack className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cofnij 10s</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPlaying ? "default" : "ghost"}
              size="icon"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pauza" : "Odtwórz"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? "Pauza" : "Odtwórz"} (Spacja)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))} aria-label="Przewiń 10s">
              <SkipForward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Przewiń 10s</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <div className="flex h-full items-center gap-2 px-2">
        <span className="text-sm font-mono text-muted-foreground min-w-[120px] text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={([value]) => setCurrentTime(value)}
          className="flex-1 max-w-[400px]"
          disabled={duration === 0}
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <div className="flex h-full items-center gap-1 ml-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Select value={String(playbackRate)} onValueChange={(v) => setPlaybackRate(Number(v))}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
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
          <TooltipContent>Prędkość odtwarzania</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setMuted(!muted)} aria-label={muted ? "Włącz dźwięk" : "Wycisz"}>
              {muted ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{muted ? "Włącz dźwięk" : "Wycisz"}</TooltipContent>
        </Tooltip>
        <Slider
          value={[volume]}
          max={1}
          step={0.05}
          onValueChange={([value]) => setVolume(value)}
          className="w-24"
          disabled={muted}
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <div className="flex h-full items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={zoomOut} aria-label="Oddal">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Oddal (Ctrl+-)</TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground w-16 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={zoomIn} aria-label="Przybliż">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Przybliż (Ctrl+=)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={resetZoom} aria-label="Reset zoomu">
              <Monitor className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Dopasuj do ekranu</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <div className="flex h-full items-center gap-1 ml-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => addNotification({ type: "info", title: "Eksport", message: "Funkcja w przygotowaniu" })} aria-label="Eksport">
              <Download className="h-4 w-4 mr-1" />
              Eksport
            </Button>
          </TooltipTrigger>
          <TooltipContent>Eksportuj projekt</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ustawienia">
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ustawienia</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}