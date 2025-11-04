"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("youtube_search_caches", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      query: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      results: {
        type: Sequelize.JSONB, // Use JSONB for PostgreSQL (better performance)
        allowNull: false,
      },
      total_results: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      results_per_page: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes with PostgreSQL-friendly names
    await queryInterface.addIndex("youtube_search_caches", ["query"], {
      name: "idx_youtube_cache_query",
    });

    await queryInterface.addIndex("youtube_search_caches", ["expires_at"], {
      name: "idx_youtube_cache_expires",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("youtube_search_caches");
  },
};
