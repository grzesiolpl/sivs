"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const selectStyles = "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1";

const Select = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot> & { value?: string; onValueChange?: (value: string) => void }
>(({ className, children, ...props }, ref) => {
  return (
    <Slot
      ref={ref}
      className={cn(selectStyles, className)}
      {...props}
    >
      {children}
    </Slot>
  );
});
Select.displayName = "Select";

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(selectStyles, className)}
    {...props}
  >
    {children}
    <svg className="ml-2 h-4 w-4 opacity-50" viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8l4 4 4-4" />
    </svg>
  </button>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => (
  <span ref={ref} className={cn("pointer-events-none", className)} {...props}>
    {children}
  </span>
));
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { position?: "popper" | "inline" }
>(({ className, children, position = "popper", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
      position === "popper" && "data-[side=bottom]:animate-in data-[side=bottom]:fade-in-0 data-[side=bottom]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:animate-in data-[side=left]:fade-in-0 data-[side=left]:zoom-in-95 data-[side=left]:slide-in-from-right-2 data-[side=right]:animate-in data-[side=right]:fade-in-0 data-[side=right]:zoom-in-95 data-[side=right]:slide-in-from-left-2 data-[side=top]:animate-in data-[side=top]:fade-in-0 data-[side=top]:zoom-in-95 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  >
    <div className="p-1">{children}</div>
  </div>
));
SelectContent.displayName = "SelectContent";

const SelectGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-1", className)} {...props}>
    {children}
  </div>
));
SelectGroup.displayName = "SelectGroup";

const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props}>
    {children}
  </div>
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; disabled?: boolean }
>(({ className, children, value, disabled, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
    data-value={value}
    data-disabled={disabled}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <svg className="h-2.5 w-2.5" viewBox="0 0 4 4" fill="currentColor">
        <path d="M0 0h4v4H0z" />
      </svg>
    </span>
    {children}
  </div>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
SelectSeparator.displayName = "SelectSeparator";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectSeparator };