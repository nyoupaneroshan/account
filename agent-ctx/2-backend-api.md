# Task 2: Backend API Routes - Work Record

## Agent: Backend API Developer
## Task ID: 2

## Summary
Created and updated backend API routes for Hisab Pro Nepal accounting software, implementing cookie-based session authentication, settings management, organization management, and admin RBAC.

## Files Created

### 1. `/src/lib/auth.ts` - Cookie-based Session Helper
- `setSessionCookie(userId)` - Returns cookie config object with httpOnly, secure, sameSite=lax, maxAge=30 days, path=/
- `getSessionUserId()` - Reads `hisab-session` cookie using Next.js `cookies()` API, returns userId or null
- `clearSessionCookieOptions()` - Returns cookie config with maxAge=0 to clear the cookie

### 2. `/src/app/api/settings/route.ts` - Settings API
- **GET** - Accepts `orgId` query param, requires authentication via cookie. Verifies user belongs to org. Returns org data + invoice settings from OrganizationSetting records (invoicePrefix, invoiceNextNumber, invoiceDefaultTerms)
- **PUT** - Accepts org data in body, requires authentication + admin/accountant role. Updates Organization record with spread pattern. Upserts invoice settings as OrganizationSetting records using `organizationId_key` compound unique key.

### 3. `/src/app/api/organizations/route.ts` - Organizations API
- **GET** - Requires cookie auth. Returns all organizations the user belongs to with counts and subscription data.
- **POST** - Requires cookie auth. Accepts `{ name, userId }`. Enforces plan limits (free=1, pro=5, enterprise=999). Seeds full Nepal COA (AccountGroups + Accounts), default tax rates, warehouse, fiscal year, and subscription.

### 4. `/src/app/api/admin/rbac/route.ts` - Admin RBAC API
- **GET** - Requires super_admin. Returns all UserOrganization records with user details for a given org.
- **POST** - Adds user to org. Requires super_admin. Validates email exists, checks not already member, creates UserOrganization + audit log.
- **PUT** - Updates user role. Requires super_admin. Validates role (admin/accountant/staff/viewer), updates record + audit log.
- **DELETE** - Removes user from org. Requires super_admin. Prevents removing last admin. Creates audit log.

## Files Updated

### 5. `/src/app/api/auth/login/route.ts`
- After successful login, creates `NextResponse.json()` first, then sets `hisab-session` cookie on it using `response.cookies.set()`
- Cookie: httpOnly, secure in production, sameSite=lax, maxAge=30 days, path=/

### 6. `/src/app/api/auth/logout/route.ts`
- Creates response, then sets cookie with maxAge=0 to clear it

### 7. `/src/app/api/auth/session/route.ts`
- Changed from reading `userId` query param to reading from `hisab-session` cookie
- Returns 401 if no cookie set
- Same response format as before but sourced from cookie

## Testing Results
- All 7 endpoints tested and working:
  - `POST /api/auth/login` - Sets cookie correctly ✓
  - `POST /api/auth/logout` - Clears cookie correctly ✓
  - `GET /api/auth/session` - Reads from cookie ✓
  - `GET /api/settings` - Returns org data + invoice settings ✓
  - `PUT /api/settings` - Updates org + upserts settings ✓
  - `GET /api/organizations` - Returns user's orgs ✓
  - `POST /api/organizations` - Enforces plan limits ✓
  - `GET /api/admin/rbac` - Returns org members ✓
- ESLint passes with 0 errors
- Dev server running cleanly
