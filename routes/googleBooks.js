const express = require("express");
const router = express.Router();
const axios = require("axios");
const { isAuthorized } = require("./isAuthorized");
const { getValidGoogleToken } = require("../util/refreshGoogleToken");
const { GoogleGenAI } = require("@google/genai");
const { YouTubeSearchCache } = require("../models");
const { Op } = require("sequelize");
const {
  cleanupExpiredCache,
  getCacheStats,
  clearCacheByPattern,
} = require("../util/youtubeCacheManager");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Proxy Google Books API requests with user's OAuth token
router.get("/search/:userUuid", isAuthorized, async (req, res) => {
  try {
    const user = req.user;
    console.log("🚀 ~ user:", user);

    if (!user.googleId && !user.googleAccessToken && !user.googleRefreshToken) {
      return res.status(401).json({
        error: "Authentication failed",
        message: "Please authenticate with Google",
      });
    }

    // Build the query string from request query params
    const queryParams = new URLSearchParams(req.query).toString();

    // Make request to Google Books API with valid token
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?${queryParams}&orderBy=relevance`,
    );

    return res.json(response.data);
  } catch (error) {
    console.error(
      "Google Books API error:",
      error.response?.data || error.message,
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

    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes/${volumeId}`,
    );

    return res.json(response.data);
  } catch (error) {
    console.error(
      "Google Books API error:",
      error.response?.data || error.message,
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

    // Normalize the query for consistent caching
    const normalizedQuery = q.toLowerCase().trim();

    // Check cache first
    const cachedResult = await YouTubeSearchCache.findOne({
      where: {
        query: normalizedQuery,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (cachedResult) {
      console.log(`Cache hit for YouTube search: "${normalizedQuery}"`);
      return res.json({
        query: q,
        totalResults: cachedResult.totalResults,
        resultsPerPage: cachedResult.resultsPerPage,
        videos: cachedResult.results,
        cached: true,
      });
    }

    console.log(`Cache miss for YouTube search: "${normalizedQuery}"`);

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
      },
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

    // Cache the results for 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    try {
      await YouTubeSearchCache.upsert({
        query: normalizedQuery,
        results: videos,
        totalResults: response.data.pageInfo.totalResults,
        resultsPerPage: response.data.pageInfo.resultsPerPage,
        expiresAt: expiresAt,
      });
      console.log(`Cached YouTube search results for: "${normalizedQuery}"`);
    } catch (cacheError) {
      console.error(
        "Failed to cache YouTube search results:",
        cacheError.message,
      );
      // Don't fail the request if caching fails
    }

    return res.json({
      query: q,
      totalResults: response.data.pageInfo.totalResults,
      resultsPerPage: response.data.pageInfo.resultsPerPage,
      videos: videos,
      cached: false,
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

// Cache management routes
router.get("/youtube-cache/stats/:userUuid", isAuthorized, async (req, res) => {
  try {
    const stats = await getCacheStats();
    return res.json(stats);
  } catch (error) {
    console.error("Error getting cache stats:", error.message);
    return res.status(500).json({
      error: "Failed to get cache stats",
      message: error.message,
    });
  }
});

router.delete(
  "/youtube-cache/cleanup/:userUuid",
  isAuthorized,
  async (req, res) => {
    try {
      const deletedCount = await cleanupExpiredCache();
      return res.json({
        message: "Cache cleanup completed",
        deletedCount,
      });
    } catch (error) {
      console.error("Error cleaning up cache:", error.message);
      return res.status(500).json({
        error: "Failed to cleanup cache",
        message: error.message,
      });
    }
  },
);

router.delete(
  "/youtube-cache/clear/:userUuid",
  isAuthorized,
  async (req, res) => {
    try {
      const { pattern } = req.query;
      let deletedCount;

      if (pattern) {
        deletedCount = await clearCacheByPattern(pattern);
      } else {
        deletedCount = await YouTubeSearchCache.destroy({
          where: {},
          truncate: true,
        });
      }

      return res.json({
        message: pattern
          ? `Cache cleared for pattern: ${pattern}`
          : "All cache cleared",
        deletedCount,
      });
    } catch (error) {
      console.error("Error clearing cache:", error.message);
      return res.status(500).json({
        error: "Failed to clear cache",
        message: error.message,
      });
    }
  },
);

module.exports = router;
