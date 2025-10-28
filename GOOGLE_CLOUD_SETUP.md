# Google Cloud Console Setup for OAuth + Books API

## Required Steps

### 1. Enable APIs
Go to **APIs & Services** > **Library** and enable:
- [x] Google+ API (for OAuth profile)
- [ ] **Google Books API** ← YOU NEED TO ENABLE THIS

### 2. Configure OAuth 2.0 Credentials

Go to **APIs & Services** > **Credentials** > Click on your OAuth 2.0 Client ID

#### Authorized redirect URIs
Add these URLs:
- `http://localhost:8888/auth/google/callback` (local development)
- `https://servy-door-server.onrender.com/redirect` (production)

#### OAuth consent screen scopes
Make sure these scopes are requested:
- `profile` (basic profile info)
- `email` (user email)
- `https://www.googleapis.com/auth/books` ← **IMPORTANT: Add this scope**

### 3. Update OAuth Consent Screen

Go to **APIs & Services** > **OAuth consent screen**

Add the Books API scope:
1. Click "ADD OR REMOVE SCOPES"
2. Search for "Google Books API"
3. Check the box for `https://www.googleapis.com/auth/books`
4. Click "UPDATE"

## What This Enables

✅ **Higher API Quotas**: Authenticated requests get much higher rate limits
✅ **Better Search Results**: Personalized based on user preferences
✅ **Access to User's Bookshelves**: Can read/write to user's Google Books library
✅ **No API Key Needed**: OAuth token handles authentication

## Current Implementation

- Access tokens are stored in database (`googleAccessToken` field)
- Refresh tokens stored for token renewal (`googleRefreshToken` field)
- All Google Books API requests proxy through server at `/google-books/*`
- Fallback to public API if user not authenticated or token expired

## Testing

1. After updating Google Cloud Console settings, users need to re-authenticate
2. Existing users: Log out and log back in with Google
3. New users: Just sign in with Google
4. Check browser console - should see no 401 errors from Books API
