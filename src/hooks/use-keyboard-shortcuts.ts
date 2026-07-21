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
  category: 'navigation' | 'quick-action' | 'mode' | 'form' | 'data' | 'general'
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
  onToggleMode?: () => void
  onOrgSwitcher?: () => void
  onReports?: () => void
  onAcceptForm?: () => void
  onCancelForm?: () => void
  onCreateNew?: () => void
  onSaveRecord?: () => void
  onPrint?: () => void
  onExport?: () => void
  onDeleteRecord?: () => void
  onLogout?: () => void
}

// ──────────────────────────────────────────────
// Shortcuts configuration
// ──────────────────────────────────────────────

export const SHORTCUTS: ShortcutDef[] = [
  // ── Navigation ──
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

  // ── Quick Actions (Tally F-key shortcuts) ──
  { id: 'quick-help', keys: 'F1', label: 'Help / Shortcuts', labelNepali: 'मद्दत / सर्टकट', category: 'quick-action', description: 'Open keyboard shortcuts cheatsheet' },
  { id: 'quick-income', keys: 'F2', label: 'Add Income', labelNepali: 'आम्दानी थप्नुहोस्', category: 'quick-action', mode: 'simple' },
  { id: 'quick-journal', keys: 'F2', label: 'New Journal Entry', labelNepali: 'नयाँ जर्नल प्रविष्टि', category: 'quick-action', mode: 'advanced' },
  { id: 'quick-org-switch', keys: 'F3', label: 'Switch Organization', labelNepali: 'संस्था स्विच', category: 'quick-action', description: 'Open organization switcher dialog' },
  { id: 'quick-expense', keys: 'F4', label: 'Add Expense', labelNepali: 'खर्च थप्नुहोस्', category: 'quick-action', mode: 'simple' },
  { id: 'quick-contra', keys: 'F4', label: 'Contra Entry', labelNepali: 'कन्ट्रा प्रविष्टि', category: 'quick-action', mode: 'advanced', description: 'Bank-to-bank transfer entry' },
  { id: 'quick-invoice', keys: 'F6', label: 'New Invoice', labelNepali: 'नयाँ इनभ्वाइस', category: 'quick-action' },
  { id: 'quick-purchase', keys: 'F7', label: 'New Purchase Bill', labelNepali: 'नयाँ खरिद बिल', category: 'quick-action' },
  { id: 'quick-party', keys: 'F8', label: 'New Party', labelNepali: 'नयाँ पक्ष', category: 'quick-action' },
  { id: 'toggle-sidebar', keys: 'F9', label: 'Toggle Sidebar', labelNepali: 'साइडबार टगल', category: 'quick-action' },
  { id: 'quick-reports', keys: 'F10', label: 'Reports / Day Book', labelNepali: 'रिपोर्ट / दैनिक बही', category: 'quick-action' },

  // ── Mode ──
  { id: 'toggle-mode', keys: 'F5', label: 'Toggle Simple/Advanced', labelNepali: 'सरल/उन्नत मोड', category: 'mode', description: 'Switch between Simple and Advanced mode' },

  // ── Form Actions ──
  { id: 'form-accept', keys: 'F11', label: 'Accept / Save Form', labelNepali: 'स्वीकार / फारम बचत', category: 'form', description: 'Submit or save the current form' },
  { id: 'form-cancel', keys: 'F12', label: 'Cancel / Close Form', labelNepali: 'रद्द / फारम बन्द', category: 'form', description: 'Cancel or close the current form' },

  // ── Data Operations ──
  { id: 'data-new', keys: 'Ctrl+N', label: 'Create New Record', labelNepali: 'नयाँ रेकर्ड', category: 'data', description: 'Create a new record (contextual)' },
  { id: 'data-save', keys: 'Ctrl+S', label: 'Save Current Record', labelNepali: 'रेकर्ड बचत', category: 'data', description: 'Save the current record' },
  { id: 'data-print', keys: 'Ctrl+P', label: 'Print Current View', labelNepali: 'प्रिन्ट', category: 'data', description: 'Print the current view or report' },
  { id: 'data-export', keys: 'Ctrl+E', label: 'Export Data', labelNepali: 'डाटा निर्यात', category: 'data', description: 'Export current data' },
  { id: 'data-delete', keys: 'Ctrl+D', label: 'Delete Selected Record', labelNepali: 'चयनित रेकर्ड मेटाउनुहोस्', category: 'data', description: 'Delete the selected record' },

  // ── General ──
  { id: 'command-palette', keys: 'Ctrl+K', label: 'Command Palette', labelNepali: 'कमाण्ड प्यालेट', category: 'general' },
  { id: 'close-modal', keys: 'Esc', label: 'Close Dialog', labelNepali: 'संवाद बन्द', category: 'general' },
  { id: 'open-cheatsheet', keys: 'Ctrl+/', label: 'Keyboard Shortcuts', labelNepali: 'किबोर्ड सर्टकट', category: 'general' },
  { id: 'logout', keys: 'Alt+F4', label: 'Logout', labelNepali: 'लगआउट', category: 'general', description: 'Sign out of the application' },
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

        // ── Alt+F4 → Logout ──
        if (e.key === 'F4') {
          e.preventDefault()
          callbacksRef.current.onLogout?.()
          toast({ title: 'Logging out… · लगआउट हुँदैछ…', duration: 1500 })
          return
        }
      }

      // ── F-keys → Quick actions / Mode / Form ──
      if (!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        // F1 → Help / Cheatsheet
        if (e.key === 'F1') {
          e.preventDefault()
          callbacksRef.current.onOpenCheatsheet?.()
          toast({ title: 'Keyboard Shortcuts · किबोर्ड सर्टकट', duration: 1500 })
          return
        }

        // F2 → Income (Simple) / Journal (Advanced)
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

        // F3 → Org switcher
        if (e.key === 'F3') {
          e.preventDefault()
          callbacksRef.current.onOrgSwitcher?.()
          toast({ title: 'Switch Organization · संस्था स्विच', duration: 1500 })
          return
        }

        // F4 → Expense (Simple) / Contra (Advanced)
        if (e.key === 'F4') {
          e.preventDefault()
          if (mode === 'simple') {
            callbacksRef.current.onQuickExpense?.()
            toast({ title: 'Add Expense · खर्च थप्नुहोस्', duration: 1500 })
          } else {
            callbacksRef.current.onQuickExpense?.()
            toast({ title: 'Contra Entry · कन्ट्रा प्रविष्टि', duration: 1500 })
          }
          return
        }

        // F5 → Toggle Mode
        if (e.key === 'F5') {
          e.preventDefault()
          callbacksRef.current.onToggleMode?.()
          const newMode = mode === 'simple' ? 'Advanced' : 'Simple'
          toast({
            title: `Switched to ${newMode} mode`,
            description: mode === 'simple' ? 'उन्नत मोडमा स्विच गरियो' : 'सरल मोडमा स्विच गरियो',
            duration: 1500,
          })
          return
        }

        // F6 → New Invoice
        if (e.key === 'F6') {
          e.preventDefault()
          callbacksRef.current.onNewInvoice?.()
          toast({ title: 'New Invoice · नयाँ इनभ्वाइस', duration: 1500 })
          return
        }

        // F7 → New Purchase
        if (e.key === 'F7') {
          e.preventDefault()
          callbacksRef.current.onNewPurchaseBill?.()
          toast({ title: 'New Purchase Bill · नयाँ खरिद बिल', duration: 1500 })
          return
        }

        // F8 → New Party
        if (e.key === 'F8') {
          e.preventDefault()
          callbacksRef.current.onNewParty?.()
          toast({ title: 'New Party · नयाँ पक्ष', duration: 1500 })
          return
        }

        // F9 → Toggle Sidebar
        if (e.key === 'F9') {
          e.preventDefault()
          setSidebarOpen(!sidebarOpen)
          toast({
            title: `Sidebar ${!sidebarOpen ? 'Opened' : 'Closed'} · साइडबार ${!sidebarOpen ? 'खोलियो' : 'बन्द'}`,
            duration: 1500,
          })
          return
        }

        // F10 → Reports / Day Book
        if (e.key === 'F10') {
          e.preventDefault()
          callbacksRef.current.onReports?.()
          toast({ title: 'Reports / Day Book · रिपोर्ट / दैनिक बही', duration: 1500 })
          return
        }

        // F11 → Accept/Save form
        if (e.key === 'F11') {
          e.preventDefault()
          callbacksRef.current.onAcceptForm?.()
          toast({ title: 'Saving form… · फारम बचत गर्दै…', duration: 1500 })
          return
        }

        // F12 → Cancel/Close form
        if (e.key === 'F12') {
          e.preventDefault()
          callbacksRef.current.onCancelForm?.()
          toast({ title: 'Form cancelled · फारम रद्द गरियो', duration: 1500 })
          return
        }
      }

      // ── Ctrl/Cmd combos ──
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+K → Command Palette
        if (e.key === 'k') {
          e.preventDefault()
          callbacksRef.current.onOpenCommandPalette?.()
          return
        }

        // Ctrl+/ → Cheatsheet
        if (e.key === '/') {
          e.preventDefault()
          callbacksRef.current.onOpenCheatsheet?.()
          return
        }

        // Ctrl+N → Create new record
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault()
          callbacksRef.current.onCreateNew?.()
          toast({ title: 'New record · नयाँ रेकर्ड', duration: 1500 })
          return
        }

        // Ctrl+S → Save current record (prevent browser save)
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault()
          callbacksRef.current.onSaveRecord?.()
          toast({ title: 'Saving… · बचत गर्दै…', duration: 1500 })
          return
        }

        // Ctrl+P → Print current view
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault()
          callbacksRef.current.onPrint?.()
          toast({ title: 'Preparing print… · प्रिन्ट तयारी…', duration: 1500 })
          return
        }

        // Ctrl+E → Export data
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault()
          callbacksRef.current.onExport?.()
          toast({ title: 'Exporting data… · डाटा निर्यात…', duration: 1500 })
          return
        }

        // Ctrl+D → Delete selected record
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault()
          callbacksRef.current.onDeleteRecord?.()
          toast({ title: 'Delete record · रेकर्ड मेटाउनुहोस्', duration: 1500 })
          return
        }
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
