# Task 5 - Code Scan & Fix Agent Work Record

## Summary
Comprehensive code scan of all source files in the Hisab Pro project to find and fix issues.

## Bugs Fixed (4)

### 1. Language Switching Persistence - app-header.tsx
- **Bug**: Ineffective try-catch pattern on non-awaited Promise. The `try { authFetch(...) } catch {}` pattern would never catch async errors since `authFetch()` returns a non-awaited Promise.
- **Fix**: Replaced with proper `.catch()` on the Promise returned by `authFetch()`
- **File**: `src/components/layout/app-header.tsx`

### 2. Language Switching Persistence - layout.tsx keyboard shortcut
- **Bug**: The `switch-language` command palette action only updated Zustand store but didn't persist to database. Language preference was lost on next login.
- **Fix**: Added `authFetch('/api/user/language', ...)` call with `.catch()` to persist language preference. Also added missing `authFetch` import.
- **File**: `src/app/(app)/layout.tsx`

### 3. Register API Language Parameter Not Accepted
- **Bug**: `/api/auth/register/route.ts` destructured `{ email, password, name, businessName }` but ignored `language` from request body. Frontend sends `language: regLanguage` but backend hardcoded `language: 'en'`.
- **Fix**: Added `language` to destructuring and used `language || 'en'` when creating user
- **File**: `src/app/api/auth/register/route.ts`

### 4. Auth Screen Missing Session Token Save
- **Bug**: `auth-screen.tsx` didn't call `saveClientSession(data.token)` after successful login/register, causing dashboard session restore to fail
- **Fix**: Added import and calls in both handleLogin and handleRegister
- **File**: `src/components/auth/auth-screen.tsx`

## Areas Verified as Correct (6)

1. **Missing cn() imports**: All files that use `cn()` already import it from `@/lib/utils`
2. **Dialog/AlertDialog accessibility**: All usages have DialogTitle/AlertDialogTitle (command palette uses sr-only, which is correct)
3. **Settings save**: `handleSaveOrg` correctly calls PUT /api/settings with `id: currentOrgId` and matching data format
4. **Add Organization button**: org-switcher.tsx properly handles plan limits, API calls, and error messages
5. **Pro role visibility**: Session API returns org's plan correctly; admin subscription endpoint updates both org and subscription
6. **Page routes**: All page.tsx files properly import and render their components

## Lint
- ESLint passes cleanly after all fixes
