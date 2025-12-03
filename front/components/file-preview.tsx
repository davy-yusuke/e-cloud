"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  Share2,
  Trash2,
  Star,
  MoreVertical,
  FileText,
  ImageIcon,
  Film,
  Calendar,
  HardDrive,
  User,
  ExternalLink,
  X,
} from "lucide-react"
import type { FileItem } from "@/lib/types"
import { ModelsNode } from "@/client"

interface FilePreviewProps {
  file: ModelsNode | null
  onClose: () => void
}

const previewIcons: Record<string, typeof FileText> = {
  document: FileText,
  image: ImageIcon,
  video: Film,
  pdf: FileText,
  spreadsheet: FileText,
  presentation: FileText,
  code: FileText,
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "—"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const Icon = file ? previewIcons[file.type ? file.type : ""] || FileText : FileText

  return (
    <AnimatePresence>
      {file && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full border-l border-border bg-card sm:max-w-[400px]"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
              <h3 className="text-base font-semibold text-card-foreground">File Details</h3>
              <div className="flex items-center gap-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-chart-3">
                  <Star className="h-4 w-4" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary">
                  <MoreVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary md:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="h-[calc(100vh-60px)] overflow-y-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4">
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-secondary/80">
                  <Icon className="h-16 w-16 text-muted-foreground" />
                </div>

                <div className="mt-4">
                  <h3 className="break-words text-base font-semibold leading-tight text-card-foreground">
                    {file.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/*{file.starred && (
                      <span className="inline-flex items-center rounded-full bg-chart-3/20 px-2.5 py-0.5 text-xs font-medium text-chart-3">
                        <Star className="mr-1 h-3 w-3 fill-current" />
                        Starred
                      </span>
                    )}
                    {file.shared && (
                      <span className="inline-flex items-center rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
                        <Share2 className="mr-1 h-3 w-3" />
                        Shared
                      </span>
                    )}*/}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-transparent text-foreground transition-colors hover:bg-secondary">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-transparent text-destructive transition-colors hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="my-5 h-px bg-border" />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-card-foreground">File Information</h4>

                  <div className="grid gap-3">
                    {file.type && file.size && [
                      { icon: HardDrive, label: "Size", value: formatFileSize(file.size) },
                      { icon: User, label: "Owner", value: "You" },
                      {
                        icon: ExternalLink,
                        label: "Type",
                        value: file.type.charAt(0).toUpperCase() + file.type.slice(1),
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="truncate text-sm font-medium text-card-foreground">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="my-5 h-px bg-border" />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-card-foreground">Activity</h4>
                  <div className="space-y-2">
                    {[
                      { action: "You edited this file", time: "2 hours ago" },
                      { action: "You shared with 3 people", time: "1 day ago" },
                      { action: "You uploaded this file", time: "3 days ago" },
                    ].map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 rounded-lg bg-secondary/30 p-2.5"
                      >
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-card-foreground">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
