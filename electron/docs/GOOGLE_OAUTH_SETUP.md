# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth credentials for Gmail integration in the TMS Desktop Application.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create a Google Cloud Project](#step-1-create-a-google-cloud-project)
4. [Step 2: Enable Gmail API](#step-2-enable-gmail-api)
5. [Step 3: Configure OAuth Consent Screen](#step-3-configure-oauth-consent-screen)
6. [Step 4: Create OAuth 2.0 Credentials](#step-4-create-oauth-20-credentials)
7. [Step 5: Configure Your Application](#step-5-configure-your-application)
8. [Step 6: Test the Integration](#step-6-test-the-integration)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Google OAuth 2.0 allows the TMS application to send emails on behalf of users through Gmail. This is used for features like:
- Sending invoices to customers
- Email notifications
- Password reset emails
- Order confirmations

**What you'll get:**
- `GOOGLE_CLIENT_ID` - Identifies your application to Google
- `GOOGLE_CLIENT_SECRET` - Secret key for your application (keep this private!)

---

## Prerequisites

Before starting, ensure you have:

- A Google account (Gmail)
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Your application's redirect URL ready (default: `http://localhost:3000/api/gmail/callback`)

---

## Step 1: Create a Google Cloud Project

### 1.1 Go to Google Cloud Console

Open your browser and navigate to:
```
https://console.cloud.google.com/
```

Sign in with your Google account if prompted.

### 1.2 Create a New Project

1. Click on the **project dropdown** at the top of the page (next to "Google Cloud")
2. In the popup, click **"New Project"** button (top right)
3. Fill in the project details:
   - **Project name:** `TMS Desktop` (or any name you prefer)
   - **Organization:** Leave as default or select your organization
   - **Location:** Leave as default
4. Click **"Create"**

### 1.3 Select Your Project

1. Wait for the project to be created (notification will appear)
2. Click **"Select Project"** in the notification, OR
3. Use the project dropdown and select **"TMS Desktop"**

---

## Step 2: Enable Gmail API

### 2.1 Navigate to API Library

1. In the left sidebar, click **"APIs & Services"**
2. Click **"Library"**

Or go directly to:
```
https://console.cloud.google.com/apis/library
```

### 2.2 Search for Gmail API

1. In the search bar, type **"Gmail API"**
2. Click on **"Gmail API"** from the results

### 2.3 Enable the API

1. Click the blue **"Enable"** button
2. Wait for the API to be enabled (you'll be redirected to the API dashboard)

---

## Step 3: Configure OAuth Consent Screen

Before creating credentials, you must configure the OAuth consent screen. This is what users see when they authorize your app.

### 3.1 Navigate to OAuth Consent Screen

1. In the left sidebar, click **"APIs & Services"**
2. Click **"OAuth consent screen"**

Or go directly to:
```
https://console.cloud.google.com/apis/credentials/consent
```

### 3.2 Select User Type

Choose the appropriate user type:

| User Type | Description | Use Case |
|-----------|-------------|----------|
| **Internal** | Only users within your Google Workspace organization | Company/Enterprise use |
| **External** | Any user with a Google account | Public applications |

For most cases, select **"External"** and click **"Create"**

### 3.3 Fill in App Information

**OAuth consent screen tab:**

| Field | Value | Required |
|-------|-------|----------|
| App name | `TMS Desktop` | Yes |
| User support email | Your email address | Yes |
| App logo | Optional - upload your logo | No |

**App domain (optional):**
- Leave blank for development

**Developer contact information:**
| Field | Value | Required |
|-------|-------|----------|
| Email addresses | Your email address | Yes |

Click **"Save and Continue"**

### 3.4 Configure Scopes

Scopes define what permissions your app requests.

1. Click **"Add or Remove Scopes"**
2. In the search/filter box, search for these scopes and select them:

| Scope | Description |
|-------|-------------|
| `https://www.googleapis.com/auth/gmail.send` | Send emails on behalf of user |
| `https://www.googleapis.com/auth/gmail.readonly` | Read email messages (optional) |
| `https://www.googleapis.com/auth/userinfo.email` | View user's email address |
| `https://www.googleapis.com/auth/userinfo.profile` | View user's basic profile |

3. Click **"Update"**
4. Click **"Save and Continue"**

### 3.5 Add Test Users (External Apps Only)

For external apps in testing mode, you must add test users:

1. Click **"Add Users"**
2. Enter email addresses of users who will test the app
3. Click **"Add"**
4. Click **"Save and Continue"**

### 3.6 Review and Complete

1. Review your settings
2. Click **"Back to Dashboard"**

---

## Step 4: Create OAuth 2.0 Credentials

Now create the actual credentials (Client ID and Secret).

### 4.1 Navigate to Credentials

1. In the left sidebar, click **"APIs & Services"**
2. Click **"Credentials"**

Or go directly to:
```
https://console.cloud.google.com/apis/credentials
```

### 4.2 Create OAuth Client ID

1. Click **"+ Create Credentials"** at the top
2. Select **"OAuth client ID"**

### 4.3 Configure OAuth Client

**Application type:**
Select **"Web application"**

**Name:**
Enter `TMS Desktop Client` (or any name you prefer)

**Authorized JavaScript origins:**
Click **"+ Add URI"** and add:
```
http://localhost:3000
```

For production, also add your production URL:
```
https://your-production-domain.com
```

**Authorized redirect URIs:**
Click **"+ Add URI"** and add:
```
http://localhost:3000/api/gmail/callback
```

For production, also add:
```
https://your-production-domain.com/api/gmail/callback
```

### 4.4 Create and Save Credentials

1. Click **"Create"**
2. A popup will show your credentials:
   - **Client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`

3. **IMPORTANT:** Click **"Download JSON"** to save a backup
4. Click **"OK"**

### 4.5 Copy Your Credentials

You can view your credentials anytime:

1. Go to **Credentials** page
2. Under **"OAuth 2.0 Client IDs"**, click on your client name
3. Copy the **Client ID** and **Client Secret**

---

## Step 5: Configure Your Application

### 5.1 Update the .env File

Open `Backend/.env` in a text editor and add your credentials:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Next.js Public URL (must match redirect URI domain)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5.2 Example with Real Values

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5.3 Security Best Practices

1. **Never commit credentials to Git**
   - Ensure `.env` is in your `.gitignore` file

2. **Use different credentials for production**
   - Create separate OAuth clients for development and production

3. **Restrict authorized domains**
   - Only add domains you actually use

4. **Rotate secrets periodically**
   - Delete and recreate credentials if compromised

---

## Step 6: Test the Integration

### 6.1 Start the Application

**Windows (PowerShell):**
```powershell
cd electron
npm run dev
```

**macOS | Linux:**
```bash
cd electron
npm run dev
```

### 6.2 Test OAuth Flow

1. Navigate to the Gmail settings in your application
2. Click "Connect Gmail" or similar button
3. You should be redirected to Google's login page
4. Sign in with a test user account
5. Grant the requested permissions
6. You should be redirected back to your application

### 6.3 Verify Connection

After successful authentication:
- The application should display "Gmail Connected" or similar status
- You should be able to send test emails

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** The redirect URI in your app doesn't match what's configured in Google Cloud Console.

**Solution:**
1. Go to Google Cloud Console > Credentials
2. Edit your OAuth client
3. Verify the redirect URI exactly matches your `.env` file
4. Ensure there are no trailing slashes or typos

### Error: "access_denied"

**Cause:** User denied permission or app is not verified.

**Solution:**
1. For testing, ensure the user is added as a test user
2. For production, submit app for verification

### Error: "invalid_client"

**Cause:** Client ID or Secret is incorrect.

**Solution:**
1. Double-check credentials in `.env` file
2. Ensure no extra spaces or newlines
3. Try creating new credentials

### Error: "unauthorized_client"

**Cause:** OAuth client not authorized for this grant type.

**Solution:**
1. Verify you created a "Web application" type client
2. Check that Gmail API is enabled

### Gmail API Not Enabled

**Symptoms:** API calls fail with "accessNotConfigured" error.

**Solution:**
1. Go to APIs & Services > Library
2. Search for "Gmail API"
3. Ensure it shows "Enabled"
4. If not, click "Enable"

### Test User Not Added

**Symptoms:** "This app is not verified" error for external apps.

**Solution:**
1. Go to OAuth consent screen
2. Add your email as a test user
3. Try again with that email account

---

## Quick Reference

### Required Environment Variables

| Variable | Example Value |
|----------|---------------|
| `GOOGLE_CLIENT_ID` | `123456789012-abc...xyz.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-AbCdEf...` |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/gmail/callback` |

### Useful Links

| Resource | URL |
|----------|-----|
| Google Cloud Console | https://console.cloud.google.com/ |
| API Library | https://console.cloud.google.com/apis/library |
| Credentials | https://console.cloud.google.com/apis/credentials |
| OAuth Consent Screen | https://console.cloud.google.com/apis/credentials/consent |
| Gmail API Documentation | https://developers.google.com/gmail/api |

---

## Need Help?

If you encounter issues not covered here:

1. Check the [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
2. Visit [Stack Overflow](https://stackoverflow.com/questions/tagged/google-oauth) with tag `google-oauth`
3. Open an issue at https://github.com/ParthG1810/TMS_DEV_NODEJS/issues
