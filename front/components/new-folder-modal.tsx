"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { postFolders } from "@/client";
import { useParams } from "next/navigation";

interface NewFolderModalProps {
    open: boolean;
    onClose: () => void;
    onHook: () => void;
}

export function NewFolderModal({ open, onClose, onHook }: NewFolderModalProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);


    const params = useParams<{ id: string }>();

    const resetState = useCallback(() => {
        setName("");
        setLoading(false);
        setError(null);
        setSuccess(false);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [onClose, resetState]);

    const handleCreate = useCallback(async () => {
        if (!name.trim()) {
            setError("Folder name is required");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const parent_id = params?.id === "root" ? "" : (params?.id ?? "");
            await postFolders({ body: { name: name.trim(), parent_id } });

            setSuccess(true);
            onHook();

            setTimeout(() => {
                resetState();
                onClose();
            }, 700);
        } catch (err) {
            console.error("Create folder failed", err);
            setError("フォルダの作成に失敗しました");
        } finally {
            setLoading(false);
        }
    }, [name, onClose, onHook, params, resetState]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 18 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <FolderPlus className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-card-foreground">Create Folder</h2>
                                    <p className="text-xs text-muted-foreground">新しいフォルダを作成します</p>
                                </div>
                            </div>

                            <button
                                onClick={handleClose}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body: input */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-card-foreground">Folder name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={cn(
                                    "w-full rounded-md border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none",
                                    error ? "border-destructive" : "border-border"
                                )}
                                placeholder="Enter folder name"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (!loading) handleCreate();
                                    }
                                }}
                                autoFocus
                            />
                            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={handleClose}
                                className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                                disabled={loading}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleCreate}
                                className={cn(
                                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                                    success
                                        ? "bg-success text-success-foreground hover:bg-success/90"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                                disabled={loading || success}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating...
                                    </span>
                                ) : success ? (
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Created
                                    </span>
                                ) : (
                                    "Create"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
