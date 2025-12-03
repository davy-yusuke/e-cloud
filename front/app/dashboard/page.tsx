"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { StorageOverview } from "@/components/storage-overview"
import { FileGrid } from "@/components/file-grid"
import { getFiles, GetFilesResponse } from "@/client"
import type { ViewMode } from "@/lib/types"
import { useRouter } from "next/navigation"
import { refresh } from "@/lib/apiAuth"
import { useUploadHook } from "@/context/uploadHook"

export default function DashboardIndexPage() {
    const [fileToPreview, setFileToPreview] = useState<GetFilesResponse | null>(null)
    const [selectedFiles, setSelectedFiles] = useState<string[]>([])
    const { hookIndex } = useUploadHook()
    const [hookIndex2, setHookIndex2] = useState(hookIndex)
    const router = useRouter()

    const handleGetFiles = async () => {
        const resp = await getFiles()
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
    }, [])

    useEffect(() => {
        handleGetFiles()
    }, [hookIndex2, hookIndex])

    const handleFileSelect = (id: string, type: string, multiSelect: boolean) => {
        if (multiSelect) {
            if (type === "folder") {
                router.push(`/dashboard/${id}`)
            } else {
                setSelectedFiles((prev) => (prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]))
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
        }
    }

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <StorageOverview hookIndex2={hookIndex2} hookIndex={hookIndex} />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="mt-6 md:mt-8">
                <div className="mb-3">
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
