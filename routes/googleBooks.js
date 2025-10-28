const express = require("express");
const router = express.Router();
const axios = require("axios");
const { isAuthorized } = require("./isAuthorized");

// Proxy Google Books API requests with user's OAuth token
router.get("/search/:userUuid", isAuthorized, async (req, res) => {
  try {
    const user = req.user;

    // Get user's Google access token
    const accessToken = user.googleAccessToken;

    // Build the query string from request query params
    const queryParams = new URLSearchParams(req.query).toString();

    // Make request to Google Books API
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?${queryParams}`,
      { headers }
    );

    return res.json(response.data);
  } catch (error) {
    console.error(
      "Google Books API error:",
      error.response?.data || error.message
    );

    // If token expired, return error so frontend can handle re-auth
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Token expired",
        message: "Please re-authenticate with Google",
      });
    }

    return res.status(error.response?.status || 500).json({
      error: "Failed to fetch books",
      message: error.response?.data?.error?.message || error.message,
    });
  }
});

// Get a specific book by ID
router.get("/volume/:userUuid/:volumeId", isAuthorized, async (req, res) => {
  try {
    const user = req.user;
    const { volumeId } = req.params;

    const accessToken = user.googleAccessToken;

    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes/${volumeId}`,
      { headers }
    );

    return res.json(response.data);
  } catch (error) {
    console.error(
      "Google Books API error:",
      error.response?.data || error.message
    );

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Token expired",
        message: "Please re-authenticate with Google",
      });
    }

    return res.status(error.response?.status || 500).json({
      error: "Failed to fetch book",
      message: error.response?.data?.error?.message || error.message,
    });
  }
});

module.exports = router;
