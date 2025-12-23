# Planka Integration for LibreChat (Rastar Chat)

This integration allows users to login to Rastar Chat using their Planka credentials. When a user logs in with Planka:

1. Their Planka account is authenticated
2. A corresponding LibreChat account is automatically created (if it doesn't exist)
3. The Planka access token is securely stored for MCP integration
4. User is logged into Rastar Chat

## Setup

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# Your Planka instance URL
PLANKA_BASE_URL=https://your-planka-instance.com

# Enable Planka integration
PLANKA_INTEGRATION_ENABLED=true

# Store Planka tokens for MCP integration
PLANKA_STORE_TOKENS=true

# Enable Planka MCP Server (optional, for later)
PLANKA_MCP_ENABLED=false
```

### 2. Restart the Backend

```bash
npm run backend:dev
```

## API Endpoints

### Login with Planka
**POST** `/api/planka/login`

Creates a LibreChat account and logs in using Planka credentials.

```json
{
  "emailOrUsername": "user@example.com",
  "password": "your-planka-password"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "plankaConnected": true
  }
}
```

### Link Planka Account (for existing users)
**POST** `/api/planka/link`

Headers: `Authorization: Bearer <jwt-token>`

```json
{
  "emailOrUsername": "user@example.com",
  "password": "your-planka-password"
}
```

### Unlink Planka Account
**POST** `/api/planka/unlink`

Headers: `Authorization: Bearer <jwt-token>`

### Check Planka Connection Status
**GET** `/api/planka/status`

Headers: `Authorization: Bearer <jwt-token>`

**Response:**
```json
{
  "connected": true,
  "userData": {
    "email": "user@example.com",
    "name": "User Name",
    "username": "username"
  }
}
```

### Get Planka Configuration
**GET** `/api/planka/config`

Returns whether Planka integration is enabled and the base URL.

## Frontend Integration

### Login Form Example

```javascript
// Login with Planka
async function loginWithPlanka(emailOrUsername, password) {
  const response = await fetch('/api/planka/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emailOrUsername,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  // Store JWT token
  localStorage.setItem('token', data.token);
  return data.user;
}
```

### Link Planka to Existing Account

```javascript
async function linkPlankaAccount(emailOrUsername, password, jwtToken) {
  const response = await fetch('/api/planka/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({
      emailOrUsername,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

## Security Features

- **Encrypted Token Storage**: Planka access tokens are encrypted using the CREDS_KEY and CREDS_IV from your environment
- **Rate Limiting**: Login attempts are rate-limited to prevent brute force attacks
- **Ban System**: Integrated with LibreChat's ban system
- **Secure Password Handling**: Passwords are only transmitted to Planka, not stored in LibreChat

## How It Works

1. **User submits Planka credentials** to `/api/planka/login`
2. **Backend authenticates with Planka API** using provided credentials
3. **Planka returns access token and user data** if authentication succeeds
4. **Backend checks if LibreChat user exists** with the same email
5. **If user doesn't exist, creates new user** with same credentials
6. **Stores Planka access token** encrypted in database (Key model)
7. **Creates LibreChat session** and returns JWT token
8. **User is logged in** to Rastar Chat with Planka account linked

## Database Storage

Planka tokens are stored in the `keys` collection:

```javascript
{
  userId: ObjectId("..."),
  name: "planka_token",
  value: "encrypted-token-data",
  updatedAt: ISODate("...")
}
```

The encrypted value contains:
```json
{
  "accessToken": "planka-access-token",
  "userData": {
    "email": "user@example.com",
    "name": "User Name",
    "username": "username"
  },
  "connectedAt": "2025-12-22T12:00:00.000Z"
}
```

## MCP Integration (Coming Soon)

Once `PLANKA_MCP_ENABLED=true` is set, an MCP server will be available that can:

- Fetch user's Planka boards
- Read and create cards
- Manage lists and tasks
- Use the stored access token automatically

## Troubleshooting

### "Planka integration is not configured"
- Check that `PLANKA_BASE_URL` is set in `.env`
- Check that `PLANKA_INTEGRATION_ENABLED=true`
- Restart the backend

### "Invalid Planka credentials"
- Verify the credentials work on your Planka instance directly
- Check that `PLANKA_BASE_URL` is correct (no trailing slash)
- Check Planka server logs for authentication errors

### "Failed to create user account"
- Check MongoDB connection
- Check server logs for detailed error messages
- Verify database permissions

## Files Created

- `api/lib/utils/plankaClient.js` - Planka API client
- `api/server/services/PlankaService.js` - Token storage service  
- `api/server/controllers/PlankaController.js` - Route controllers
- `api/strategies/plankaStrategy.js` - Passport strategy
- `api/server/routes/planka.js` - API routes
