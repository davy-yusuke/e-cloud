"use client"

import React, { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Sidebar as RawSidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { UploadModal } from "@/components/upload-modal"
import { FilePreview } from "@/components/file-preview"
import { AccountSettingsModal } from "@/components/account-settings-modal"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { useRouter } from "next/navigation"
import { ViewMode } from "@/lib/types"
import { getAccessToken, refresh } from "@/lib/apiAuth"
import { LoadingOverlay } from "@/components/loading"

import { UploadHookContext } from "@/context/uploadHook"
import { NewFolderModal } from "@/components/new-folder-modal"

const Sidebar = React.memo(RawSidebar)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false)
    const [isZip, setZip] = useState(false)
    const [createFolder, setCreateFolder] = useState(false)
    const [previewFile, setPreviewFile] = useState<any | null>(null)
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false)
    const [currentPath, setCurrentPath] = useState<string[]>(["My Files"]);
    const [viewMode, setViewMode] = useState<ViewMode>("grid")

    const router = useRouter()

    const handleFolderCreate = () => {
        setCreateFolder(true)
    }

    const handleToggleSidebar = useCallback(() => {
        if (typeof window === "undefined") return
        if (window.innerWidth < 768) {
            setMobileSidebarOpen((v) => !v)
        } else {
            setSidebarOpen((v) => !v)
        }
    }, [])

    const closeUpload = useCallback(() => {
        setUploadModalOpen(false)
        setZip(false)
    }, [])
    const closeCreateFolder = useCallback(() => setCreateFolder(false), [])
    const [hookIndex, setHookIndex] = useState(0);

    const triggerHook = useCallback(() => {
        setHookIndex((i) => i + 1);
    }, []);

    const onHook = useCallback(() => {
        triggerHook();
    }, [triggerHook]);

    useEffect(() => {
        const handleAuth = async () => {
            if (getAccessToken()) {
                const r = await refresh()
                if (r) {
                    setLoading(false)
                } else {
                    router.push("/auth")
                }
            } else {
                router.push("/auth")
            }
        }

        handleAuth()
    }, [])

    return (
        <UploadHookContext.Provider value={{ hookIndex, triggerHook }}>
            <div className="flex h-screen overflow-hidden bg-background">
                {loading ? (
                    <AnimatePresence>
                        <LoadingOverlay />
                    </AnimatePresence>
                ) : (
                    <>
                        <AnimatePresence mode="wait">
                            {sidebarOpen && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 280, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="hidden md:block"
                                >
                                    <Sidebar
                                        currentPath={currentPath}
                                        onNavigate={(path: string[]) => setCurrentPath(path)}
                                        onUpload={() => setUploadModalOpen(true)}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <MobileSidebar
                            open={mobileSidebarOpen}
                            onClose={() => setMobileSidebarOpen(false)}
                            currentPath={currentPath}
                            onNavigate={(path: string[]) => {
                                setCurrentPath(path)
                                setMobileSidebarOpen(false)
                            }}
                            onUpload={() => {
                                setUploadModalOpen(true)
                                setMobileSidebarOpen(false)
                            }}
                        />

                        <div className="flex flex-1 flex-col overflow-hidden">
                            <Header
                                sidebarOpen={sidebarOpen}
                                onToggleSidebar={handleToggleSidebar}
                                onUpload={(b) => {
                                    setUploadModalOpen(true)
                                    if (b) setZip(true)
                                }}
                                onOpenAccountSettings={() => setAccountSettingsOpen(true)}
                                onFolderCreate={handleFolderCreate}
                                viewMode={viewMode}
                                selectedCount={0}
                                onViewModeChange={setViewMode}
                            />

                            <main className="flex-1 overflow-auto p-4 md:p-6">
                                {children}
                            </main>
                        </div>

                        <UploadModal open={uploadModalOpen} iszip={isZip} onClose={closeUpload} onHook={onHook} />
                        <NewFolderModal open={createFolder} onClose={closeCreateFolder} onHook={onHook} />
                        <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
                        <AccountSettingsModal open={accountSettingsOpen} onClose={() => setAccountSettingsOpen(false)} />
                    </>
                )}
            </div>
        </UploadHookContext.Provider>
    )
}
