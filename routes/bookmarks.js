const { v4: uuidv4 } = require("uuid");
const express = require("express");
const router = express.Router();

const models = require("../models");
const { isAuthorized } = require("./isAuthorized");

router.post("/create-bookmark/:userUuid", isAuthorized, async (req, res) => {
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
  const existingBookmark = await models.Bookmark.findOne({
    where: {
      title,
      author,
      userId: userUuid,
    },
  });

  if (existingBookmark) {
    return res.json({
      error: "Bookmark already exists",
      uuid: existingBookmark.uuid,
    });
  }
  try {
    const newBookmark = await models.Bookmark.create({
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

    return res.status(201).json(newBookmark);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/user-bookmarks/:userUuid", isAuthorized, async (req, res) => {
  // const { userUuid } = req.params;

  try {
    const bookmarks = await req.user.getBookmarks({
      order: [["createdAt", "ASC"]],
    });
    return res.status(200).json(bookmarks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/bookmark/:userUuid", isAuthorized, async (req, res) => {
  const { userUuid } = req.params;
  const { id } = req.query;

  try {
    const bookmark = await models.Bookmark.findOne({
      where: {
        uuid: id,
        userId: userUuid,
      },
    });

    if (!bookmark) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    return res.status(200).json(bookmark);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get(
  "/bookmark/is-bookmark/:googleId/:userUuid",
  isAuthorized,
  async (req, res) => {
    const { userUuid, googleId } = req.params;

    try {
      const bookmark = await models.Bookmark.findOne({
        where: {
          googleId,
          userId: userUuid,
        },
      });

      if (!bookmark) {
        return res.json({ isBookmark: false });
      }

      return res.status(200).json({
        isBookmark: true,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.delete("/bookmark/:userUuid", isAuthorized, async (req, res) => {
  const { userUuid } = req.params;
  const { id } = req.query;

  try {
    const bookmark = await models.Bookmark.findOne({
      where: {
        googleId: id,
        userId: userUuid,
      },
    });

    if (!bookmark) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    await bookmark.destroy();
    return res.status(200).json({ message: "Bookmark removed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
