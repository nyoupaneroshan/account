'use client'

import { SHORTCUTS, type ShortcutDef } from '@/hooks/use-keyboard-shortcuts'
import { useAppStore, type AppMode } from '@/store/app-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Keyboard, Compass, Zap, ToggleLeft, FileCheck, Database, Settings } from 'lucide-react'

// ──────────────────────────────────────────────
// Keyboard key renderer
// ──────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-xs text-zinc-400 font-mono inline-flex items-center justify-center min-w-[24px]">
      {children}
    </kbd>
  )
}

// ──────────────────────────────────────────────
// Parse combo like "Alt+1" or "Ctrl+K" into parts
// ──────────────────────────────────────────────

function renderKeys(keys: string) {
  const parts = keys.split('+')
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-zinc-600 text-[10px]">+</span>}
          <Kbd>{part}</Kbd>
        </span>
      ))}
    </span>
  )
}

// ──────────────────────────────────────────────
// Category config
// ──────────────────────────────────────────────

const CATEGORIES = [
  { key: 'navigation' as const, label: 'Navigation', labelNepali: 'नेभिगेसन', icon: Compass, color: 'text-sky-400' },
  { key: 'quick-action' as const, label: 'Quick Actions (F-keys)', labelNepali: 'छिटो कार्य (F-कुञ्जी)', icon: Zap, color: 'text-emerald-400' },
  { key: 'mode' as const, label: 'Mode', labelNepali: 'मोड', icon: ToggleLeft, color: 'text-amber-400' },
  { key: 'form' as const, label: 'Form Actions', labelNepali: 'फारम कार्य', icon: FileCheck, color: 'text-violet-400' },
  { key: 'data' as const, label: 'Data Operations', labelNepali: 'डाटा सञ्चालन', icon: Database, color: 'text-cyan-400' },
  { key: 'general' as const, label: 'General', labelNepali: 'सामान्य', icon: Settings, color: 'text-zinc-400' },
]

// ──────────────────────────────────────────────
// Shortcut row
// ──────────────────────────────────────────────

function ShortcutRow({ shortcut, mode }: { shortcut: ShortcutDef; mode: AppMode }) {
  const isDisabled = shortcut.mode !== undefined && shortcut.mode !== mode

  return (
    <div
      className={`flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg transition-colors ${
        isDisabled
          ? 'opacity-30 cursor-not-allowed'
          : 'hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-zinc-200 truncate">{shortcut.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 truncate">{shortcut.labelNepali}</span>
          {shortcut.description && (
            <span className="text-[10px] text-zinc-600 truncate hidden sm:inline">· {shortcut.description}</span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {renderKeys(shortcut.keys)}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

interface ShortcutCheatsheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutCheatsheet({ open, onOpenChange }: ShortcutCheatsheetProps) {
  const mode = useAppStore((s) => s.mode)
  const language = useAppStore((s) => s.language)

  // Show all shortcuts, mode-restricted ones are greyed out
  const visibleShortcuts = SHORTCUTS

  const isNepali = language === 'ne'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f1117] border-white/[0.08] text-zinc-100 sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with emerald accent */}
        <DialogHeader className="p-5 pb-4 border-b border-white/[0.06] bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Keyboard className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100">
                {isNepali ? 'किबोर्ड सर्टकट' : 'Keyboard Shortcuts'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                {isNepali
                  ? 'Tally-शैली सर्टकटहरू · F1 मद्दतको लागि'
                  : 'Tally-style shortcuts · Press F1 for help'}
              </DialogDescription>
            </div>
          </div>
          {/* Mode indicator */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              mode === 'simple'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30'
            }`}>
              Simple
            </span>
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              mode === 'advanced'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30'
            }`}>
              Advanced
            </span>
            <span className="text-[10px] text-zinc-600 ml-auto">
              {isNepali ? 'केही सर्टकटहरू मोड-विशिष्ट छन्' : 'Some shortcuts are mode-specific'}
            </span>
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-5">
            {CATEGORIES.map((cat) => {
              const categoryShortcuts = visibleShortcuts.filter((s) => s.category === cat.key)
              if (categoryShortcuts.length === 0) return null
              const CatIcon = cat.icon

              return (
                <div key={cat.key}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-2 px-3">
                    <CatIcon className={`h-3.5 w-3.5 ${cat.color}`} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {isNepali ? cat.labelNepali : cat.label}
                    </h3>
                    <span className="text-[10px] text-zinc-600">
                      {isNepali ? cat.label : cat.labelNepali}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>

                  {/* Shortcuts list */}
                  <div className="space-y-0.5">
                    {categoryShortcuts.map((shortcut) => (
                      <ShortcutRow
                        key={shortcut.id}
                        shortcut={shortcut}
                        mode={mode}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-600">
              {isNepali
                ? 'इनपुट फिल्डमा सर्टकटहरू काम गर्दैनन् (Esc बाहेक)'
                : 'Shortcuts don\'t fire in input fields (except Esc)'}
            </p>
            <div className="flex items-center gap-1.5">
              <Kbd>F1</Kbd>
              <span className="text-[10px] text-zinc-600 ml-1">
                {isNepali ? 'यो प्यानल' : 'this panel'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
