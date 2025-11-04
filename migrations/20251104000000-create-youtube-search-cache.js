"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      const tableExists = tables.includes("youtube_search_caches");

      if (!tableExists) {
        await queryInterface.createTable(
          "youtube_search_caches",
          {
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
          },
          { transaction }
        );
      }

      // Check and create indexes only if they don't exist
      const indexes = await queryInterface.showIndex("youtube_search_caches", {
        transaction,
      });
      const indexNames = indexes.map((index) => index.name);

      if (!indexNames.includes("idx_youtube_cache_query")) {
        await queryInterface.addIndex("youtube_search_caches", ["query"], {
          name: "idx_youtube_cache_query",
          transaction,
        });
      }

      if (!indexNames.includes("idx_youtube_cache_expires")) {
        await queryInterface.addIndex("youtube_search_caches", ["expires_at"], {
          name: "idx_youtube_cache_expires",
          transaction,
        });
      }

      await transaction.commit();
      console.log(
        "YouTube search cache table and indexes created successfully"
      );
    } catch (error) {
      await transaction.rollback();

      // If it's just a "relation already exists" error, we can safely ignore it
      if (
        error.message.includes("already exists") ||
        (error.message.includes("relation") && error.message.includes("exists"))
      ) {
        console.log(
          "YouTube search cache table/indexes already exist, skipping creation"
        );
        return;
      }

      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table exists before trying to drop it
      const tables = await queryInterface.showAllTables();
      if (tables.includes("youtube_search_caches")) {
        await queryInterface.dropTable("youtube_search_caches", {
          transaction,
        });
      }

      await transaction.commit();
      console.log("YouTube search cache table dropped successfully");
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
