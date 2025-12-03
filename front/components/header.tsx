"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Menu,
  Search,
  Grid3X3,
  List,
  Upload,
  Bell,
  Trash2,
  Share2,
  Download,
  FolderPlus,
  Settings,
  LogOut,
  CreditCard,
  User,
  HelpCircle,
  Shield,
  ZapIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/lib/types"
import { getMe, GetMeResponse } from "@/client"

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedCount: number
  onUpload: (iszip: boolean) => void
  onFolderCreate: () => void
  onOpenAccountSettings: () => void
}

export function Header({
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  selectedCount,
  onUpload,
  onFolderCreate,
  onOpenAccountSettings,
}: HeaderProps) {
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [account, setAccount] = useState<GetMeResponse | null>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchAccount() {
      try {
        const resp = await getMe()
        if (resp.data) {
          setAccount(resp.data)
        }
      } catch (err) {
        console.error("Failed to fetch account info:", err)
      }
    }

    fetchAccount()

    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-border bg-background/80 px-3 md:px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            // value={searchQuery}
            // onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-40 rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 sm:w-60 md:w-80 lg:w-96"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        {selectedCount > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 md:gap-3"
          >
            <span className="rounded-md bg-secondary px-2 md:px-3 py-1 text-xs font-medium text-secondary-foreground">
              {selectedCount}
            </span>
            <div className="flex gap-0.5 md:gap-1">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <Download className="h-4 w-4" />
              </button>
              <button className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <Share2 className="h-4 w-4" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/*
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => onFolderCreate()}>
              <FolderPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Folder</span>
            </button>
            */}

            <button
              onClick={() => onUpload(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:gap-2 md:px-3"
            >
              <ZapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">UnZip</span>
            </button>

            <button
              onClick={() => onFolderCreate()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:gap-2 md:px-3"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Folder</span>
            </button>
            <button
              onClick={() => onUpload(false)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:gap-2 md:px-3"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </>
        )}

        <div className="hidden sm:flex items-center rounded-lg border border-border bg-secondary/50 p-0.5 md:p-1">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors md:h-8 md:w-8",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors md:h-8 md:w-8",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Notification Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
          {/*<AnimatePresence>
            {notificationOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-xl md:w-80"
              >
                <div className="border-b border-border px-4 py-3">
                  <h4 className="text-sm font-semibold text-popover-foreground">Notifications</h4>
                </div>
                <div className="max-h-64 overflow-auto">
                  <button className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-secondary/50">
                    <span className="text-sm font-medium text-popover-foreground">File shared with you</span>
                    <span className="text-xs text-muted-foreground">
                      Project Presentation.pptx was shared by Tanaka
                    </span>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </button>
                  <button className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-secondary/50">
                    <span className="text-sm font-medium text-popover-foreground">Storage alert</span>
                    <span className="text-xs text-muted-foreground">You've used 68% of your storage</span>
                    <span className="text-xs text-muted-foreground">1 day ago</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>*/}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex h-9 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-secondary md:gap-3 md:px-2"
          >
            {/*<div className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-primary/20 md:h-8 md:w-8">
              <img src="/professional-avatar.png" alt="Avatar" className="h-full w-full object-cover" />
            </div>*/}
            <div className="text-left"> {/* hidden lg:block  */}
              <p className="text-sm font-medium text-foreground">{account?.name}</p>
            </div>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-xl md:w-64"
              >
                <div className="flex items-center gap-3 border-b border-border p-3">
                  {/*<div className="h-10 w-10 overflow-hidden rounded-full md:h-12 md:w-12">
                    <img src="/professional-avatar.png" alt="Avatar" className="h-full w-full object-cover" />
                  </div>*/}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-popover-foreground">{account?.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{account?.email}</p>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      onOpenAccountSettings()
                      setProfileOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-secondary/50"
                  >
                    <User className="h-4 w-4" />
                    Account Settings
                  </button>
                </div>
                <div className="border-t border-border py-1">
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-secondary/50">
                    <HelpCircle className="h-4 w-4" />
                    Help Center
                  </button>
                </div>
                <div className="border-t border-border py-1">
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
