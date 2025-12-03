"use client"

import { ControllersFolderStatsResponse, getFoldersByParentId, getFoldersByParentIdStats, ModelsNode } from "@/client"
import { motion } from "framer-motion"
import { FileText, TrendingUp, HardDrive } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
function categoryColorFor(type: string | undefined) {
  if (!type) return "bg-primary"
  const t = type.toLowerCase()
  if (["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"].includes(t)) return "bg-chart-2"
  if (["mp4", "mov", "mkv", "avi", "webm"].includes(t)) return "bg-chart-3"
  if (["mp3", "wav", "flac", "aac"].includes(t)) return "bg-chart-4"
  if (["js", "ts", "go", "py", "rb", "java", "c", "cpp", "rs"].includes(t)) return "bg-chart-5"
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md"].includes(t)) return "bg-chart-1"
  if (t === "folder") return "bg-muted-foreground/30"
  return "bg-primary"
}

interface StorageProps {
  hookIndex: number
  hookIndex2: number
}

export function StorageOverview({ hookIndex, hookIndex2 }: StorageProps) {
  const [storage, setStorage] = useState<ControllersFolderStatsResponse | null>(null)
  const [children, setChildren] = useState<ModelsNode[] | null>(null)
  const [loading, setLoading] = useState(false)
  const params = useParams<{ id: string }>()
  const parentId = params?.id ?? ""

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await getFoldersByParentIdStats({
        path: { parent_id: parentId === "/" ? "" : parentId }
      })
      if (res?.data) {
        setStorage(res.data)
      } else {
        setStorage(null)
      }
    } catch (e) {
      console.error("failed fetch stats", e)
      setStorage(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchChildren = async () => {
    try {
      const res = await getFoldersByParentId({
        path: { parent_id: parentId }
      })
      if (res?.data) {
        setChildren(res.data)
      } else {
        setChildren([])
      }
    } catch (e) {
      console.error("failed fetch children", e)
      setChildren([])
    }
  }

  useEffect(() => {
    fetchStats()
    fetchChildren()
  }, [parentId, hookIndex, hookIndex2])

  const totalItems = storage?.total_items ?? children?.length ?? 0
  const totalFiles = (children ?? []).filter((n) => n?.type === "file").length

  const sortedStats = (storage?.stats ?? []).slice().sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
      <div className="col-span-full rounded-xl border border-border bg-card p-4 md:p-6 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary md:h-5 md:w-5" />
            <h3 className="text-sm font-semibold text-card-foreground md:text-lg">Storage Overview</h3>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary md:px-3 md:py-1 md:text-sm">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
            +12%
          </span>
        </div>

        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-secondary md:mb-4 md:h-3">
          {sortedStats.length === 0 && (
            <div className="h-full w-full bg-muted-foreground/10" />
          )}
          {sortedStats.map((category, index) => (
            <motion.div
              key={category.type + "_" + index}
              initial={{ width: 0 }}
              animate={{ width: `${category.percent ?? 0}%` }}
              transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
              style={{ width: `${category.percent ?? 0}%` }}
              className={`h-full ${categoryColorFor(category.type)} ${index === 0 ? "rounded-l-full" : ""} ${index === sortedStats.length - 1 ? "rounded-r-full" : ""}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
          {sortedStats.map((category, index) => (
            <motion.div
              key={category.type + "_" + index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.04 }}
              className="flex items-center gap-1.5 md:gap-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[10px] text-muted-foreground md:text-xs">{category.type}</p>
                <p className="text-xs font-medium text-card-foreground md:text-sm">
                  {typeof category.percent === "number" ? `${category.percent}%` : "-"} · {category.count ?? 0}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {[
        { label: "Total Items", value: totalItems.toLocaleString(), change: "", icon: FileText, color: "text-chart-1" },
        { label: "Total Files", value: totalFiles.toLocaleString(), change: "", icon: FileText, color: "text-chart-2" },
      ].map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + index * 0.08 }}
        >
          <div className="h-full rounded-xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground md:text-sm">{stat.label}</p>
                <p className="mt-0.5 text-2xl font-bold text-card-foreground md:mt-1 md:text-3xl">{stat.value}</p>
                {stat.change && <p className="mt-1 text-[10px] text-primary md:mt-2 md:text-xs">{stat.change}</p>}
              </div>
              <div className="rounded-lg bg-primary/10 p-2 md:rounded-xl md:p-3">
                <stat.icon className={`h-4 w-4 md:h-6 md:w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
