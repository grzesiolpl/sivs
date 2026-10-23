"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Info, Clock, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";

export function DevTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [warningLevel, setWarningLevel] = useState<"ok" | "warn" | "danger">("ok");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      setElapsed(diff);
      
      // Typical Next.js dev server timeout warnings
      // 30 min = 1800s, 1 hour = 3600s
      if (diff >= 3600) setWarningLevel("danger");
      else if (diff >= 1800) setWarningLevel("warn");
      else setWarningLevel("ok");
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getTooltipText = () => {
    const base = `Serwer deweloperski działa od ${formatTime(elapsed)}.`;
    if (warningLevel === "danger") {
      return `${base} ⚠️ Za długo! Next.js dev server często wygasa po 30-60 min. Zrestartuj: Ctrl+C → sivs --web`;
    }
    if (warningLevel === "warn") {
      return `${base} ⏳ Uwaga: po ~30 min dev server może wygasnąć (hot reload przestanie działać). Zapisz pracę!`;
    }
    return `${base} ✅ Działa stabilnie. Typowy limit: 30-60 min (hot reload).`;
  };

  const getColorClasses = () => {
    switch (warningLevel) {
      case "danger": return "bg-red-500/10 text-red-600 border-red-500/30 dark:bg-red-500/20 dark:text-red-400";
      case "warn": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-400";
      default: return "bg-green-500/10 text-green-600 border-green-500/30 dark:bg-green-500/20 dark:text-green-400";
    }
  };

  const getIcon = () => {
    switch (warningLevel) {
      case "danger": return <AlertCircle className="h-3.5 w-3.5" />;
      case "warn": return <Clock className="h-3.5 w-3.5" />;
      default: return <Zap className="h-3.5 w-3.5" />;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`fixed bottom-4 right-4 z-50 px-3 py-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${getColorClasses()} border`}>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 text-sm font-mono font-medium">
                {getIcon()}
                <span>{formatTime(elapsed)}</span>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <p className="text-sm">{getTooltipText()}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}