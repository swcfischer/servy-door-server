const express = require("express");
const router = express.Router();
const axios = require("axios");
const { isAuthorized } = require("./isAuthorized");
const { getValidGoogleToken } = require("../util/refreshGoogleToken");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Proxy Google Books API requests with user's OAuth token
router.get("/search/:userUuid", isAuthorized, async (req, res) => {
  try {
    const user = req.user;

    // Get a valid Google access token (refresh if needed)
    const accessToken = await getValidGoogleToken(user);

    if (!accessToken) {
      return res.status(401).json({
        error: "Token unavailable",
        message: "Please re-authenticate with Google",
        requiresReauth: true,
      });
    }

    // Build the query string from request query params
    const queryParams = new URLSearchParams(req.query).toString();

    // Make request to Google Books API with valid token
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?${queryParams}&orderBy=relevance`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error(
      "Google Books API error:",
      error.response?.data || error.message
    );

    // If still getting 401 after token refresh, user needs to re-authenticate
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Authentication failed",
        message: "Please re-authenticate with Google",
        requiresReauth: true,
      });
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
      });
    }

    return res.status(error.response?.status || 500).json({
      error: "API request failed",
      message: error.response?.data?.error?.message || error.message,
    });
  }
});

// Get a specific book by ID
router.get("/volume/:userUuid/:volumeId", isAuthorized, async (req, res) => {
  try {
    const user = req.user;
    const { volumeId } = req.params;

    // Get a valid Google access token (refresh if needed)
    const accessToken = await getValidGoogleToken(user);

    if (!accessToken) {
      return res.status(401).json({
        error: "Token unavailable",
        message: "Please re-authenticate with Google",
        requiresReauth: true,
      });
    }

    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes/${volumeId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const description = response.data.volumeInfo.description;

    // Get a summary from Google's Gemini API
    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Please provide in a concise paragraph summary of this book description (do not include title and author): ${description}`,
    });

    const summary = geminiResponse.text;
    response.data.volumeInfo.aiSummary = summary;

    return res.json(response.data);
  } catch (error) {
    console.error(
      "Google Books API error:",
      error.response?.data || error.message
    );

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Authentication failed",
        message: "Please re-authenticate with Google",
        requiresReauth: true,
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Book not found",
        message: "The requested book was not found in Google Books",
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
      });
    }

    return res.status(error.response?.status || 500).json({
      error: "API request failed",
      message: error.response?.data?.error?.message || error.message,
    });
  }
});

// Search YouTube videos related to a book or topic
router.get("/youtube-search/:userUuid", isAuthorized, async (req, res) => {
  try {
    const { q, maxResults = 5 } = req.query;

    if (!q) {
      return res.status(400).json({
        error: "Missing query parameter",
        message: "Please provide a search query 'q' parameter",
      });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "YouTube API not configured",
        message: "YouTube API key is not available",
      });
    }

    // Search for videos using YouTube Data API v3
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: q,
          type: "video",
          maxResults: Math.min(parseInt(maxResults), 25), // YouTube API limit is 50, we'll cap at 25
          order: "relevance",
          key: apiKey,
        },
      }
    );

    // Transform the response to return only title and channel (author)
    const videos = response.data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return res.json({
      query: q,
      totalResults: response.data.pageInfo.totalResults,
      resultsPerPage: response.data.pageInfo.resultsPerPage,
      videos: videos,
    });
  } catch (error) {
    console.error("YouTube API error:", error.response?.data || error.message);

    // Handle rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests to YouTube API. Please try again later.",
      });
    }

    // Handle quota exceeded
    if (error.response?.status === 403) {
      return res.status(403).json({
        error: "YouTube API quota exceeded",
        message: "Daily quota for YouTube API has been exceeded.",
      });
    }

    return res.status(error.response?.status || 500).json({
      error: "YouTube search failed",
      message: error.response?.data?.error?.message || error.message,
    });
  }
});

module.exports = router;
