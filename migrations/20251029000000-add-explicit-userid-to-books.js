"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * This migration ensures the userId column exists in the books table
     * with proper constraints and foreign key reference.
     */

    const tableDescription = await queryInterface.describeTable("books");

    // Check if userId column already exists (it might have been created by Sequelize associations)
    if (!tableDescription.userId) {
      // Add the userId column if it doesn't exist
      await queryInterface.addColumn("books", "userId", {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "uuid",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });

      // Add index for better query performance
      await queryInterface.addIndex("books", ["userId"], {
        name: "books_user_id_index",
      });
    } else {
      // If the column exists but doesn't have proper constraints, modify it
      console.log("userId column already exists, checking constraints...");

      // Add foreign key constraint if it doesn't exist
      try {
        await queryInterface.addConstraint("books", {
          fields: ["userId"],
          type: "foreign key",
          name: "books_userId_fkey",
          references: {
            table: "users",
            field: "uuid",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        });
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log("Foreign key constraint already exists");
        } else {
          throw error;
        }
      }

      // Add index if it doesn't exist
      try {
        await queryInterface.addIndex("books", ["userId"], {
          name: "books_user_id_index",
        });
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log("Index already exists");
        } else {
          throw error;
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Note: Be careful with this down migration as it will remove the userId column
     * and all data relationships. Only run this if you're sure you want to remove
     * the explicit userId column definition.
     */

    // Remove index
    try {
      await queryInterface.removeIndex("books", "books_user_id_index");
    } catch (error) {
      console.log("Index may not exist or already removed");
    }

    // Remove foreign key constraint
    try {
      await queryInterface.removeConstraint("books", "books_userId_fkey");
    } catch (error) {
      console.log("Foreign key constraint may not exist or already removed");
    }

    // Note: We don't remove the userId column in the down migration
    // because it might have been created by Sequelize associations
    // and removing it could break existing data relationships.
    // If you really need to remove it, uncomment the line below:
    // await queryInterface.removeColumn("books", "userId");

    console.log(
      "Down migration completed. Note: userId column was not removed for data safety."
    );
  },
};
