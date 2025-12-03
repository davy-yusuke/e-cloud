"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Shield, CreditCard, Camera, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMe, GetMeResponse } from "@/client"

interface AccountSettingsModalProps {
  open: boolean
  onClose: () => void
}

const settingsTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
]

function CustomSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}

export function AccountSettingsModal({ open, onClose }: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState("profile")
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 1500)
  }

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-end justify-center sm:inset-4 sm:items-center md:inset-6 lg:inset-10"
          >
            <div className="flex h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:h-full sm:max-h-[700px] sm:max-w-4xl sm:rounded-xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 md:px-6 md:py-4">
                <h2 className="text-base font-semibold text-card-foreground md:text-xl">Account Settings</h2>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary md:h-9 md:w-9"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
                {/* Mobile Tab Selector */}
                <div className="shrink-0 border-b border-border md:hidden">
                  <div className="flex gap-1 overflow-x-auto p-2">
                    {settingsTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all",
                          activeTab === tab.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Sidebar Navigation */}
                <div className="hidden w-48 shrink-0 border-r border-border bg-secondary/30 p-3 md:block md:p-4 lg:w-56">
                  <nav className="space-y-1">
                    {settingsTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all lg:gap-3 lg:px-3 lg:py-2.5",
                          activeTab === tab.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <tab.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 md:p-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {activeTab === "profile" && <ProfileSettings />}
                        {activeTab === "security" && <SecuritySettings />}
                        {activeTab === "notifications" && <NotificationSettings />}
                        {activeTab === "billing" && <BillingSettings />}
                        {activeTab === "appearance" && <AppearanceSettings />}
                        {activeTab === "language" && <LanguageSettings />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3 md:gap-3 md:px-6 md:py-4">
                <button
                  onClick={onClose}
                  className="h-9 rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex h-9 min-w-20 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 md:min-w-24"
                >
                  {saving ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent"
                    />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ProfileSettings() {
  const [account, setAccount] = useState<GetMeResponse | null>(null)

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

    fetchAccount();
  }, [])
  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-card-foreground md:text-lg">Profile Information</h3>
        <p className="text-xs text-muted-foreground md:text-sm">
          Update your personal information and profile picture.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-full ring-4 ring-primary/20 md:h-24 md:w-24">
            <img src="/professional-avatar.png" alt="Avatar" className="h-full w-full object-cover" />
          </div>
          <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 md:h-8 md:w-8">
            <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
        <div className="text-center sm:text-left">
          <h4 className="text-sm font-medium text-card-foreground md:text-base">Profile Photo</h4>
          <p className="text-xs text-muted-foreground md:text-sm">JPG, PNG or GIF. Max size 2MB.</p>
          <div className="mt-2 flex justify-center gap-2 sm:justify-start">
            <button className="h-8 rounded-lg border border-border bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary md:text-sm">
              Upload New
            </button>
            <button className="h-8 rounded-lg px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 md:text-sm">
              Remove
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div className="space-y-1.5 md:space-y-2">
          <label htmlFor="firstName" className="text-xs font-medium text-card-foreground md:text-sm">
            Name
          </label>
          <input
            id="firstName"
            defaultValue={account?.name}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 md:h-10"
          />
        </div>
        <div className="space-y-1.5 md:space-y-2">
          <label htmlFor="firstName" className="text-xs font-medium text-card-foreground md:text-sm">
            Email
          </label>
          <input
            id="email"
            type="email"
            defaultValue={account?.email}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 md:h-10"
          />
        </div>
      </div>
    </div>
  )
}

function SecuritySettings() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-card-foreground md:text-lg">Security Settings</h3>
        <p className="text-xs text-muted-foreground md:text-sm">Manage your password and security preferences.</p>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-3 md:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 md:h-10 md:w-10">
              <Shield className="h-4 w-4 text-primary md:h-5 md:w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-sm font-medium text-card-foreground md:text-base">Two-Factor Auth</h4>
              <p className="truncate text-xs text-muted-foreground md:text-sm">Add extra security</p>
            </div>
          </div>
          <CustomSwitch checked={twoFactorEnabled} onChange={setTwoFactorEnabled} />
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <h4 className="text-sm font-medium text-card-foreground md:text-base">Change Password</h4>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-xs font-medium text-card-foreground md:text-sm">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 md:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-xs font-medium text-card-foreground md:text-sm">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 md:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-medium text-card-foreground md:text-sm">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 md:h-10"
            />
          </div>
        </div>
        <button className="h-9 rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
          Update Password
        </button>
      </div>

      <div className="space-y-3 md:space-y-4">
        <h4 className="text-sm font-medium text-card-foreground md:text-base">Active Sessions</h4>
        <div className="rounded-xl border border-border bg-secondary/30 p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-card-foreground">MacBook Pro - Chrome</p>
              <p className="truncate text-xs text-muted-foreground md:text-sm">Tokyo, Japan · Current</p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    email: true,
    fileSharing: true,
    storage: true,
    weekly: false,
    marketing: false,
  })

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-card-foreground md:text-lg">Notifications</h3>
        <p className="text-xs text-muted-foreground md:text-sm">Choose how you want to be notified.</p>
      </div>

      <div className="space-y-3">
        {[
          { key: "email", title: "Email Notifications", description: "Receive notifications via email" },
          { key: "fileSharing", title: "File Sharing Alerts", description: "When someone shares a file" },
          { key: "storage", title: "Storage Alerts", description: "When storage reaches 80%" },
          { key: "weekly", title: "Weekly Summary", description: "Weekly digest of activity" },
          { key: "marketing", title: "Marketing Updates", description: "Product news and updates" },
        ].map((item) => (
          <div key={item.key} className="rounded-xl border border-border bg-secondary/30 p-3 md:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-medium text-card-foreground">{item.title}</h4>
                <p className="truncate text-xs text-muted-foreground md:text-sm">{item.description}</p>
              </div>
              <CustomSwitch
                checked={notifications[item.key as keyof typeof notifications]}
                onChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BillingSettings() {
  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-card-foreground md:text-lg">Billing & Plans</h3>
        <p className="text-xs text-muted-foreground md:text-sm">Manage your subscription and payments.</p>
      </div>

      <div className="rounded-xl border border-primary bg-primary/5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="mb-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              Pro Plan
            </span>
            <h4 className="text-lg font-bold text-card-foreground md:text-xl">$12.99/month</h4>
            <p className="text-xs text-muted-foreground md:text-sm">100 GB Storage · Unlimited Sharing</p>
          </div>
          <button className="h-9 w-full rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:w-auto">
            Change Plan
          </button>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs md:text-sm">
            <span className="text-muted-foreground">Storage Used</span>
            <span className="font-medium text-card-foreground">68 GB / 100 GB</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "68%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-card-foreground md:text-base">Payment Method</h4>
        <div className="rounded-xl border border-border bg-secondary/30 p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background md:h-10 md:w-10">
                <CreditCard className="h-4 w-4 text-primary md:h-5 md:w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-card-foreground">•••• •••• •••• 4242</p>
                <p className="text-xs text-muted-foreground md:text-sm">Expires 12/2026</p>
              </div>
            </div>
            <button className="h-8 shrink-0 rounded-lg px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-card-foreground md:text-base">Billing History</h4>
        {[
          { date: "Nov 1, 2024", amount: "$12.99", status: "Paid" },
          { date: "Oct 1, 2024", amount: "$12.99", status: "Paid" },
          { date: "Sep 1, 2024", amount: "$12.99", status: "Paid" },
        ].map((item) => (
          <div key={item.date} className="rounded-xl border border-border bg-secondary/30 p-3 md:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground">{item.amount}</p>
                <p className="text-xs text-muted-foreground md:text-sm">{item.date}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {item.status}
                </span>
                <button className="hidden h-7 rounded-lg px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary sm:block">
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppearanceSettings() {
  const [theme, setTheme] = useState("dark")
  const [accentColor, setAccentColor] = useState("green")

  const accentColors = [
    { id: "green", color: "bg-emerald-500" },
    { id: "blue", color: "bg-blue-500" },
    { id: "purple", color: "bg-purple-500" },
    { id: "red", color: "bg-red-500" },
    { id: "orange", color: "bg-orange-500" },
    { id: "pink", color: "bg-pink-500" },
  ]

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-card-foreground md:text-lg">Appearance</h3>
        <p className="text-xs text-muted-foreground md:text-sm">Customize how CloudVault looks.</p>
      </div>

      <div className="space-y-3 md:space-y-4">
        <h4 className="text-sm font-medium text-card-foreground md:text-base">Theme</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", label: "Light", colors: ["bg-white", "bg-gray-100"] },
            { id: "dark", label: "Dark", colors: ["bg-gray-900", "bg-gray-800"] },
            { id: "system", label: "System", colors: ["bg-white", "bg-gray-900"] },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTheme(item.id)}
              className={cn(
                "relative rounded-lg border-2 p-2 transition-all md:p-4",
                theme === item.id ? "border-primary" : "border-border hover:border-primary/50",
              )}
            >
              <div className="mb-2 flex gap-1 md:mb-3 md:gap-2">
                {item.colors.map((color, i) => (
                  <div key={i} className={cn("h-5 flex-1 rounded md:h-8", color)} />
                ))}
              </div>
              <p className="text-xs font-medium text-card-foreground md:text-sm">{item.label}</p>
              {theme === item.id && (
                <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary md:right-2 md:top-2 md:h-5 md:w-5">
                  <Check className="h-2.5 w-2.5 text-primary-foreground md:h-3 md:w-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <h4 className="text-sm font-medium text-card-foreground md:text-base">Accent Color</h4>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {accentColors.map((color) => (
            <button
              key={color.id}
              onClick={() => setAccentColor(color.id)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all md:h-10 md:w-10",
                color.color,
                accentColor === color.id ? "ring-2 ring-offset-2 ring-offset-background" : "hover:scale-110",
              )}
            >
              {accentColor === color.id && <Check className="h-4 w-4 text-white md:h-5 md:w-5" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LanguageSettings() {
  const [language, setLanguage] = useState("ja")

  const languages = [
    { id: "ja", label: "日本語", flag: "🇯🇵" },
    { id: "en", label: "English", flag: "🇺🇸" },
    { id: "zh", label: "中文", flag: "🇨🇳" },
    { id: "ko", label: "한국어", flag: "🇰🇷" },
  ]

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-card-foreground md:text-lg">Language & Region</h3>
        <p className="text-xs text-muted-foreground md:text-sm">Choose your preferred language.</p>
      </div>

      <div className="space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setLanguage(lang.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border p-3 transition-all md:p-4",
              language === lang.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-2xl">{lang.flag}</span>
              <span className="text-sm font-medium text-card-foreground md:text-base">{lang.label}</span>
            </div>
            {language === lang.id && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary md:h-6 md:w-6">
                <Check className="h-3 w-3 text-primary-foreground md:h-4 md:w-4" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
