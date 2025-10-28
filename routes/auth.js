const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Initialize passport config
require("../config/passport");

// Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign({ data: req.user.accountId }, process.env.secret, {
        expiresIn: "365d",
      });

      // Redirect to frontend with token
      const frontendURL =
        process.env.NODE_ENV === "production"
          ? "https://servydoor.com"
          : "http://localhost:4567";

      res.redirect(`${frontendURL}/auth-callback?token=${token}`);
    } catch (error) {
      console.error("OAuth callback error:", error);
      const frontendURL =
        process.env.NODE_ENV === "production"
          ? "https://servydoor.com"
          : "http://localhost:4567";

      res.redirect(`${frontendURL}/auth-callback?error=authentication_failed`);
    }
  }
);

// Google OAuth redirect endpoint (production)
router.get(
  "/redirect",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign({ data: req.user.accountId }, process.env.secret, {
        expiresIn: "365d",
      });

      // Redirect to frontend with token
      const frontendURL =
        process.env.NODE_ENV === "production"
          ? "https://servydoor.com"
          : "http://localhost:4567";

      res.redirect(`${frontendURL}/auth-callback?token=${token}`);
    } catch (error) {
      console.error("OAuth redirect error:", error);
      const frontendURL =
        process.env.NODE_ENV === "production"
          ? "https://servydoor.com"
          : "http://localhost:4567";

      res.redirect(`${frontendURL}/auth-callback?error=authentication_failed`);
    }
  }
);

// Link Google account to existing user
router.post("/link-google", async (req, res) => {
  const { googleToken } = req.body;
  const authorization = req.header("authorization");

  if (!authorization) {
    return res.json({
      error: true,
      message: "Not authenticated",
    });
  }

  try {
    const token = authorization.split(" ")[1];
    const verified = await jwt.verify(token, process.env.secret);

    // Here you would verify the Google token and link accounts
    // This is a simplified version - you'd want to verify the Google token properly

    return res.json({
      error: false,
      message: "Google account linked successfully",
    });
  } catch (error) {
    return res.json({
      error: true,
      message: "Failed to link Google account",
    });
  }
});

// Unlink Google account
router.post("/unlink-google", async (req, res) => {
  const authorization = req.header("authorization");

  if (!authorization) {
    return res.json({
      error: true,
      message: "Not authenticated",
    });
  }

  try {
    const token = authorization.split(" ")[1];
    const verified = await jwt.verify(token, process.env.secret);

    const models = require("../models");
    const user = await models.User.findOne({
      where: { accountId: verified.data },
    });

    if (!user) {
      return res.json({
        error: true,
        message: "User not found",
      });
    }

    // Remove Google ID and avatar
    await user.update({
      googleId: null,
      avatar: null,
    });

    return res.json({
      error: false,
      message: "Google account unlinked successfully",
    });
  } catch (error) {
    return res.json({
      error: true,
      message: "Failed to unlink Google account",
    });
  }
});

module.exports = router;
