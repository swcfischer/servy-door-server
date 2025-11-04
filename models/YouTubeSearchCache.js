module.exports = (sequelize, DataTypes) => {
  const YouTubeSearchCache = sequelize.define(
    "YouTubeSearchCache",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      query: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      results: {
        type: DataTypes.JSONB, // Use JSONB for PostgreSQL
        allowNull: false,
      },
      totalResults: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "total_results", // Map to snake_case column
      },
      resultsPerPage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "results_per_page", // Map to snake_case column
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at", // Map to snake_case column
      },
    },
    {
      tableName: "youtube_search_caches", // Explicit snake_case table name
      underscored: true, // Use snake_case for all columns
      indexes: [
        {
          name: "idx_youtube_cache_query",
          fields: ["query"],
        },
        {
          name: "idx_youtube_cache_expires",
          fields: ["expires_at"],
        },
      ],
    }
  );

  return YouTubeSearchCache;
};
