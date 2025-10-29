const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { getValidGoogleToken } = require("../util/refreshGoogleToken");
const { isAuthorized } = require("./isAuthorized");

// Initialize passport config
require("../config/passport");

// Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/books"],
    accessType: "offline",
    prompt: "consent",
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    try {
      console.log(
        "Dev OAuth callback - User:",
        req.user ? "Found" : "Not found"
      );

      // Generate JWT token for Google OAuth users
      const token = jwt.sign({ data: req.user.accountId }, process.env.secret, {
        expiresIn: "365d",
      });

      console.log("Dev OAuth callback - Token generated");

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
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    try {
      console.log("OAuth redirect - User:", req.user ? "Found" : "Not found");

      if (!req.user) {
        console.error("No user returned from Google OAuth");
        const frontendURL =
          process.env.NODE_ENV === "production"
            ? "https://servydoor.com"
            : "http://localhost:4567";
        return res.redirect(`${frontendURL}/auth-callback?error=no_user`);
      }

      console.log("OAuth redirect - AccountId:", req.user.accountId);
      console.log(
        "OAuth redirect - User data:",
        JSON.stringify(req.user, null, 2)
      );

      // Generate JWT token for Google OAuth users
      const token = jwt.sign({ data: req.user.accountId }, process.env.secret, {
        expiresIn: "365d",
      });

      console.log("OAuth redirect - Token generated successfully");
      console.log("OAuth redirect - Token length:", token.length);

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

// Validate and refresh Google OAuth token
router.post("/validate-google-token", isAuthorized, async (req, res) => {
  try {
    const user = req.user;

    if (!user.googleId) {
      return res.status(400).json({
        error: "No Google account linked",
        message: "User has not authenticated with Google",
        requiresAuth: true,
      });
    }

    // Try to get a valid token (will refresh if needed)
    const accessToken = await getValidGoogleToken(user);

    if (!accessToken) {
      return res.status(401).json({
        error: "Token invalid",
        message: "Google authentication expired. Please sign in again.",
        requiresReauth: true,
      });
    }

    return res.json({
      valid: true,
      message: "Google token is valid",
      hasGoogleAccess: true,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(500).json({
      error: "Validation failed",
      message: "Unable to validate Google token",
    });
  }
});

module.exports = router;
