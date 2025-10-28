"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    const tableDescription = await queryInterface.describeTable("books");

    // Only add the column if it doesn't exist
    if (!tableDescription.lastUpdatedAt) {
      await queryInterface.addColumn("books", "lastUpdatedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    const tableDescription = await queryInterface.describeTable("books");

    // Only remove the column if it exists
    if (tableDescription.lastUpdatedAt) {
      await queryInterface.removeColumn("books", "lastUpdatedAt");
    }
  },
};
