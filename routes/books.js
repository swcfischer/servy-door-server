const { v4: uuidv4 } = require("uuid");
const express = require("express");
const router = express.Router();

const models = require("../models");
const { isAuthorized } = require("./isAuthorized");

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  // const { userUuid } = req.params;

  try {
    const books = await req.user.getBooks({
      order: [["lastUpdatedAt", "ASC"]],
    });
    return res.status(200).json(books);
  } catch (error) {
    console.error(error);
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
    const book = await models.Book.findOne({
      where: {
        uuid: id,
        userId: userUuid,
      },
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

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

    await book.destroy();
    return res.status(200).json({ message: "Book removed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
