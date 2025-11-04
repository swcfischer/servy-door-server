"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("youTubeSearchCaches", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      query: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      results: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      totalResults: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      resultsPerPage: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex("youTubeSearchCaches", ["query"]);
    await queryInterface.addIndex("youTubeSearchCaches", ["expiresAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("youTubeSearchCaches");
  },
};
