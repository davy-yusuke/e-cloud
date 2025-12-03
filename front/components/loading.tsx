"use client"

import { motion } from "framer-motion"

export function LoadingOverlay() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="
        absolute inset-0 z-50 flex items-center justify-center
        backdrop-blur-sm bg-background/40
      "
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                    scale: [0.9, 1, 0.9],
                    opacity: 1,
                }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="flex flex-col items-center gap-3"
            >
                {/* 外周リング */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="w-12 h-12 border-4 border-primary/40 border-t-primary rounded-full"
                />

                {/* テキスト */}
                <motion.div
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="text-sm text-muted-foreground"
                >
                    Loading...
                </motion.div>
            </motion.div>
        </motion.div>
    )
}
