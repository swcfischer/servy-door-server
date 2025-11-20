const { v4: uuidv4 } = require("uuid");
const express = require("express");
const router = express.Router();

const models = require("../models");
const { isAuthorized } = require("./isAuthorized");

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// * Debug endpoint to check book ownership
router.get("/debug-book/:userUuid", isAuthorized, async (req, res) => {
  const { userUuid } = req.params;
  const { id } = req.query;

  try {
    // Find the book without user restriction
    const book = await models.Book.findOne({
      where: { uuid: id },
      include: [
        {
          model: models.User,
          required: false,
        },
      ],
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found anywhere" });
    }

    const debugInfo = {
      book: {
        uuid: book.uuid,
        title: book.title,
        userId: book.userId,
        hasValidUser: !!book.user,
      },
      requestedUser: {
        uuid: userUuid,
        matches: book.userId === userUuid,
      },
      authenticatedUser: {
        uuid: req.user.uuid,
        email: req.user.email,
        matches: book.userId === req.user.uuid,
      },
    };

    return res.json(debugInfo);
  } catch (error) {
    console.error("Debug book error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// * Cleanup endpoint to fix orphaned books for a user
router.post(
  "/cleanup-orphaned-books/:userUuid",
  isAuthorized,
  async (req, res) => {
    const { userUuid } = req.params;

    try {
      // Ensure the authenticated user matches the requested user
      if (req.user.uuid !== userUuid) {
        return res
          .status(403)
          .json({ error: "User mismatch - not authorized" });
      }

      // Find books that appear to belong to this user but have invalid userId
      const allUserBooks = await models.Book.findAll({
        where: {
          userId: userUuid,
        },
        include: [
          {
            model: models.User,
            required: false, // LEFT JOIN to find books without valid users
          },
        ],
      });

      const orphanedBooks = allUserBooks.filter((book) => !book.user);

      if (orphanedBooks.length === 0) {
        return res.json({
          message: "No orphaned books found",
          cleanedUp: 0,
        });
      }

      // Option 1: Reassign orphaned books to the current authenticated user
      // Option 2: Delete orphaned books (safer for data integrity)

      let cleanedUpCount = 0;

      for (const book of orphanedBooks) {
        try {
          // Delete related records first
          await models.BookWordDefinition.destroy({
            where: { bookId: book.uuid },
          });

          await models.ReadingSession.destroy({
            where: { bookId: book.uuid },
          });

          await models.YouTubeVideo.destroy({
            where: { bookId: book.uuid },
          });

          // Delete the orphaned book
          await book.destroy();
          cleanedUpCount++;

          console.log(`Cleaned up orphaned book: ${book.title} (${book.uuid})`);
        } catch (bookError) {
          console.error(`Failed to clean up book ${book.uuid}:`, bookError);
        }
      }

      return res.json({
        message: `Cleaned up ${cleanedUpCount} orphaned books`,
        cleanedUp: cleanedUpCount,
        found: orphanedBooks.length,
      });
    } catch (error) {
      console.error("Error cleaning up orphaned books:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// * Book Summary Translation, No DB
router.get("/translate-summary/:userUuid", isAuthorized, async (req, res) => {
  const { summary, lang } = req.query;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Return only a the following text into ${lang}: ${summary}`,
  });

  const responseText = response.text;
  return res.json({ text: responseText });
});

// Summarize a Google Books description (no DB write)
router.post(
  "/summarize-description/:userUuid",
  isAuthorized,
  async (req, res) => {
    const { userUuid } = req.params;
    const { descriptionHtml = "", googleVolumeId } = req.body;

    try {
      if (req.user.uuid !== userUuid) {
        return res
          .status(403)
          .json({ error: "User mismatch - not authorized" });
      }

      if (!descriptionHtml.trim()) {
        return res.status(400).json({ error: "Missing descriptionHtml" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Gemini not configured",
          message: "GEMINI_API_KEY env var missing",
        });
      }

      // Basic sanitize: strip HTML tags
      const plain = descriptionHtml
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Clamp length to avoid excessive token usage
      const maxLen = 6000;
      const truncated = plain.length > maxLen ? plain.slice(0, maxLen) : plain;

      let summaryText = "";
      try {
        const prompt = `Summarize the following book description into 2-4 concise sentences focusing on the premise and themes without spoilers. Keep it neutral and informative.\n\nDESCRIPTION:\n${truncated}`;
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });
        summaryText = (response.text || "").trim();
      } catch (modelError) {
        console.error(
          "Gemini summarization failed, falling back:",
          modelError.message
        );
        // Fallback simple heuristic: first 3 sentences
        const sentences = truncated
          .match(/[^.!?]+[.!?]?/g)
          ?.map((s) => s.trim()) || [truncated];
        summaryText =
          sentences.slice(0, 3).join(" ") +
          (sentences.length > 3 ? " ..." : "");
      }

      // Final clean
      summaryText = summaryText.replace(/\s+/g, " ").trim();

      return res.json({
        summary: summaryText,
        sourceLength: plain.length,
        truncated: plain.length > maxLen,
        googleVolumeId: googleVolumeId || null,
      });
    } catch (err) {
      console.error("Summarize description error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.post("/create-book/:userUuid", isAuthorized, async (req, res) => {
  const {
    title,
    image = "",
    weeks = "",
    pageCount,
    infoLink,
    previewLink,
    publisher,
    datePublished,
    author,
    motivation = "",
    summary = "",
    volumeInfo,
    googleId,
  } = req.body;

  const { userUuid } = req.params;
  const existingBook = await models.Book.findOne({
    where: {
      title,
      author,
      userId: userUuid,
    },
  });

  if (existingBook) {
    return res.json({ error: "Book already exists", uuid: existingBook.uuid });
  }
  try {
    const newBook = await models.Book.create({
      uuid: uuidv4(),
      title,
      image,
      weeks,
      pageCount,
      infoLink,
      previewLink,
      publisher,
      datePublished,
      author,
      motivation,
      summary,
      volumeInfo,
      userId: userUuid,
      googleId,
    });

    return res.status(201).json(newBook);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/user-books/:userUuid", isAuthorized, async (req, res) => {
  const { userUuid } = req.params;

  try {
    // Ensure we only get books that explicitly belong to the authenticated user
    // This prevents orphaned books from showing up
    const books = await models.Book.findAll({
      where: {
        userId: userUuid, // Explicit filter by userId
      },
      include: [
        {
          model: models.User,
          where: { uuid: userUuid }, // Double-check the user exists and matches
          attributes: [], // Don't include user data in response
        },
      ],
      order: [["lastUpdatedAt", "ASC"]],
    });

    // Additional safety check - verify the authenticated user matches the requested user
    if (req.user.uuid !== userUuid) {
      return res.status(403).json({ error: "User mismatch - not authorized" });
    }

    console.log(`Returning ${books.length} books for user ${userUuid}`);
    return res.status(200).json(books);
  } catch (error) {
    console.error("Error fetching user books:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/book/:userUuid", isAuthorized, async (req, res) => {
  const { userUuid } = req.params;
  const { id } = req.query;

  try {
    const book = await models.Book.findOne({
      where: {
        uuid: id,
        userId: userUuid,
      },
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/book/:userUuid", isAuthorized, async (req, res) => {
  const { userUuid } = req.params;
  const { id } = req.query;

  try {
    // First, verify the user exists and matches the authenticated user
    if (req.user.uuid !== userUuid) {
      return res.status(403).json({ error: "User mismatch - not authorized" });
    }

    // Find the book with more explicit logging
    const book = await models.Book.findOne({
      where: {
        uuid: id,
        userId: userUuid,
      },
    });

    if (!book) {
      console.log(`Book not found: id=${id}, userId=${userUuid}`);

      // Check if book exists but with different userId (orphaned book scenario)
      const orphanedBook = await models.Book.findOne({
        where: {
          uuid: id,
        },
      });

      if (orphanedBook) {
        console.log(`Found orphaned book with userId: ${orphanedBook.userId}`);
        return res.status(403).json({
          error: "Book found but belongs to different user",
          details: {
            bookUserId: orphanedBook.userId,
            currentUserId: userUuid,
          },
        });
      }

      return res.status(404).json({ error: "Book not found" });
    }

    console.log(
      `Deleting book: ${book.title} (${book.uuid}) for user: ${userUuid}`
    );

    // Delete related records in the correct order
    await models.BookWordDefinition.destroy({
      where: {
        bookId: book.uuid,
      },
    });

    await models.ReadingSession.destroy({
      where: {
        bookId: book.uuid,
        userId: userUuid,
      },
    });

    // Also delete any YouTube videos associated with this book
    await models.YouTubeVideo.destroy({
      where: {
        bookId: book.uuid,
        userId: userUuid,
      },
    });

    await book.destroy();
    console.log(`Successfully deleted book: ${book.uuid}`);

    return res.status(200).json({ message: "Book removed successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

module.exports = router;
