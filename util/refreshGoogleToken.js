const axios = require("axios");
const models = require("../models");

/**
 * Refresh Google OAuth access token using refresh token
 * @param {Object} user - User object with Google tokens
 * @returns {Promise<string>} - New access token
 */
async function refreshGoogleToken(user) {
  if (!user.googleRefreshToken) {
    throw new Error("No refresh token available for user");
  }

  try {
    console.log(`Refreshing Google token for user: ${user.uuid}`);

    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: user.googleRefreshToken,
      grant_type: "refresh_token",
    });

    const { access_token, refresh_token } = response.data;

    // Update user with new tokens
    await user.update({
      googleAccessToken: access_token,
      // Only update refresh token if a new one is provided
      ...(refresh_token && { googleRefreshToken: refresh_token }),
    });

    console.log(`Successfully refreshed token for user: ${user.uuid}`);
    return access_token;
  } catch (error) {
    console.error(
      "Failed to refresh Google token:",
      error.response?.data || error.message
    );

    // If refresh token is invalid, clear the tokens
    if (error.response?.status === 400) {
      await user.update({
        googleAccessToken: null,
        googleRefreshToken: null,
      });
    }

    throw new Error("Failed to refresh Google access token");
  }
}

/**
 * Get valid Google access token, refreshing if necessary
 * @param {Object} user - User object with Google tokens
 * @returns {Promise<string|null>} - Valid access token or null if can't refresh
 */
async function getValidGoogleToken(user) {
  if (!user.googleAccessToken) {
    return null;
  }

  // First try with existing token
  try {
    // Test the token with a simple API call
    await axios.get("https://www.googleapis.com/oauth2/v1/tokeninfo", {
      params: { access_token: user.googleAccessToken },
    });

    // Token is valid
    return user.googleAccessToken;
  } catch (error) {
    // Token is invalid, try to refresh
    if (error.response?.status === 400 && user.googleRefreshToken) {
      try {
        return await refreshGoogleToken(user);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError.message);
        return null;
      }
    }
    return null;
  }
}

module.exports = {
  refreshGoogleToken,
  getValidGoogleToken,
};
