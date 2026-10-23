"use client";

import * as React from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Timeline } from "@/components/timeline/Timeline";
import { Preview } from "@/components/preview/Preview";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { Layout, PanelLeft, PanelRight, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function Editor() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1 flex">
          <ResizablePanel defaultSize={280} minSize={0} maxSize={480}>
            <div className={cn(
              "flex h-full flex-col transition-all duration-200",
              sidebarOpen ? "w-72" : "w-0 overflow-hidden"
            )}>
              {sidebarOpen && <Sidebar />}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-border/50 hover:bg-border" />

          <ResizablePanel className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 flex overflow-hidden">
              <ResizablePanelGroup direction="vertical" className="flex-1 flex">
                <ResizablePanel defaultSize={600} minSize={300} maxSize={900}>
                  <Preview />
                </ResizablePanel>
                <ResizableHandle withHandle={true} className="bg-border/50 hover:bg-border" />
                <ResizablePanel defaultSize={300} minSize={200} maxSize={500}>
                  <Timeline />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {!sidebarOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-16 z-10 rounded-r-lg border-l-0 shadow-lg"
                onClick={() => setSidebarOpen(true)}
                aria-label="Otwórz panel boczny"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Otwórz panel boczny</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}