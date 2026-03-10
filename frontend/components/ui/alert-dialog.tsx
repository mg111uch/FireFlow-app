"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// AlertDialog Root
const AlertDialog = ({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) => {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80"
          onClick={() => onOpenChange?.(false)}
        />
      )}
      {open && (
        <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
          {children}
        </div>
      )}
    </>
  )
}

const AlertDialogTrigger = AlertDialog

const AlertDialogContent = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return <div className={className}>{children}</div>
}

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
)
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
)
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2",
      className
    )}
    {...props}
  />
)
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = ({
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { disabled?: boolean }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium border bg-background hover:bg-gray-100 h-10 px-4 py-2 mt-2 sm:mt-0",
      disabled && "opacity-50 pointer-events-none",
      className
    )}
    disabled={disabled}
    {...props}
  />
)
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
