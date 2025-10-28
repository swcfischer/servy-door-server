"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("users");

    // Only add googleId if it doesn't exist
    if (!tableDescription.googleId) {
      await queryInterface.addColumn("users", "googleId", {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }

    // Only add avatar if it doesn't exist
    if (!tableDescription.avatar) {
      await queryInterface.addColumn("users", "avatar", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("users");

    if (tableDescription.googleId) {
      await queryInterface.removeColumn("users", "googleId");
    }

    if (tableDescription.avatar) {
      await queryInterface.removeColumn("users", "avatar");
    }
  },
};
