---
Task ID: 3-a
Agent: Subagent A
Task: Create Tally-like Keyboard Shortcuts System

Work Log:
- Read worklog.md to understand project context and previous work
- Read app-store.ts to understand AppState, AppMode, AppModule types and store shape
- Read sonner.tsx component to understand toast usage (import from 'sonner')
- Read dialog.tsx and sheet.tsx UI components for reference
- Read app-sidebar.tsx to understand navigation structure, MODULE_PATH_MAP, and route paths
- Read (app)/layout.tsx to understand app shell structure

- Created `/home/z/my-project/src/hooks/use-keyboard-shortcuts.ts`:
  - Exported ShortcutDef interface with id, keys, label, labelNepali, category, mode, description
  - Exported ShortcutCallbacks interface with all quick action callbacks
  - Exported SHORTCUTS config array with all shortcuts defined in requirements
  - Navigation shortcuts: Alt+1 through Alt+0 mapping to correct routes
  - Mode-restricted shortcuts: Alt+5 (Journal, advanced only), Alt+6 (Accounts, advanced only)
  - F-key quick actions: F2 (contextual income/journal), F4 (expense, simple only), F6-F9
  - Ctrl+K for command palette, Ctrl+/ for cheatsheet, Escape for closing modals
  - Custom hook useKeyboardShortcuts(callbacks) that:
    - Gets mode and sidebarOpen from Zustand store
    - Uses useCallback with proper deps for event handler
    - Uses useRef for callbacks to avoid re-attaching listeners
    - Prevents default for all F-keys and Alt+number combos
    - Skips firing in input/textarea/select elements (except Escape)
    - Shows toast notifications via sonner on every shortcut trigger
    - Returns shortcuts array for display in cheatsheet

- Created `/home/z/my-project/src/components/shared/shortcut-cheatsheet.tsx`:
  - Dialog-based component with dark theme matching emerald-on-dark design
  - Categories: Navigation, Quick Actions, General - each with English + Nepali labels
  - Kbd component rendering keyboard keys with the specified styling
  - renderKeys function that splits combo strings like "Alt+1" into individual styled keys
  - ShortcutRow showing label + Nepali label on left, keys on right
  - Mode-restricted shortcuts shown greyed out (opacity-30)
  - Mode indicator pills (Simple/Advanced) in header
  - ScrollArea for overflow handling
  - Footer hint about input field behavior
  - Bilingual support via language from app store

- Ran `bun run lint` - passed cleanly with no errors

Stage Summary:
- Both files created and lint-verified
- Hook is performant: uses useRef for callbacks, useCallback for event handler, single listener attachment
- Shortcuts config is exported for reuse in cheatsheet and other components
- Bilingual (English + Nepali) labels throughout
- Dark theme styling consistent with app's emerald-on-dark design
