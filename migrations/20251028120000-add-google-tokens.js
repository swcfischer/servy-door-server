"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("users");

    if (!tableInfo.googleAccessToken) {
      await queryInterface.addColumn("users", "googleAccessToken", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableInfo.googleRefreshToken) {
      await queryInterface.addColumn("users", "googleRefreshToken", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "googleAccessToken");
    await queryInterface.removeColumn("users", "googleRefreshToken");
  },
};
