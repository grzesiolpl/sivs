"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction: "horizontal" | "vertical";
}

const ResizablePanelGroup = React.forwardRef<HTMLDivElement, ResizablePanelGroupProps>(
  ({ className, direction, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex w-full h-full",
        direction === "horizontal" ? "flex-row" : "flex-col",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ResizablePanelGroup.displayName = "ResizablePanelGroup";

interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
}

const ResizablePanel = React.forwardRef<HTMLDivElement, ResizablePanelProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-1 overflow-hidden bg-background",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ResizablePanel.displayName = "ResizablePanel";

interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  withHandle?: boolean;
}

const ResizableHandle = React.forwardRef<HTMLDivElement, ResizableHandleProps>(
  ({ className, withHandle = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:w-1 after:bg-transparent hover:after:bg-muted active:after:bg-primary/50 focus:after:bg-primary/50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        withHandle && "after:w-2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-px items-center justify-center rounded-full bg-border" />
      )}
    </div>
  )
);
ResizableHandle.displayName = "ResizableHandle";

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };