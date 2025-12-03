"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { StorageOverview } from "@/components/storage-overview"
import { FileGrid } from "@/components/file-grid"
import { getFoldersByParentId, getFolderByParentIdParent, GetFilesResponse } from "@/client"
import { useParams, useRouter } from "next/navigation"
import type { ViewMode } from "@/lib/types"
import { useUploadHook } from "@/context/uploadHook"
import { refresh } from "@/lib/apiAuth"

export default function DashboardFolderPage() {
    const params = useParams() as { id?: string }
    const router = useRouter()
    const [fileToPreview, setFileToPreview] = useState<GetFilesResponse | null>(null)
    const [selectedFiles, setSelectedFiles] = useState<string[]>([])
    const { hookIndex } = useUploadHook()
    const [hookIndex2, setHookIndex2] = useState(hookIndex)

    const handleGetFiles = async () => {
        const resp = await getFoldersByParentId({ path: { parent_id: params.id ? params.id : "" } })
        if (resp && resp.data) {
            setFileToPreview(resp.data)
        } else {
            const r = await refresh()
            if (!r) {
                router.push("/auth")
            }
        }

    }

    useEffect(() => {
        handleGetFiles()
    }, [params.id, hookIndex])

    useEffect(() => {
        handleGetFiles()
    }, [hookIndex2])

    const handleBack = async () => {
        const res = await getFolderByParentIdParent({ path: { parent_id: params.id ?? "" } })
        if (res.data && res.data.id) {
            router.push(`/dashboard/${res.data.id}`)
        } else {
            router.push("/dashboard")
        }
    }

    const handleFileSelect = (id: string, type: string, multiSelect: boolean) => {
        if (multiSelect) {
            if (type === "folder") {
                router.push(`/dashboard/${id}`)
            } else {
                setSelectedFiles((prev) => (prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]))
            }
        } else {
            if (type === "folder") {
                router.push(`/dashboard/${id}`)
            } else {
                setSelectedFiles([id])
            }
        }
    }

    const handleFileOpen = (file: any) => {
        if (file.type === "folder") {
            router.push(`/dashboard/${file.id}`)
        } else {
        }
    }

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <StorageOverview hookIndex2={hookIndex2} hookIndex={hookIndex} />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="mt-6 md:mt-8">
                <div className="mb-3">
                    <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground">
                        ← Back
                    </button>
                </div>

                <FileGrid
                    files={fileToPreview}
                    viewMode={"grid"}
                    selectedFiles={selectedFiles}
                    onSelect={handleFileSelect}
                    onOpen={handleFileOpen}
                    onHook={() => setHookIndex2((i) => i + 1)}
                />
            </motion.div>
        </>
    )
}
