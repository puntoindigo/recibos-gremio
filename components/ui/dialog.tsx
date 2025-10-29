import * as React from "react"
import { cn } from "@/lib/utils"

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ className, open, onOpenChange, children, ...props }, ref) => {
    if (!open) return null

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center",
          "bg-black/50 backdrop-blur-sm",
          className
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onOpenChange?.(false)
          }
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Dialog.displayName = "Dialog"

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative bg-white rounded-lg shadow-lg",
          "w-full max-w-md mx-4 p-6",
          "max-h-[90vh] overflow-y-auto",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("sticky top-0 z-10 bg-white/90 backdrop-blur-sm pt-3 pb-3 -mt-3 px-1 flex flex-col space-y-1.5 text-center sm:text-left border-b border-gray-100", className)}
        {...props}
      />
    )
  }
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    )
  }
)
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-gray-500", className)}
        {...props}
      />
    )
  }
)
DialogDescription.displayName = "DialogDescription"

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
        {...props}
      />
    )
  }
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}

