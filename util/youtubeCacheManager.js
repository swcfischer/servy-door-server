const { YouTubeSearchCache } = require("../models");
const { Op } = require("sequelize");

/**
 * Clean up expired YouTube search cache entries
 */
async function cleanupExpiredCache() {
  try {
    const deletedCount = await YouTubeSearchCache.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });

    if (deletedCount > 0) {
      console.log(
        `Cleaned up ${deletedCount} expired YouTube search cache entries`
      );
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up expired cache entries:", error.message);
    throw error;
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const total = await YouTubeSearchCache.count();
    const expired = await YouTubeSearchCache.count({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
    const active = total - expired;

    return {
      total,
      active,
      expired,
    };
  } catch (error) {
    console.error("Error getting cache stats:", error.message);
    throw error;
  }
}

/**
 * Clear all cache entries for a specific query pattern
 */
async function clearCacheByPattern(pattern) {
  try {
    const deletedCount = await YouTubeSearchCache.destroy({
      where: {
        query: {
          [Op.like]: `%${pattern}%`,
        },
      },
    });

    console.log(
      `Cleared ${deletedCount} cache entries matching pattern: ${pattern}`
    );
    return deletedCount;
  } catch (error) {
    console.error("Error clearing cache by pattern:", error.message);
    throw error;
  }
}

module.exports = {
  cleanupExpiredCache,
  getCacheStats,
  clearCacheByPattern,
};
