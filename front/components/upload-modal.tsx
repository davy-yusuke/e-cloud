"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, File, CheckCircle2, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { postFilesUnzip, postFilesUpload } from "@/client"
import { useParams } from "next/navigation"

interface UploadModalProps {
  open: boolean
  iszip: boolean
  onClose: () => void
  onHook: () => void
}

interface UploadFile {
  id: string
  name: string
  size: number
  progress: number
  status: "uploading" | "completed" | "error"
}

export function UploadModal({ open, iszip, onClose, onHook }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])

  const params = useParams<{ id: string }>()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const simulateUpload = async (fileObj: File, uiFile: UploadFile) => {
    try {
      if (iszip) {
        await postFilesUnzip({
          body: {
            parent_id: params.id === "root" ? "" : params.id,
            file: fileObj,
          },
        })

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uiFile.id ? { ...f, progress: 100, status: "completed" } : f,
          ),
        )
      } else {
        await postFilesUpload({
          body: {
            parent_id: params.id === "root" ? "" : params.id,
            file: fileObj,
          },
        })

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uiFile.id ? { ...f, progress: 100, status: "completed" } : f,
          ),
        )
      }
    } catch (err) {
      console.error("Upload failed:", err)

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uiFile.id ? { ...f, status: "error" } : f,
        ),
      )
    }
  }


  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const dropped = Array.from(e.dataTransfer.files)

    const uiFiles = dropped.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading" as const,
    }))

    setFiles((prev) => [...prev, ...uiFiles])

    dropped.forEach((file, i) => simulateUpload(file, uiFiles[i]))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])

    const uiFiles = selected.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading" as const,
    }))

    setFiles((prev) => [...prev, ...uiFiles])

    selected.forEach((file, i) => simulateUpload(file, uiFiles[i]))
  }


  const formatSize = (bytes: number) => {
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground">Upload Files</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-xl border-2 border-dashed p-8 text-center transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
            >
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <motion.div animate={{ scale: isDragging ? 1.05 : 1 }} transition={{ type: "spring", stiffness: 300 }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-card-foreground">Drag and drop files here</p>
                <p className="mt-1 text-xs text-muted-foreground">or click to browse from your computer</p>
              </motion.div>
            </div>

            {/* File List */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 max-h-64 space-y-3 overflow-y-auto"
                >
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 rounded-lg bg-secondary p-3"
                    >
                      <File className="h-8 w-8 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-card-foreground">{file.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {/* Custom Progress Bar */}
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary-foreground/20">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${file.progress}%` }}
                              className="h-full rounded-full bg-primary"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {file.status === "completed" ? formatSize(file.size) : `${Math.round(file.progress)}%`}
                          </span>
                        </div>
                      </div>
                      {file.status === "uploading" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  onClose()
                  setFiles([])
                }}
                className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onHook()
                  setFiles([])
                  onClose()
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
