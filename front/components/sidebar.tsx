"use client"

import { motion } from "framer-motion"
import {
  Cloud,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  currentPath: string[]
  onNavigate: (path: string[]) => void
  onUpload: () => void
}

const menuItems = [
  { icon: FolderOpen, label: "My Files", path: ["My Files"] },
]

const quickAccess = [
  { name: "Design Assets", color: "bg-chart-1" },
  { name: "Product Photos", color: "bg-chart-2" },
  { name: "Code Repository", color: "bg-chart-3" },
]

export function Sidebar({ currentPath, onNavigate, onUpload }: SidebarProps) {
  const storageUsed = 68
  const storageTotal = 100

  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-3 px-6 py-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20"
        >
          <Cloud className="h-6 w-6 text-primary-foreground" />
        </motion.div>
        <div>
          <h1 className="text-lg font-bold text-sidebar-foreground">CloudVault</h1>
          <p className="text-xs text-muted-foreground">Enterprise Storage</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3 overflow-auto">
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
                <motion.div layoutId="activeIndicator" className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/*<div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl bg-gradient-to-br from-sidebar-accent/80 to-sidebar-accent/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-sidebar-foreground">Storage</span>
            </div>
            <span className="text-xs font-medium text-primary">{storageUsed}%</span>
          </div>
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
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
            <Zap className="h-3.5 w-3.5" />
            Upgrade Plan
          </button>
        </div>

        <button className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <Settings className="h-5 w-5" />
          Settings
        </button>
      </div>*/}
    </div>
  )
}
