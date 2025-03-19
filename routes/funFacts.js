const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const models = require("../models");
const OpenAI = require("openai");
const { isAuthorized } = require("./isAuthorized");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/create-fun-fact/:googleId", async (req, res) => {
  try {
    const { googleId } = req.params;
    const { title: bookTitle, author, summary } = req.query;

    // Check if a fun fact exists for the given googleId
    let funFact = await models.FunFacts.findOne({ where: { googleId } });

    if (funFact) {
      return res.status(200).json(funFact);
    }

    // const prompt = `Generate fun facts and return them as a list of objects (fact and source) about the book titled "${bookTitle}" written by ${author}. Here is a brief summary of the book: "${summary}".`;
    const prompt = `Generate fun facts and return a JSON list of objects (properties: fact and source) about the book titled "${bookTitle}" written by ${author}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const generatedFact = completion.choices[0]?.message?.content?.trim();

    if (generatedFact) {
      // Save the generated fact to the database
      funFact = await models.FunFacts.create({
        googleId,
        facts: generatedFact,
      });
    }

    res.status(200).json(funFact);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

module.exports = router;
