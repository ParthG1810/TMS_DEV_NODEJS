# Gmail OAuth Setup Guide

This guide will help you configure Gmail OAuth for your TMS application to enable automated Interac e-Transfer payment tracking.

## Prerequisites

- Google account
- Access to Google Cloud Console
- MySQL database running with TMS schema

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"** or select an existing project
4. Give your project a name (e.g., "TMS Payment Tracker")
5. Click **"Create"**

### 1.2 Enable Gmail API

1. In the Google Cloud Console, go to **"APIs & Services"** > **"Library"**
2. Search for **"Gmail API"**
3. Click on it and click **"Enable"**
4. Wait for the API to be enabled

### 1.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Choose **User Type**:
   - **External**: For personal Google accounts
   - **Internal**: For Google Workspace organizations only
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: TMS Payment Tracker
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. **Add Scopes**:
   - Click **"Add or Remove Scopes"**
   - Search for **"Gmail API"**
   - Select: `https://www.googleapis.com/auth/gmail.readonly`
   - Click **"Update"** then **"Save and Continue"**
7. **Test Users** (for External apps in testing mode):
   - Click **"Add Users"**
   - Add the Gmail address you want to connect
   - Click **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

### 1.4 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Choose **Application type**: **Web application**
4. Give it a name: "TMS Web Client"
5. **Add Authorized JavaScript origins** (optional):
   - `http://localhost:47847`
   - `http://localhost:47849`
   - `http://localhost:47851`
   - Your production domain (when ready)
6. **Add Authorized redirect URIs** (add all for port fallback support):
   - Development:
     - `http://localhost:47847/api/gmail/callback`
     - `http://localhost:47849/api/gmail/callback`
     - `http://localhost:47851/api/gmail/callback`
   - Production: `https://your-domain.com/api/gmail/callback`
7. Click **"Create"**
8. **Save the credentials**:
   - Copy the **Client ID** (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
   - Copy the **Client Secret** (looks like: `GOCSPX-...`)
   - Click **"OK"**

## Step 2: Configure Your Application

### 2.1 Update .env File

Open `/home/user/TMS_DEV_NODEJS/Backend/.env` and update these variables:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:47847/api/gmail/callback

# Next.js Public API URL (used for OAuth redirects)
NEXT_PUBLIC_API_URL=http://localhost:47847
```

> **Note**: The Electron app uses uncommon ports (47847, 47849, 47851) with automatic fallback to avoid conflicts. Add all three redirect URIs to Google Cloud Console.

**Important**:
- Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID from Google Cloud Console
- Replace `YOUR_CLIENT_SECRET_HERE` with your actual Client Secret
- For production, update the redirect URI to match your production domain

### 2.2 Verify Database Migration

Make sure the Gmail OAuth database table exists:

```bash
cd /home/user/TMS_DEV_NODEJS/database
mysql -u root -p tms_database < migrations/013_gmail_oauth_settings.sql
```

## Step 3: Test the OAuth Flow

### 3.1 Start Your Application

```bash
cd /home/user/TMS_DEV_NODEJS/Backend
npm run dev
```

### 3.2 Initiate OAuth Connection

The Gmail OAuth flow is accessible through your payment settings page:

1. Navigate to: `http://localhost:47847/dashboard/payments/settings`
2. Look for the **"Gmail Connection"** section
3. Click **"Connect Gmail Account"**
4. You will be redirected to Google's consent screen
5. Sign in with your Google account
6. Review the permissions (read-only access to Gmail)
7. Click **"Allow"**
8. You'll be redirected back to your application

### 3.3 Verify Connection

After successful OAuth:
- You should see your connected email address in the settings
- The status should show "Connected"
- Last sync time will be displayed

## Step 4: Test Email Sync

### 4.1 Trigger Manual Sync

You can trigger a manual sync using the API:

```bash
curl http://localhost:47847/api/gmail/sync
```

Or click the **"Sync Now"** button in the UI.

### 4.2 Check Sync Status

```bash
curl http://localhost:47847/api/gmail/status
```

This will return:
- Connection status
- Connected email address
- Last sync timestamp
- Number of emails synced

## Troubleshooting

### Common Issues

#### 1. "Access blocked: This app's request is invalid"

**Cause**: Redirect URI mismatch

**Solution**:
- Verify the redirect URI in `.env` exactly matches the one in Google Cloud Console
- Make sure there are no trailing slashes
- Check for http vs https

#### 2. "Error 400: redirect_uri_mismatch"

**Cause**: The redirect URI doesn't match

**Solution**:
- Go to Google Cloud Console > Credentials
- Edit your OAuth 2.0 Client
- Ensure `http://localhost:47847/api/gmail/callback` is in the Authorized redirect URIs
- Save and try again

#### 3. "This app hasn't been verified"

**Cause**: App is in testing mode

**Solution**:
- This is normal for testing
- Click **"Advanced"** > **"Go to [App Name] (unsafe)"**
- Or publish your app if ready for production

#### 4. "Token expired and no refresh token available"

**Cause**: Initial OAuth didn't request offline access

**Solution**:
- Disconnect and reconnect the Gmail account
- The service requests `access_type: 'offline'` which should get a refresh token

#### 5. "Google OAuth credentials not configured"

**Cause**: Environment variables not loaded

**Solution**:
- Verify `.env` file is in the `Backend` directory
- Restart your development server
- Check for typos in variable names (should be `GOOGLE_CLIENT_ID`, not `GMAIL_CLIENT_ID`)

### Check Environment Variables

```bash
cd /home/user/TMS_DEV_NODEJS/Backend
node -e "require('dotenv').config(); console.log('Client ID:', process.env.GOOGLE_CLIENT_ID); console.log('Has Secret:', !!process.env.GOOGLE_CLIENT_SECRET);"
```

## Production Deployment

### Additional Steps for Production

1. **Update OAuth Consent Screen**:
   - Consider publishing your app (removes the "unverified app" warning)
   - Add privacy policy and terms of service URLs

2. **Update Redirect URIs**:
   - Add your production domain to authorized redirect URIs
   - Update `.env` with production values

3. **Environment Variables**:
   ```env
   GOOGLE_REDIRECT_URI=https://your-domain.com/api/gmail/callback
   NEXT_PUBLIC_API_URL=https://your-domain.com
   ```

4. **Security**:
   - Store credentials in a secure secrets manager
   - Never commit `.env` to version control
   - Use environment-specific `.env` files

## How It Works

1. **OAuth Flow**: User clicks "Connect Gmail" → Redirected to Google → Grants permission → Redirected back with auth code
2. **Token Exchange**: Backend exchanges auth code for access token and refresh token
3. **Token Storage**: Tokens are encrypted and stored in the `gmail_oauth_settings` table
4. **Email Sync**: Scheduled job fetches emails from `notify@payments.interac.ca`
5. **Parsing**: Emails are parsed to extract transaction details
6. **Matching**: Transactions are matched with pending payments in the system

## API Endpoints

- `GET /api/gmail/auth` - Get OAuth authorization URL
- `GET /api/gmail/callback` - OAuth callback handler
- `GET /api/gmail/status` - Get current connection status
- `POST /api/gmail/sync` - Trigger manual email sync
- `POST /api/gmail/disconnect` - Disconnect Gmail account

## Security Notes

- The application only requests **read-only** access to Gmail
- Only emails from `notify@payments.interac.ca` are processed
- Access tokens are encrypted in the database
- Refresh tokens allow token renewal without re-authentication
- Users can revoke access anytime from their Google Account settings

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs (`Backend/logs/`)
3. Verify all environment variables are set correctly
4. Ensure database migrations have run
5. Check Google Cloud Console for API quota limits

---

Last Updated: 2025-12-13
