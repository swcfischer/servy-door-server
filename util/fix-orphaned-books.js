const models = require("../models");

/**
 * Utility script to diagnose and fix orphaned books
 * Run this script to find books that have invalid userId references
 */

async function diagnoseOrphanedBooks() {
  try {
    console.log("🔍 Diagnosing orphaned books...\n");

    // Find all books
    const allBooks = await models.Book.findAll({
      include: [
        {
          model: models.User,
          required: false, // LEFT JOIN to find books without valid users
        },
      ],
    });

    console.log(`📚 Found ${allBooks.length} total books`);

    // Find orphaned books (books without valid user)
    const orphanedBooks = allBooks.filter((book) => !book.user);

    if (orphanedBooks.length === 0) {
      console.log("✅ No orphaned books found!");
      return;
    }

    console.log(`🚨 Found ${orphanedBooks.length} orphaned books:\n`);

    orphanedBooks.forEach((book, index) => {
      console.log(`${index + 1}. "${book.title}"`);
      console.log(`   - Book UUID: ${book.uuid}`);
      console.log(`   - User ID: ${book.userId}`);
      console.log(`   - Google ID: ${book.googleId}`);
      console.log("");
    });

    // Find all users for reference
    const allUsers = await models.User.findAll({
      attributes: ["uuid", "email", "accountName"],
    });

    console.log("👥 Available users:");
    allUsers.forEach((user) => {
      console.log(
        `   - ${user.uuid} (${
          user.email || user.accountName || "No email/name"
        })`
      );
    });

    return { orphanedBooks, allUsers };
  } catch (error) {
    console.error("❌ Error diagnosing orphaned books:", error);
  }
}

async function reassignOrphanedBook(bookUuid, newUserUuid) {
  try {
    console.log(`🔄 Reassigning book ${bookUuid} to user ${newUserUuid}...`);

    // Verify the user exists
    const user = await models.User.findByPk(newUserUuid);
    if (!user) {
      throw new Error(`User ${newUserUuid} not found`);
    }

    // Update the book
    const [updatedCount] = await models.Book.update(
      { userId: newUserUuid },
      { where: { uuid: bookUuid } }
    );

    if (updatedCount === 0) {
      throw new Error(`Book ${bookUuid} not found`);
    }

    // Update related reading sessions
    await models.ReadingSession.update(
      { userId: newUserUuid },
      { where: { bookId: bookUuid } }
    );

    // Update related word definitions
    await models.BookWordDefinition.update(
      { userId: newUserUuid },
      { where: { bookId: bookUuid } }
    );

    // Update related YouTube videos
    await models.YouTubeVideo.update(
      { userId: newUserUuid },
      { where: { bookId: bookUuid } }
    );

    console.log("✅ Book successfully reassigned!");
  } catch (error) {
    console.error("❌ Error reassigning book:", error);
  }
}

async function deleteOrphanedBook(bookUuid) {
  try {
    console.log(`🗑️  Deleting orphaned book ${bookUuid}...`);

    // Delete related records first
    await models.BookWordDefinition.destroy({
      where: { bookId: bookUuid },
    });

    await models.ReadingSession.destroy({
      where: { bookId: bookUuid },
    });

    await models.YouTubeVideo.destroy({
      where: { bookId: bookUuid },
    });

    // Delete the book
    const deletedCount = await models.Book.destroy({
      where: { uuid: bookUuid },
    });

    if (deletedCount === 0) {
      throw new Error(`Book ${bookUuid} not found`);
    }

    console.log("✅ Book successfully deleted!");
  } catch (error) {
    console.error("❌ Error deleting book:", error);
  }
}

// Export functions for use
module.exports = {
  diagnoseOrphanedBooks,
  reassignOrphanedBook,
  deleteOrphanedBook,
};

// If run directly, diagnose orphaned books
if (require.main === module) {
  diagnoseOrphanedBooks().then(() => {
    console.log("\n💡 To fix orphaned books:");
    console.log("   - Reassign: reassignOrphanedBook(bookUuid, userUuid)");
    console.log("   - Delete: deleteOrphanedBook(bookUuid)");
    process.exit(0);
  });
}
