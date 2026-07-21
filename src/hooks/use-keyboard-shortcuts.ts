'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, type AppMode } from '@/store/app-store'
import { toast } from '@/hooks/use-toast'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ShortcutDef {
  /** Unique id for the shortcut */
  id: string
  /** Keyboard combo as displayed, e.g. "Alt+1" or "F2" */
  keys: string
  /** English label */
  label: string
  /** Nepali label */
  labelNepali: string
  /** Category for grouping */
  category: 'navigation' | 'quick-action' | 'general'
  /** Only active in this mode; omit = both modes */
  mode?: AppMode
  /** Optional description for tooltip */
  description?: string
}

export interface ShortcutCallbacks {
  onQuickIncome?: () => void
  onQuickExpense?: () => void
  onNewInvoice?: () => void
  onNewPurchaseBill?: () => void
  onNewParty?: () => void
  onToggleSidebar?: () => void
  onOpenCommandPalette?: () => void
  onCloseModal?: () => void
  onOpenCheatsheet?: () => void
}

// ──────────────────────────────────────────────
// Shortcuts configuration
// ──────────────────────────────────────────────

export const SHORTCUTS: ShortcutDef[] = [
  // Navigation
  { id: 'nav-dashboard', keys: 'Alt+1', label: 'Dashboard', labelNepali: 'ड्यासबोर्ड', category: 'navigation' },
  { id: 'nav-parties', keys: 'Alt+2', label: 'Parties', labelNepali: 'पक्षहरू', category: 'navigation' },
  { id: 'nav-invoices', keys: 'Alt+3', label: 'Invoices', labelNepali: 'इनभ्वाइस', category: 'navigation' },
  { id: 'nav-purchases', keys: 'Alt+4', label: 'Purchases', labelNepali: 'खरिद', category: 'navigation' },
  { id: 'nav-journal', keys: 'Alt+5', label: 'Journal', labelNepali: 'जर्नल प्रविष्टि', category: 'navigation', mode: 'advanced' },
  { id: 'nav-accounts', keys: 'Alt+6', label: 'Accounts', labelNepali: 'खाता योजना', category: 'navigation', mode: 'advanced' },
  { id: 'nav-reports', keys: 'Alt+7', label: 'Reports', labelNepali: 'रिपोर्ट', category: 'navigation' },
  { id: 'nav-inventory', keys: 'Alt+8', label: 'Inventory', labelNepali: 'इन्भेन्ट्री', category: 'navigation' },
  { id: 'nav-settings', keys: 'Alt+9', label: 'Settings', labelNepali: 'सेटिङ', category: 'navigation' },
  { id: 'nav-organization', keys: 'Alt+0', label: 'Organization', labelNepali: 'संस्था', category: 'navigation' },

  // Quick actions
  { id: 'quick-income', keys: 'F2', label: 'Add Income', labelNepali: 'आम्दानी थप्नुहोस्', category: 'quick-action', mode: 'simple' },
  { id: 'quick-journal', keys: 'F2', label: 'New Journal Entry', labelNepali: 'नयाँ जर्नल प्रविष्टि', category: 'quick-action', mode: 'advanced' },
  { id: 'quick-expense', keys: 'F4', label: 'Add Expense', labelNepali: 'खर्च थप्नुहोस्', category: 'quick-action', mode: 'simple' },
  { id: 'quick-invoice', keys: 'F6', label: 'New Invoice', labelNepali: 'नयाँ इनभ्वाइस', category: 'quick-action' },
  { id: 'quick-purchase', keys: 'F7', label: 'New Purchase Bill', labelNepali: 'नयाँ खरिद बिल', category: 'quick-action' },
  { id: 'quick-party', keys: 'F8', label: 'New Party', labelNepali: 'नयाँ पक्ष', category: 'quick-action' },
  { id: 'toggle-sidebar', keys: 'F9', label: 'Toggle Sidebar', labelNepali: 'साइडबार टगल', category: 'quick-action' },

  // General
  { id: 'command-palette', keys: 'Ctrl+K', label: 'Command Palette', labelNepali: 'कमाण्ड प्यालेट', category: 'general' },
  { id: 'close-modal', keys: 'Esc', label: 'Close Dialog', labelNepali: 'संवाद बन्द', category: 'general' },
  { id: 'open-cheatsheet', keys: 'Ctrl+/', label: 'Keyboard Shortcuts', labelNepali: 'किबोर्ड सर्टकट', category: 'general' },
]

// ──────────────────────────────────────────────
// Navigation path map
// ──────────────────────────────────────────────

const NAV_PATH_MAP: Record<string, string> = {
  'nav-dashboard': '/dashboard',
  'nav-parties': '/parties',
  'nav-invoices': '/invoices',
  'nav-purchases': '/purchases',
  'nav-journal': '/journal',
  'nav-accounts': '/accounts',
  'nav-reports': '/reports',
  'nav-inventory': '/inventory',
  'nav-settings': '/settings',
  'nav-organization': '/organization',
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  const router = useRouter()
  const mode = useAppStore((s) => s.mode)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const callbacksRef = useRef(callbacks)

  // Keep callbacks ref fresh without re-attaching listeners
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target
      const inEditable = isEditableElement(target)

      // ── Escape: always works, even in inputs ──
      if (e.key === 'Escape') {
        callbacksRef.current.onCloseModal?.()
        return
      }

      // All other shortcuts: skip when user is typing
      if (inEditable) return

      // ── Alt + Number → Navigation ──
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        const numberKeys: Record<string, string> = {
          '1': 'nav-dashboard',
          '2': 'nav-parties',
          '3': 'nav-invoices',
          '4': 'nav-purchases',
          '5': 'nav-journal',
          '6': 'nav-accounts',
          '7': 'nav-reports',
          '8': 'nav-inventory',
          '9': 'nav-settings',
          '0': 'nav-organization',
        }
        const shortcutId = numberKeys[e.key]
        if (shortcutId) {
          const def = SHORTCUTS.find((s) => s.id === shortcutId)
          if (def?.mode && def.mode !== mode) {
            e.preventDefault()
            toast({
              title: `${def.label} · ${def.labelNepali}`,
              description: `Only available in ${def.mode === 'advanced' ? 'Advanced' : 'Simple'} mode`,
            })
            return
          }
          const path = NAV_PATH_MAP[shortcutId]
          if (path) {
            e.preventDefault()
            router.push(path)
            toast({
              title: `${def?.label ?? 'Navigate'} · ${def?.labelNepali ?? ''}`,
              duration: 1500,
            })
          }
          return
        }
      }

      // ── F-keys → Quick actions ──
      if (e.key === 'F2') {
        e.preventDefault()
        if (mode === 'simple') {
          callbacksRef.current.onQuickIncome?.()
          toast({ title: 'Add Income · आम्दानी थप्नुहोस्', duration: 1500 })
        } else {
          callbacksRef.current.onQuickIncome?.()
          toast({ title: 'New Journal Entry · नयाँ जर्नल प्रविष्टि', duration: 1500 })
        }
        return
      }

      if (e.key === 'F4') {
        e.preventDefault()
        if (mode === 'simple') {
          callbacksRef.current.onQuickExpense?.()
          toast({ title: 'Add Expense · खर्च थप्नुहोस्', duration: 1500 })
        } else {
          toast({ title: 'Add Expense is only available in Simple mode', duration: 1500 })
        }
        return
      }

      if (e.key === 'F6') {
        e.preventDefault()
        callbacksRef.current.onNewInvoice?.()
        toast({ title: 'New Invoice · नयाँ इनभ्वाइस', duration: 1500 })
        return
      }

      if (e.key === 'F7') {
        e.preventDefault()
        callbacksRef.current.onNewPurchaseBill?.()
        toast({ title: 'New Purchase Bill · नयाँ खरिद बिल', duration: 1500 })
        return
      }

      if (e.key === 'F8') {
        e.preventDefault()
        callbacksRef.current.onNewParty?.()
        toast({ title: 'New Party · नयाँ पक्ष', duration: 1500 })
        return
      }

      if (e.key === 'F9') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
        toast({
          title: `Sidebar ${!sidebarOpen ? 'Opened' : 'Closed'} · साइडबार ${!sidebarOpen ? 'खोलियो' : 'बन्द'}`,
          duration: 1500,
        })
        return
      }

      // ── Ctrl+K → Command Palette ──
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        callbacksRef.current.onOpenCommandPalette?.()
        return
      }

      // ── Ctrl+/ → Cheatsheet ──
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        callbacksRef.current.onOpenCheatsheet?.()
        return
      }
    },
    [router, mode, setSidebarOpen, sidebarOpen],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { shortcuts: SHORTCUTS }
}
