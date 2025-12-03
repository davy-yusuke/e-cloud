"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react"
import { login as apiLogin, register as apiRegister, refresh as apiRefresh, getAccessToken } from "@/lib/apiAuth"
import { useRouter } from "next/navigation"

type Mode = "login" | "register"

export default function AuthForm() {
    const [mode, setMode] = useState<Mode>("login")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [form, setForm] = useState({ email: "", password: "", name: "", confirm: "" })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [strength, setStrength] = useState(0)
    const mounted = useRef(false)
    const router = useRouter()

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    useEffect(() => {
        (async () => {
            try {
                if (!getAccessToken()) {
                    await apiRefresh()
                }
            } catch {
                // ignore
            }
        })()
    }, [])

    useEffect(() => {
        setStrength(calculatePasswordStrength(form.password))
    }, [form.password])

    function calculatePasswordStrength(pw: string) {
        if (!pw) return 0
        let score = 0
        if (pw.length >= 8) score++
        if (pw.length >= 12) score++
        if (/[0-9]/.test(pw)) score++
        if (/[A-Z]/.test(pw)) score++
        if (/[^A-Za-z0-9]/.test(pw)) score++
        return Math.min(score, 5)
    }

    function validate() {
        const e: Record<string, string> = {}
        if (!/^[\w.+\-]+@([\w\-]+\.)+[A-Za-z]{2,}$/.test(form.email)) e.email = "有効なメールアドレスを入力してください"
        if (mode === "register") {
            if (!form.name || form.name.trim().length < 2) e.name = "表示名は2文字以上にしてください"
            if (form.password.length < 8) e.password = "パスワードは8文字以上にしてください"
            if (form.password !== form.confirm) e.confirm = "確認用パスワードが一致しません"
        } else {
            if (!form.password) e.password = "パスワードを入力してください"
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        if (!validate()) return
        setLoading(true)
        setErrors({})
        try {
            if (mode === "login") {
                const resp = await apiLogin(form.email, form.password)
                if (!resp.ok) {
                    setErrors((p) => ({ ...p, server: resp.error ?? `Login failed (${resp.status})` }))
                    return
                }
                router.push("/dashboard")
                return
            }

            if (mode === "register") {
                const resp = await apiRegister(form.email, form.password, form.name)
                if (!resp.ok) {
                    setErrors((p) => ({ ...p, server: resp.error ?? `Register failed (${resp.status})` }))
                    return
                }
                router.push("/dashboard")
                return
            }
        } catch (err) {
            setErrors((p) => ({ ...p, server: (err as Error).message }))
        } finally {
            if (mounted.current) setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex items-center max-w-md mx-auto p-6">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">{mode === "login" ? "サインイン" : "アカウント作成"}</h2>
                        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
                            <button
                                className={cn(
                                    "px-3 py-1 rounded-md text-sm font-medium transition",
                                    mode === "login" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/60",
                                )}
                                onClick={() => setMode("login")}
                                type="button"
                            >
                                ログイン
                            </button>
                            <button
                                className={cn(
                                    "px-3 py-1 rounded-md text-sm font-medium transition",
                                    mode === "register" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/60",
                                )}
                                onClick={() => setMode("register")}
                                type="button"
                            >
                                登録
                            </button>
                        </div>
                    </div>

                    <AnimatePresence initial={false} mode="wait">
                        <motion.form
                            key={mode}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            onSubmit={(e) => handleSubmit(e)}
                            className="space-y-4"
                        >
                            {mode === "register" && (
                                <label className="block">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                        <User className="h-4 w-4" /> 表示名
                                    </div>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        aria-invalid={!!errors.name}
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                                </label>
                            )}

                            <label className="block">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                    <Mail className="h-4 w-4" /> メールアドレス
                                </div>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                    aria-invalid={!!errors.email}
                                />
                                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                            </label>

                            <label className="block">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                    <Lock className="h-4 w-4" /> パスワード
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        aria-invalid={!!errors.password}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((s) => !s)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}

                                {mode === "register" && (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">パスワード強度</div>
                                        <div className="w-full rounded-md bg-muted-foreground/10 h-2 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-2 transition-all",
                                                    strength <= 1 && "w-1/5",
                                                    strength === 2 && "w-2/5",
                                                    strength === 3 && "w-3/5",
                                                    strength === 4 && "w-4/5",
                                                    strength >= 5 && "w-full",
                                                    strength <= 2 ? "bg-destructive" : strength === 3 ? "bg-amber-400" : "bg-primary",
                                                )}
                                                style={{ width: `${(strength / 5) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </label>

                            {mode === "register" && (
                                <label className="block">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">確認用パスワード</div>
                                    <input
                                        type="password"
                                        value={form.confirm}
                                        onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        aria-invalid={!!errors.confirm}
                                    />
                                    {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>}
                                </label>
                            )}

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" className="h-4 w-4" />
                                    <span className="text-sm text-muted-foreground">ログイン状態を保持する</span>
                                </label>

                                {mode === "login" && (
                                    <button type="button" className="text-sm text-muted-foreground underline">
                                        パスワードを忘れた場合
                                    </button>
                                )}
                            </div>

                            {errors.server && <p className="text-sm text-destructive">{errors.server}</p>}

                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={cn(
                                        "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
                                        loading ? "opacity-60" : "bg-primary text-primary-foreground hover:opacity-95",
                                    )}
                                >
                                    {loading ? "処理中…" : mode === "login" ? "ログイン" : "アカウント作成"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                                    className="rounded-md px-3 py-2 text-sm hover:bg-secondary/50"
                                >
                                    {mode === "login" ? "アカウントを作成する" : "既にアカウントを持っている"}
                                </button>
                            </div>

                            <div className="mt-2 text-xs text-muted-foreground">※ セキュリティ: このUIはクライアント側のバリデーションを行いますが、必ずサーバー側でパスワードのハッシュ化（bcrypt/argon2 等）、レートリミット、CAPTCHA、二段階認証、CSRF 対策を実施してください。</div>
                        </motion.form>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
