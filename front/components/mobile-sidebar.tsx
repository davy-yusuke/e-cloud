"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Cloud,
  FolderOpen,
  Star,
  Clock,
  Trash2,
  Share2,
  HardDrive,
  Plus,
  Settings,
  ChevronRight,
  Zap,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
  currentPath: string[]
  onNavigate: (path: string[]) => void
  onUpload: () => void
}

const menuItems = [
  { icon: FolderOpen, label: "My Files", path: ["My Files"] },
]

export function MobileSidebar({ open, onClose, currentPath, onNavigate, onUpload }: MobileSidebarProps) {
  const storageUsed = 68
  const storageTotal = 100

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
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 z-50 h-full w-[300px] border-r border-border bg-sidebar"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                    <Cloud className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-sidebar-foreground">CloudVault</h1>
                    <p className="text-xs text-muted-foreground">Enterprise Storage</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Upload Button */}
              <div className="p-4">
                <button
                  onClick={onUpload}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  New Upload
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 overflow-auto px-3">
                {menuItems.map((item, index) => {
                  const isActive = currentPath[0] === item.path[0]
                  return (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onNavigate(item.path)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                        )}
                      />
                      {item.label}
                      {isActive && (
                        <motion.div
                          layoutId="mobileActiveIndicator"
                          className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                        />
                      )}
                    </motion.button>
                  )
                })}
              </nav>

              {/* Storage Info */}
              <div className="border-t border-sidebar-border p-4">
                <div className="rounded-xl bg-gradient-to-br from-sidebar-accent/80 to-sidebar-accent/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-sidebar-foreground">Storage</span>
                    </div>
                    <span className="text-xs font-medium text-primary">{storageUsed}%</span>
                  </div>
                  {/* Custom Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${storageUsed}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {storageUsed} GB of {storageTotal} GB used
                  </p>
                  <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                    <Zap className="h-3.5 w-3.5" />
                    Upgrade Plan
                  </button>
                </div>

                <button className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                  <Settings className="h-5 w-5" />
                  Settings
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
