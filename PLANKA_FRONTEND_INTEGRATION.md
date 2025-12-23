# Frontend Updates for Planka Integration

## Files Created/Modified

### 1. PlankaLoginForm Component
**File:** `client/src/components/Auth/PlankaLoginForm.tsx`
**Purpose:** Allows users to login with Planka credentials during initial registration

**Features:**
- Email or Username field
- Password field
- Form validation with react-hook-form
- Loading states with spinner
- Error handling and display
- On successful login: sets token, user data, and navigates to /c/new
- Conditional rendering based on Planka configuration

**Integration:** Added to `client/src/components/Auth/Login.tsx` between standard login and registration link

---

### 2. PlankaConnection Component
**File:** `client/src/components/Nav/SettingsTabs/Account/PlankaConnection.tsx`
**Purpose:** Account settings panel for existing users to link/unlink Planka accounts

**Features:**
- Shows connection status (connected/not connected)
- **When Connected:**
  - Displays Planka user info (name, email, username)
  - Unlink button with confirmation dialog
  - Error handling for unlink failures

- **When Not Connected:**
  - "Connect Planka Account" button
  - Expandable form with email/username and password fields
  - Connect and Cancel buttons
  - Form validation
  - Error display for failed connections

**Integration:** Added to `client/src/components/Nav/SettingsTabs/Account/Account.tsx` above Delete Account section

---

### 3. API Hooks
**File:** `client/src/data-provider/planka.ts`
**Purpose:** React Query hooks for all Planka API operations

**Available Hooks:**
```typescript
// Login with Planka (creates LibreChat account)
usePlankaLoginMutation()

// Link existing LibreChat account to Planka
useLinkPlankaAccountMutation()

// Unlink Planka account
useUnlinkPlankaAccountMutation()

// Get connection status
useGetPlankaStatusQuery()

// Get Planka configuration
useGetPlankaConfigQuery()
```

**TypeScript Interfaces:**
- `PlankaLoginPayload` - Login credentials
- `PlankaLoginResponse` - Login response with token and user
- `PlankaLinkResponse` - Link account response
- `PlankaStatusResponse` - Connection status with user data
- `PlankaConfigResponse` - Configuration (enabled, baseUrl)

---

## User Flows

### Flow 1: New User Login with Planka
1. User goes to login page
2. Sees "Planka Login" section (if enabled)
3. Enters Planka email/username and password
4. System:
   - Authenticates with Planka
   - Creates LibreChat account with same credentials
   - Stores Planka token securely
   - Logs user in automatically
   - Redirects to /c/new

### Flow 2: Existing User Linking Planka
1. User logs into LibreChat with standard credentials
2. Goes to Settings → Account
3. Sees "Planka Integration" section
4. Clicks "Connect Planka Account"
5. Enters Planka credentials
6. System:
   - Validates credentials with Planka
   - Links account and stores token
   - Shows connected status with user info

### Flow 3: Unlinking Planka
1. User in Settings → Account
2. Sees connected Planka account info
3. Clicks "Disconnect Planka Account"
4. Confirms in dialog
5. System removes token and connection

---

## API Endpoints Used

All endpoints are prefixed with `/api/planka`:

- `POST /login` - Login with Planka credentials (creates account)
- `POST /link` - Link existing account to Planka
- `POST /unlink` - Unlink Planka account
- `GET /status` - Get connection status
- `GET /config` - Get Planka configuration

---

## Environment Variables Required

```env
PLANKA_BASE_URL=http://localhost:3000
PLANKA_INTEGRATION_ENABLED=true
PLANKA_STORE_TOKENS=true
PLANKA_MCP_ENABLED=false
```

---

## Testing Checklist

### Backend Tests
- [ ] Backend server started successfully
- [ ] Planka routes registered at `/api/planka`
- [ ] Can reach `/api/planka/config` endpoint
- [ ] Authentication middleware working

### Frontend Tests
- [ ] Login page shows PlankaLoginForm (if enabled)
- [ ] Settings page shows PlankaConnection component
- [ ] Login form validates required fields
- [ ] Login with valid Planka credentials works
- [ ] Login creates LibreChat account automatically
- [ ] Link account form in settings works
- [ ] Unlink button removes connection
- [ ] Error messages display correctly
- [ ] Loading states show spinners

---

## Next Steps

1. **Start Frontend Dev Server:**
   ```bash
   npm run frontend:dev
   ```

2. **Test Planka Login:**
   - Open http://localhost:3090
   - Go to login page
   - Use Planka credentials to login
   - Verify account creation and auto-login

3. **Test Account Linking:**
   - Login with regular LibreChat account
   - Go to Settings → Account
   - Click "Connect Planka Account"
   - Enter Planka credentials
   - Verify connection shows user info

4. **Verify Backend Routes:**
   ```bash
   curl http://localhost:3080/api/planka/config
   ```
   Should return: `{"enabled":true,"baseUrl":"http://localhost:3000"}`

---

## Component Props & Usage

### PlankaLoginForm
```tsx
import { PlankaLoginForm } from '~/components/Auth';

// No props required - component is self-contained
<PlankaLoginForm />
```

### PlankaConnection
```tsx
import PlankaConnection from './PlankaConnection';

// No props required - uses hooks internally
<PlankaConnection />
```

---

## Styling Classes Used

All components use existing LibreChat Tailwind classes:
- `text-text-primary`, `text-text-secondary` - Text colors
- `border-border-medium`, `border-border-light` - Borders
- `bg-surface-secondary-alt`, `bg-surface-tertiary` - Backgrounds
- `rounded-md` - Border radius
- Responsive padding/margins with `p-`, `px-`, `py-`, `pb-` utilities

---

## Error Handling

Both components handle errors gracefully:

1. **Network Errors:** Caught and displayed with user-friendly messages
2. **Invalid Credentials:** Shows "Invalid Planka credentials" message
3. **Server Errors:** Shows generic error with details if available
4. **Loading States:** Spinner shown during API calls
5. **Validation Errors:** Inline form validation messages

---

## Security Features

1. **Encrypted Token Storage:** Tokens encrypted with CREDS_KEY/CREDS_IV
2. **Authentication Required:** Link/unlink endpoints require JWT
3. **Rate Limiting:** Login endpoint has rate limiting
4. **Password Never Stored:** Only sent to Planka API for verification
5. **HTTPS Recommended:** For production deployments

---

## Troubleshooting

### "Planka integration is not configured"
- Check `PLANKA_BASE_URL` in .env
- Ensure `PLANKA_INTEGRATION_ENABLED=true`
- Restart backend server

### Form not showing
- Verify `useGetPlankaConfigQuery()` returns `enabled: true`
- Check browser console for errors
- Ensure frontend dev server rebuilt with new components

### "Invalid Planka credentials"
- Verify Planka instance is accessible
- Test credentials directly in Planka
- Check network tab for API responses

### Connection status not updating
- React Query uses 5-minute cache
- Manually invalidate with `queryClient.invalidateQueries(['plankaStatus'])`
- Or wait for automatic refetch

---

## Future Enhancements

1. **MCP Integration:** Use stored tokens for Planka MCP server
2. **Auto-sync:** Sync LibreChat username/avatar with Planka
3. **Project Integration:** Show Planka projects in LibreChat UI
4. **SSO Support:** Add OAuth/OIDC for Planka if supported
5. **Multi-account:** Support multiple Planka instances
