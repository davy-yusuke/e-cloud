"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  ImageIcon,
  Film,
  Music,
  Folder,
  FileCode,
  FileSpreadsheet,
  Presentation,
  MoreVertical,
  Check,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/lib/types"
import { deleteFilesById, getFilesByIdDownload, GetFilesResponse, getFolderByParentIdParent, ModelsNode, postMoveById } from "@/client"
import { useParams, useRouter } from "next/navigation"

interface FileGridProps {
  files: GetFilesResponse | null
  viewMode: ViewMode
  selectedFiles: string[]
  onSelect: (id: string, type: string, multiSelect: boolean) => void
  onOpen: (file: ModelsNode) => void
  onHook: () => void
}

const fileIcons: Record<string, { icon: typeof FileText; color: string }> = {
  folder: { icon: Folder, color: "text-chart-3" },
  document: { icon: FileText, color: "text-chart-2" },
  image: { icon: ImageIcon, color: "text-chart-4" },
  video: { icon: Film, color: "text-destructive" },
  audio: { icon: Music, color: "text-chart-5" },
  code: { icon: FileCode, color: "text-chart-1" },
  spreadsheet: { icon: FileSpreadsheet, color: "text-chart-1" },
  presentation: { icon: Presentation, color: "text-chart-3" },
  pdf: { icon: FileText, color: "text-destructive" },
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "—"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDate(dateString: string): string {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function CustomCheckbox({
  checked,
  onChange,
  className,
}: { checked: boolean; onChange: () => void; className?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        "flex items-center justify-center rounded border-2 transition-colors",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 bg-background",
        className,
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  )
}
function DropdownMenu({ children, trigger }: { children: React.ReactNode; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <div
        onClick={(e) => {
          e.stopPropagation()
          setOpen((s) => !s)
        }}
      >
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
function DropdownItem({
  children,
  destructive,
  onClick,
}: { children: React.ReactNode; destructive?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-secondary/50",
        destructive ? "text-destructive" : "text-popover-foreground",
      )}
    >
      {children}
    </button>
  )
}

export function FileGrid({ files, viewMode, selectedFiles, onSelect, onOpen, onHook }: FileGridProps) {
  const [localFiles, setLocalFiles] = useState<typeof files>(files ?? [])
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<ModelsNode | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const router = useRouter()

  const params = useParams() as { id?: string }

  const [currentFolderData, setCurrentFolderData] = useState<ModelsNode | null>(null)
  useEffect(() => {
    let mounted = true
    if (!params.id) {
      setCurrentFolderData(null)
      return
    }
    ; (async () => {
      try {
        const res = await getFolderByParentIdParent({ path: { parent_id: params.id ? params.id : "" } })
        if (!mounted) return
        setCurrentFolderData(res?.data ?? null)
      } catch (err) {
        console.error("failed to load current folder:", err)
        if (mounted) setCurrentFolderData(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, [params.id])

  const [imgScale, setImgScale] = useState(1)
  const [imgRotate, setImgRotate] = useState(0)
  const panRef = useRef({ x: 0, y: 0 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  const MAX_PREVIEW_SIZE = 8 * 1024 * 1024
  useEffect(() => setLocalFiles(files ?? []), [files])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const removeIdFromSet = useCallback((id: string) => {
    setRemovingIds((prev) => {
      const s = new Set(prev)
      s.delete(id)
      return s
    })
  }, [])

  const handleDelete = useCallback(
    async (fileId: string) => {
      if (!fileId || !localFiles) return
      const idx = localFiles.findIndex((f) => f.id === fileId)
      if (idx === -1) return
      const fileCopy = localFiles[idx]
      setLocalFiles((prev) => (prev ? prev.filter((f) => f.id !== fileId) : null))
      setRemovingIds((prev) => {
        const s = new Set(prev)
        s.add(fileId)
        return s
      })
      try {
        await deleteFilesById({ path: { id: fileId } })
        removeIdFromSet(fileId)
        onHook?.()
      } catch (err) {
        console.error("Delete failed, restoring file:", err)
        setLocalFiles((prev) => {
          if (!prev) return null
          const copy = [...prev]
          const insertIndex = Math.min(Math.max(0, idx), copy.length)
          copy.splice(insertIndex, 0, fileCopy)
          return copy
        })
        removeIdFromSet(fileId)
      }
    },
    [localFiles, onHook, removeIdFromSet],
  )

  function isPreviewable(file: ModelsNode | null): boolean {
    if (!file) return false
    if (file.type === "folder") return false
    if (file.size && file.size > MAX_PREVIEW_SIZE) return false
    const t = (file.mime ?? "").toLowerCase()
    const ft = (file.type ?? "").toLowerCase()
    if (t.startsWith("image/")) return true
    if (t === "application/pdf" || ft === "pdf") return true
    if (t.startsWith("text/")) return true
    if (ft === "code") return true
    if (t.startsWith("audio/")) return true
    if (t.startsWith("video/")) return true
    return false
  }

  const previewableFiles = (localFiles ?? []).filter((f) => isPreviewable(f))
  const currentIndex = previewFile ? previewableFiles.findIndex((f) => f.id === previewFile.id) : -1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!previewOpen) return
      if (e.key === "Escape") closePreview()
      else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) void fetchAndPreparePreview(previewableFiles[currentIndex - 1])
      } else if (e.key === "ArrowRight") {
        if (currentIndex >= 0 && currentIndex < previewableFiles.length - 1) {
          void fetchAndPreparePreview(previewableFiles[currentIndex + 1])
        }
      } else if (e.key === "+") zoomIn()
      else if (e.key === "-") zoomOut()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [previewOpen, previewFile, previewableFiles, currentIndex])

  async function fetchAndPreparePreview(file: ModelsNode | null) {
    if (!file || file.type === "folder") return
    setImgScale(1)
    setImgRotate(0)
    panRef.current = { x: 0, y: 0 }
    setPan({ x: 0, y: 0 })

    if (file.size && file.size > MAX_PREVIEW_SIZE) {
      setPreviewError(`このファイルは大きすぎるためプレビューできません（最大 ${formatFileSize(MAX_PREVIEW_SIZE)}）。`)
      setPreviewOpen(true)
      return
    }

    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewText(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreviewUrl(null)

    try {
      const resp = await getFilesByIdDownload({ path: { id: file.id ?? "" } })
      const blob = resp.data as Blob
      const mime = (file.mime ?? blob.type ?? "").toLowerCase()
      if (mime.startsWith("text/") || file.type === "code") {
        const text = await resp.data as string
        setPreviewText(text)
        setPreviewFile(file)
        setPreviewOpen(true)
        setPreviewUrl(null)
      } else {
        const objectUrl = URL.createObjectURL(blob)
        objectUrlRef.current = objectUrl
        setPreviewUrl(objectUrl)
        setPreviewFile(file)
        setPreviewOpen(true)
      }
    } catch (err) {
      console.error("Preview failed:", err)
      setPreviewError("プレビューの取得に失敗しました。")
      setPreviewOpen(true)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewFile(null)
    setPreviewText(null)
    setPreviewError(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreviewUrl(null)
    setImgScale(1)
    setImgRotate(0)
    panRef.current = { x: 0, y: 0 }
    setPan({ x: 0, y: 0 })
  }, [])

  async function moveNodes(ids: string[], targetParentId: string) {
    if (!ids || ids.length === 0) return
    setLocalFiles((prev) => (prev ? prev.filter((f) => !ids.includes(f.id ?? "")) : prev))
    try {
      await Promise.all(
        ids.map((id) => {
          postMoveById({
            path: { id: id },
            body: {
              parent_id: targetParentId
            }
          })
        }
        ),
      )
      onHook?.()
    } catch (err) {
      console.error("moveNodes error:", err)
      onHook?.()
    } finally {
      setDragOverId(null)
    }
  }

  const onDragStartItem = (e: React.DragEvent, file: ModelsNode) => {
    try {
      const ids = selectedFiles.includes(file.id ?? "") && selectedFiles.length > 0 ? selectedFiles : [file.id ?? ""]
      e.dataTransfer.setData("application/json", JSON.stringify({ ids }))
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", JSON.stringify({ ids }))
    } catch (err) {
      console.error("onDragStart error:", err)
    }
  }

  const onDragEndItem = () => {
    setDragOverId(null)
  }

  const onDragOverFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverId(folderId)
  }

  const onDragEnterFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    setDragOverId(folderId)
  }
  const onDragLeaveFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    setDragOverId((cur) => (cur === folderId ? null : cur))
  }

  const onDropToFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    setDragOverId(null)
    try {
      const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain")
      if (!raw) return
      const parsed = JSON.parse(raw)
      const ids: string[] = Array.isArray(parsed.ids) ? parsed.ids : []
      if (!ids.length) return
      const toMove = ids.filter((id) => id !== folderId)
      if (!toMove.length) return
      await moveNodes(toMove, folderId)
    } catch (err) {
      console.error("drop parse/move error:", err)
    } finally {
      setDragOverId(null)
    }
  }

  const downloadPreview = useCallback(() => {
    if (!previewUrl || !previewFile) return
    const a = document.createElement("a")
    a.href = previewUrl
    a.download = previewFile.name ?? "file"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [previewUrl, previewFile])

  const zoomIn = useCallback(() => setImgScale((s) => Math.min(4, +(s + 0.25).toFixed(2))), [])
  const zoomOut = useCallback(() => {
    setImgScale((s) => {
      const next = Math.max(0.5, +(s - 0.25).toFixed(2))
      if (next === 1) {
        panRef.current = { x: 0, y: 0 }
        setPan({ x: 0, y: 0 })
      }
      return next
    })
  }, [])
  const rotate = useCallback(() => setImgRotate((r) => (r + 90) % 360), [])

  /* simple pan handlers for image (drag) */
  const onImgMouseDown = (e: React.MouseEvent) => {
    if (imgScale <= 1) return
    draggingRef.current = true
    const x = e.clientX - panRef.current.x;
    const y = e.clientY - panRef.current.y;
    dragStartRef.current = { x, y };
    (e.target as Element).classList.add("cursor-grabbing")
  }
  const onImgMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return
    const nx = e.clientX - dragStartRef.current.x
    const ny = e.clientY - dragStartRef.current.y
    panRef.current = { x: nx, y: ny }
    setPan({ x: nx, y: ny })
  }
  const onImgMouseUp = (e: React.MouseEvent) => {
    draggingRef.current = false;
    (e.target as Element).classList.remove("cursor-grabbing")
  }
  const onImgMouseLeave = () => {
    draggingRef.current = false
  }

  /* thumbnails click */
  const openByIndex = (i: number) => {
    const f = previewableFiles[i]
    if (f) void fetchAndPreparePreview(f)
  }

  /* --- render list / grid (kept simple) --- */
  const listContent = (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* header row */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 md:gap-4 border-b border-border bg-secondary/50 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-muted-foreground">
        <div className="w-5 md:w-6" />
        <span>Name</span>
        <span className="w-16 md:w-24 text-right">Size</span>
        <span className="hidden md:block w-32 text-right">Modified</span>
        <div className="w-8" />
      </div>

      <AnimatePresence initial={false}>
        {localFiles?.map((file, index) => {
          const isSelected = selectedFiles.includes(file.id ?? "")
          const IconConfig = fileIcons[file.type ?? ""] ?? fileIcons.document
          const Icon = IconConfig.icon
          const isRemoving = removingIds.has(file.id ?? "")
          // dynamic classes for folder drop target highlight
          const dropHighlight = file.type === "folder" && dragOverId === file.id ? "bg-primary/10 ring-1 ring-primary" : ""
          return (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0, margin: 0, padding: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                "grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 md:gap-4 border-b border-border px-3 md:px-4 py-2.5 md:py-3 transition-colors last:border-b-0",
                isSelected ? "bg-primary/5" : "hover:bg-secondary/50",
                isRemoving ? "pointer-events-none opacity-70" : "cursor-pointer",
                dropHighlight,
              )}
              onDoubleClick={() => !isRemoving && onOpen(file)}
              onClick={(e) => {
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                  onSelect(file.id ?? "", file.type ?? "", true)
                  return
                }
                if (!isRemoving && isPreviewable(file)) {
                  void fetchAndPreparePreview(file)
                } else {
                  onSelect(file.id ?? "", file.type ?? "", false)
                }
              }}
              // --- DRAG & DROP: make each item draggable and folders droppable ---
              draggable
              onDragStart={(e) => { }}
              onDragEnd={(e) => onDragEndItem()}
              onDragOver={(e) => {
                if (file.type === "folder") onDragOverFolder(e, file.id ?? "")
              }}
              onDragEnter={(e) => {
                if (file.type === "folder") onDragEnterFolder(e, file.id ?? "")
              }}
              onDragLeave={(e) => {
                if (file.type === "folder") onDragLeaveFolder(e, file.id ?? "")
              }}
              onDrop={(e) => {
                if (file.type === "folder") void onDropToFolder(e, file.id ?? "")
              }}
            >
              <CustomCheckbox checked={isSelected} onChange={() => onSelect(file.id ?? "", file.type ?? "", true)} className="h-4 w-4 md:h-5 md:w-5" />
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <Icon className={cn("h-4 w-4 md:h-5 md:w-5 shrink-0", IconConfig.color)} />
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                  <span className="font-medium text-card-foreground text-sm truncate">{file.name}</span>
                </div>
              </div>
              <span className="w-16 md:w-24 text-right text-xs md:text-sm text-muted-foreground">
                {file.type === "folder" ? `${file.size}` : formatFileSize(file.size ?? 0)}
              </span>
              <span className="hidden md:block w-32 text-right text-sm text-muted-foreground">{formatDate(file.updated_at ?? "")}</span>
              <DropdownMenu
                trigger={
                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary md:h-8 md:w-8">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                }
              >
                <DropdownItem onClick={() => onOpen(file)}>Open</DropdownItem>
                <DropdownItem onClick={() => {/* implement download */ }}>Download</DropdownItem>
                <DropdownItem>Share</DropdownItem>
                <DropdownItem>Rename</DropdownItem>
                <div className="my-1 h-px bg-border" />
                <DropdownItem destructive onClick={() => { if (!isRemoving) handleDelete(file.id ?? "") }}>
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )

  const renderCurrentFolderGridTile = () => {
    const currentFolder = currentFolderData
    if (params.id === undefined) return null
    const dropHighlight = dragOverId === currentFolder?.id ? "ring-2 ring-primary/60" : ""
    return (
      <motion.div
        key={"__current_folder"}
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ delay: 0, type: "spring", stiffness: 280, damping: 24 }}
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className={cn(
            "group relative rounded-xl border bg-card p-3 transition-all md:p-4 cursor-pointer",
            "border-border hover:border-primary/50 hover:bg-secondary/50",
            dropHighlight,
          )}
          onClick={() => router.push(`/dashboard/${currentFolder?.id ?? ""}`)}
          onDragOver={(e) => onDragOverFolder(e, currentFolder?.id ?? "")}
          onDragEnter={(e) => onDragEnterFolder(e, currentFolder?.id ?? "")}
          onDragLeave={(e) => onDragLeaveFolder(e, currentFolder?.id ?? "")}
          onDrop={(e) => void onDropToFolder(e, currentFolder?.id ?? "")}
        >
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-100 transition-opacity md:right-2 md:top-2 md:gap-1 md:opacity-0 md:group-hover:opacity-100">
            {/* UI */}
          </div>

          <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-secondary md:mb-4">
            <Folder className="h-8 w-8 md:h-12 md:w-12 text-chart-3" />
          </div>

          <div className="space-y-0.5 md:space-y-1">
            <div className="flex items-center gap-1">
              <h4 className="truncate text-xs font-medium text-card-foreground md:text-sm">../</h4>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground md:text-xs">
              <span>{currentFolder?.size ? `${currentFolder.size} items` : ""}</span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  const gridContent = (
    <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <AnimatePresence initial={false}>
        {renderCurrentFolderGridTile()}
        {localFiles?.map((file, index) => {
          const isSelected = selectedFiles.includes(file.id ?? "")
          const IconConfig = fileIcons[file.type ?? ""] ?? fileIcons.document
          const Icon = IconConfig.icon
          const isRemoving = removingIds.has(file.id ?? "")
          const dropHighlight = file.type === "folder" && dragOverId === file.id ? "ring-2 ring-primary/60" : ""
          return (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ delay: index * 0.02, type: "spring", stiffness: 280, damping: 24 }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={cn(
                  "group relative rounded-xl border bg-card p-3 transition-all md:p-4",
                  isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50 hover:bg-secondary/50",
                  isRemoving ? "pointer-events-none opacity-70" : "cursor-pointer",
                  dropHighlight,
                )}
                onClick={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    onSelect(file.id ?? "", file.type ?? "", true)
                    return
                  }
                  if (!isRemoving && isPreviewable(file)) void fetchAndPreparePreview(file)
                  else onSelect(file.id ?? "", file.type ?? "", false)
                }}
                onDoubleClick={() => !isRemoving && onOpen(file)}
                draggable
                onDragStart={(e) => onDragStartItem(e, file)}
                onDragEnd={(e) => onDragEndItem()}
                onDragOver={(e) => { if (file.type === "folder") onDragOverFolder(e, file.id ?? "") }}
                onDragEnter={(e) => { if (file.type === "folder") onDragEnterFolder(e, file.id ?? "") }}
                onDragLeave={(e) => { if (file.type === "folder") onDragLeaveFolder(e, file.id ?? "") }}
                onDrop={(e) => { if (file.type === "folder") void onDropToFolder(e, file.id ?? "") }}
              >
                <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-100 transition-opacity md:right-2 md:top-2 md:gap-1 md:opacity-0 md:group-hover:opacity-100">
                  <CustomCheckbox checked={isSelected} onChange={() => onSelect(file.id ?? "", file.type ?? "", true)} className="h-4 w-4 bg-background" />
                  <DropdownMenu
                    trigger={
                      <button className="flex h-6 w-6 items-center justify-center rounded-md bg-background text-muted-foreground transition-colors hover:text-foreground md:h-7 md:w-7">
                        <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => onOpen(file)}>Open</DropdownItem>
                    <DropdownItem>Download</DropdownItem>
                    <DropdownItem>Share</DropdownItem>
                    <DropdownItem>Rename</DropdownItem>
                    <div className="my-1 h-px bg-border" />
                    <DropdownItem destructive onClick={() => { if (!isRemoving) handleDelete(file.id ?? "") }}>
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </div>

                <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-secondary md:mb-4">
                  <Icon className={cn("h-8 w-8 md:h-12 md:w-12", IconConfig.color)} />
                </div>

                <div className="space-y-0.5 md:space-y-1">
                  <div className="flex items-center gap-1">
                    <h4 className="truncate text-xs font-medium text-card-foreground md:text-sm">{file.name}</h4>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground md:text-xs">
                    <span>{file.type === "folder" ? `${file.size} items` : formatFileSize(file.size ?? 0)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )

  return (
    <>
      {viewMode === "list" ? listContent : gridContent}

      <AnimatePresence>
        {previewOpen && (
          <motion.div
            key="preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-2"
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePreview}
            />

            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative z-50 w-full max-w-[1100px] max-h-[86vh] rounded-3xl bg-gradient-to-br from-card/80 to-card/95 shadow-[0_40px_80px_rgba(8,15,30,0.6)] ring-1 ring-border overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-semibold text-sm truncate text-card-foreground">{previewFile?.name ?? "Preview"}</div>
                  <div className="text-xs text-muted-foreground hidden md:block">{previewFile?.size ? formatFileSize(previewFile.size) : ""}</div>
                  <div className="text-xs text-muted-foreground hidden md:block"> {previewFile?.mime ?? previewFile?.type ?? ""}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (currentIndex > 0) void fetchAndPreparePreview(previewableFiles[currentIndex - 1])
                    }}
                    className="hidden md:inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-secondary"
                    title="Previous"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); downloadPreview() }} className="inline-flex items-center rounded-md px-2 py-1 text-sm hover:bg-secondary" title="Download">
                    <Download className="h-4 w-4" />
                  </button>

                  <div className="hidden md:flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); zoomOut() }} className="rounded-md px-2 py-1 hover:bg-secondary" title="Zoom out"><ZoomOut className="h-4 w-4" /></button>
                    <div className="px-2 text-xs">{imgScale}×</div>
                    <button onClick={(e) => { e.stopPropagation(); zoomIn() }} className="rounded-md px-2 py-1 hover:bg-secondary" title="Zoom in"><ZoomIn className="h-4 w-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); rotate() }} className="rounded-md px-2 py-1 hover:bg-secondary" title="Rotate"><RotateCw className="h-4 w-4" /></button>
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); closePreview() }} className="inline-flex items-center rounded-full bg-muted/5 px-2 py-1 hover:bg-muted" title="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex h-[64vh] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-transparent to-transparent">
                <div className="relative flex w-full max-h-full items-center justify-center overflow-hidden">
                  {previewLoading && (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {previewError && (
                    <div className="flex items-center justify-center p-6 text-sm text-destructive">{previewError}</div>
                  )}

                  {!previewLoading && !previewError && previewText && (
                    <div className="w-full max-w-[92%] overflow-auto rounded-xl border border-border bg-background p-4 shadow-inner">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">{previewText}</pre>
                    </div>
                  )}

                  {!previewLoading && !previewError && previewUrl && previewFile && (
                    (() => {
                      const mime = (previewFile.mime ?? "").toLowerCase()
                      if (mime.startsWith("image/")) {
                        return (
                          <div className="relative flex w-full items-center justify-center">
                            <div
                              className="relative flex items-center justify-center max-h-[76vh] w-full overflow-hidden"
                              style={{ touchAction: imgScale > 1 ? "none" : "auto" }}
                            >
                              <img
                                src={previewUrl}
                                alt={previewFile.name ?? "image"}
                                draggable={false}
                                onMouseDown={onImgMouseDown}
                                onMouseMove={onImgMouseMove}
                                onMouseUp={onImgMouseUp}
                                onMouseLeave={onImgMouseLeave}
                                onDoubleClick={(e) => { e.stopPropagation(); setImgScale((s) => (s === 1 ? 2 : 1)) }}
                                style={{
                                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${imgScale}) rotate(${imgRotate}deg)`,
                                  transition: draggingRef.current ? "none" : "transform 180ms ease",
                                  maxHeight: "76vh",
                                  objectFit: "contain",
                                  cursor: imgScale > 1 ? "grab" : "auto",
                                }}
                                className="select-none"
                              />
                            </div>
                          </div>
                        )
                      }
                      if (mime === "application/pdf" || previewFile.type === "pdf") {
                        return <iframe src={previewUrl} className="h-[76vh] w-full rounded-b-xl border-0" title={previewFile.name ?? "pdf"} />
                      }
                      if (mime.startsWith("video/")) {
                        return <video controls src={previewUrl} className="max-h-[76vh] w-full rounded-b-xl" />
                      }
                      if (mime.startsWith("audio/")) {
                        return <audio controls src={previewUrl} className="w-full" />
                      }
                      return (
                        <div className="flex flex-col items-center gap-3 p-6">
                          <div>プレビューできません — ダウンロードしてご確認ください</div>
                          <button onClick={(e) => { e.stopPropagation(); downloadPreview() }} className="rounded px-3 py-1 text-sm hover:bg-secondary">ダウンロード</button>
                        </div>
                      )
                    })()
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-border/60 bg-white/3 px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); if (currentIndex > 0) void fetchAndPreparePreview(previewableFiles[currentIndex - 1]) }}
                    className="inline-flex items-center justify-center rounded-md p-2 hover:bg-secondary"
                    title="Prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <div className="flex gap-2 py-1 px-1">
                    {previewableFiles.map((f, i) => {
                      const active = previewFile?.id === f.id
                      const thumbUrlCandidate = (f.mime ?? "").startsWith("image/") ? previewUrl && previewFile?.id === f.id ? previewUrl : undefined : undefined
                      return (
                        <button
                          key={f.id}
                          onClick={(e) => { e.stopPropagation(); openByIndex(i) }}
                          className={cn(
                            "flex-shrink-0 flex items-center gap-2 rounded-lg border px-2 py-1",
                            active ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-secondary/50",
                          )}
                        >
                          <div className="h-10 w-10 flex items-center justify-center overflow-hidden rounded-md bg-muted/5">
                            {(f.mime ?? "").startsWith("image/") && previewFile?.id === f.id && previewUrl ? (
                              <img src={previewUrl} alt={f.name ?? "thumb"} className="h-full w-full object-cover" />
                            ) : (
                              <div className="text-muted-foreground text-xs">{f.name?.slice(0, 2).toUpperCase()}</div>
                            )}
                          </div>
                          <div className="max-w-[160px] text-left text-xs">{f.name}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); if (currentIndex < previewableFiles.length - 1) void fetchAndPreparePreview(previewableFiles[currentIndex + 1]) }}
                    className="inline-flex items-center justify-center rounded-md p-2 hover:bg-secondary"
                    title="Next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
