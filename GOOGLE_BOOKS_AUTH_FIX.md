# Google Books API Authentication Troubleshooting Guide

## Quick Fix Summary

The 401 authentication error you're experiencing can be caused by several issues. Here's what I've implemented to fix it:

### ✅ What I Fixed

1. **Added Automatic Token Refresh**: Created `/server/util/refreshGoogleToken.js` that automatically refreshes expired Google OAuth tokens
2. **Improved Error Handling**: Enhanced the Google Books API routes to better handle different error scenarios
3. **Added Token Validation**: Created a new endpoint `/auth/validate-google-token` to proactively check token status
4. **Enhanced Frontend Error Handling**: Updated the client-side API utilities to better handle authentication errors

### 🔍 Root Cause Analysis

The 401 error occurs because:
- Google OAuth access tokens expire after 1 hour
- Your app wasn't automatically refreshing expired tokens
- The Google Books API requires valid authentication credentials

### 🚀 Immediate Actions Required

#### 1. Verify Google Cloud Console Setup

Make sure you have completed these steps in your Google Cloud Console:

**Enable Google Books API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Search for "Google Books API"
4. Click "ENABLE" if not already enabled

**Configure OAuth Consent Screen:**
1. Go to **APIs & Services** > **OAuth consent screen**
2. Click "ADD OR REMOVE SCOPES"
3. Add the scope: `https://www.googleapis.com/auth/books`
4. Save the configuration

**Verify OAuth 2.0 Credentials:**
1. Go to **APIs & Services** > **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Ensure these redirect URIs are added:
   - `http://localhost:8888/auth/google/callback` (development)
   - `https://servy-door-server.onrender.com/auth/redirect` (production)

#### 2. Test the Fix

1. **Restart your server** to load the new token refresh functionality
2. **Clear existing user sessions**: Users with expired tokens need to log out and log back in
3. **Test the authentication flow**: 
   - Log out completely
   - Sign in with Google again
   - Try searching for books
   - Check browser console for any 401 errors

#### 3. Monitor Token Status

You can now check token status using the new validation endpoint:

```javascript
// Frontend code to validate Google auth
import { validateGoogleAuth } from '../utils/googleBooksApi';

const checkGoogleAuth = async () => {
  const result = await validateGoogleAuth();
  if (!result.valid) {
    console.log('User needs to re-authenticate with Google');
    // Redirect to Google OAuth
    window.location.href = '/auth/google';
  }
};
```

### 🛠️ How the Fix Works

#### Token Refresh Flow

1. **Request Made**: User tries to access Google Books API
2. **Token Check**: System validates the current access token
3. **Auto Refresh**: If token is expired, system uses refresh token to get new access token
4. **Retry Request**: API call is retried with the new token
5. **Fallback**: If refresh fails, user is prompted to re-authenticate

#### Error Handling Improvements

- **401 Errors**: Now properly detected and handled with automatic token refresh
- **Rate Limiting**: 429 errors are properly communicated to the user
- **Network Issues**: Better error messages for different failure scenarios
- **Token Validation**: Proactive checking prevents failed API calls

### 🔧 Environment Variables

Ensure you have these environment variables set:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 📊 Testing Checklist

- [ ] Google Books API is enabled in Google Cloud Console
- [ ] OAuth consent screen includes Books API scope
- [ ] Server has been restarted with new code
- [ ] Users have logged out and back in
- [ ] Book search works without 401 errors
- [ ] Token refresh happens automatically when tokens expire

### 🚨 If Issues Persist

1. **Check Server Logs**: Look for token refresh attempts and Google API responses
2. **Verify Scopes**: Ensure the Google OAuth flow requests the Books API scope
3. **Test Public API**: Confirm the fallback to public API works for non-authenticated users
4. **Check Token Storage**: Verify that `googleAccessToken` and `googleRefreshToken` are being saved to the database

### 📞 Additional Support

If you continue to experience issues:
1. Check the server logs for specific error messages
2. Verify that users are properly authenticated with Google
3. Test with a fresh Google account to isolate user-specific issues
4. Monitor the network tab in browser dev tools for API request/response details

The implemented solution should resolve the 401 authentication errors and provide a much more robust Google Books API integration.