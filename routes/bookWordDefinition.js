const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const models = require("../models");
const { isAuthorized } = require("./isAuthorized");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/*



async function main() {
  console.log(response.text);
}

main();
*/

function formContents(word, context, bookTitle) {
  if (context) {
    return `Give me the definition of ${word} given this context ${context}. `;
  }
  return `Give me the definition of ${word}.`;
}

router.post("/create-definition/:userUuid", isAuthorized, async (req, res) => {
  const { bookUuid, googleId, word, context } = req.body;
  const { userUuid } = req.params;

  // * Fetch definition using Gemini

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: formContents(word, context),
  });

  try {
    const newBookWordDefinition = await models.BookWordDefinition.create({
      uuid: uuidv4(),
      googleId,
      bookId: bookUuid,
      userUuid: userUuid,
      word,
      context,
      definition: response.text,
    });

    return res.status(201).json(newBookWordDefinition);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/all/:userUuid/:bookUuid", isAuthorized, async (req, res) => {
  const { userUuid, bookUuid } = req.params;

  try {
    const bookWordDefinitions = await models.BookWordDefinition.findAll({
      where: {
        bookId: bookUuid,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(bookWordDefinitions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// router.post(
//   "/save-reading-session/:userUuid/:bookUuid",
//   isAuthorized,
//   async (req, res) => {
//     const { userUuid, bookUuid } = req.params;

//     const {
//       notes,
//       title = "AI Generated Title",
//       pageRange,
//       sessionUuid,
//     } = req.body;

//     try {
//       const book = await models.Book.findOne({
//         where: {
//           uuid: bookUuid,
//         },
//       });

//       if (book) {
//         book.lastUpdatedAt = new Date();
//         await book.save();
//       }

//       const readingSession = await models.ReadingSession.findOne({
//         where: {
//           uuid: sessionUuid,
//           userId: userUuid,
//           bookId: bookUuid,
//         },
//       });

//       readingSession.notes = notes;
//       readingSession.title = title;
//       readingSession.pageRange = pageRange;
//       await readingSession.save();

//       return res.status(200).json(readingSession);
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

module.exports = router;
