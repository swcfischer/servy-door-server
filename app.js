require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");

const app = express();

app.use(
  cors({
    origin: ["https://servydoor.com", "http://localhost:4567"],
    exposedHeaders: "Auth-Token,Authorization",
    credentials: true,
  })
);

// Session middleware for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json({ limit: "10mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// const baseRoutes = require("./routes/baseRoute");
const userRoutes = require("./routes/users");
const bookRoutes = require("./routes/books");
const readingSessionsRoutes = require("./routes/readingSession");
const bookmarkRoutes = require("./routes/bookmarks");
const bookWordDefinition = require("./routes/bookWordDefinition");
const youTubeVideoRoutes = require("./routes/youTubeVideo");
const authRoutes = require("./routes/auth");
const googleBooksRoutes = require("./routes/googleBooks");

// app.use("/api", baseRoutes);
app.use("/users", userRoutes);
app.use("/books", bookRoutes);
app.use("/reading-sessions", readingSessionsRoutes);
app.use("/bookmarks", bookmarkRoutes);
app.use("/book-word-definition", bookWordDefinition);
app.use("/book-video", youTubeVideoRoutes);
app.use("/auth", authRoutes);
app.use("/google-books", googleBooksRoutes);

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log("Listening on port: " + PORT);
});
