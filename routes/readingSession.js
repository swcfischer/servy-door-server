const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const models = require("../models");
const { isAuthorized } = require("./isAuthorized");

router.post(
  "/create-reading-session/:userUuid/:bookUuid",
  isAuthorized,
  async (req, res) => {
    const { notes = "", title = "", pageRange } = req.body;
    const { userUuid, bookUuid } = req.params;

    try {
      const newReadingSession = await models.ReadingSession.create({
        uuid: uuidv4(),
        title,
        notes,
        bookId: bookUuid,
        userId: userUuid,
        pageRange,
      });

      return res.status(201).json(newReadingSession);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get("/all/:userUuid/:bookUuid", isAuthorized, async (req, res) => {
  const { userUuid, bookUuid } = req.params;

  try {
    const readingSessions = await models.ReadingSession.findAll({
      where: {
        userId: userUuid,
        bookId: bookUuid,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(readingSessions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/save-reading-session/:userUuid/:bookUuid",
  isAuthorized,
  async (req, res) => {
    const { userUuid, bookUuid } = req.params;

    const {
      notes,
      title = "AI Generated Title",
      pageRange,
      sessionUuid,
    } = req.body;

    try {
      const book = await models.Book.findOne({
        where: {
          uuid: bookUuid,
        },
      });

      if (book) {
        book.lastUpdatedAt = new Date();
        await book.save();
      }

      const readingSession = await models.ReadingSession.findOne({
        where: {
          uuid: sessionUuid,
          userId: userUuid,
          bookId: bookUuid,
        },
      });

      readingSession.notes = notes;
      readingSession.title = title;
      readingSession.pageRange = pageRange;
      await readingSession.save();

      return res.status(200).json(readingSession);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = router;
