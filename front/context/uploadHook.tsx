"use client";

import { createContext, useContext } from "react";

export type UploadHookContextType = {
    hookIndex: number;
    triggerHook: () => void;
};

export const UploadHookContext = createContext<UploadHookContextType | undefined>(undefined);

export function useUploadHook(): UploadHookContextType {
    const ctx = useContext(UploadHookContext);
    if (!ctx) throw new Error("useUploadHook must be used inside UploadHookContext.Provider");
    return ctx;
}
