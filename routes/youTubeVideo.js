const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const models = require("../models");
const { isAuthorized } = require("./isAuthorized");
const axios = require("axios");
const extractVideoId = require("../util/extractVideoId");

router.post(
  "/create-video/:userUuid/:bookUuid",
  isAuthorized,
  async (req, res) => {
    const { notes = "" } = req.body;
    let { title = "Title not found", url } = req.body;
    const { userUuid, bookUuid } = req.params;

    try {
      const videoId = extractVideoId(url);
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!videoId || !apiKey) {
        return res.status(400).json({ error: "Missing videoId or API key" });
      }

      const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;

      const response = await axios.get(youtubeApiUrl);
      const videoData = response.data;

      if (!videoData.items || videoData.items.length === 0) {
        return res.status(404).json({ error: "Video not found" });
      }

      const videoTitle = videoData.items[0].snippet.title;
      title = videoTitle || title;

      const newYouTubeVideo = await models.YouTubeVideo.create({
        uuid: uuidv4(),
        title,
        notes,
        url,
        bookId: bookUuid,
        userId: userUuid,
      });

      return res.status(201).json(newYouTubeVideo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get("/all/:userUuid/:bookUuid", isAuthorized, async (req, res) => {
  const { userUuid, bookUuid } = req.params;

  try {
    const youTubeVideos = await models.YouTubeVideo.findAll({
      where: {
        userId: userUuid,
        bookId: bookUuid,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(youTubeVideos);
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
