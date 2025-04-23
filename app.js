require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(
  cors({
    origin: ["https://servydoor.com", "http://localhost:4567"],
    exposedHeaders: "Auth-Token,Authorization",
  })
);
app.use(bodyParser.json({ limit: "10mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// const baseRoutes = require("./routes/baseRoute");
const userRoutes = require("./routes/users");
const bookRoutes = require("./routes/books");
const readingSessionsRoutes = require("./routes/readingSession");
const bookmarkRoutes = require("./routes/bookmarks");
const bookWordDefinition = require("./routes/bookWordDefinition");

// app.use("/api", baseRoutes);
app.use("/users", userRoutes);
app.use("/books", bookRoutes);
app.use("/reading-sessions", readingSessionsRoutes);
app.use("/bookmarks", bookmarkRoutes);
app.use("/book-word-definition", bookWordDefinition);

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log("Listening on port: " + PORT);
});
