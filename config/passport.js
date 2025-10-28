const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const models = require("../models");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.NODE_ENV === "production"
          ? `${process.env.SERVER_URL}/redirect`
          : "http://localhost:8888/auth/google/callback",
      scope: ["profile", "email", "https://www.googleapis.com/auth/books"],
      accessType: "offline",
      prompt: "consent",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let existingUser = await models.User.findOne({
          where: {
            googleId: profile.id,
          },
        });

        if (existingUser) {
          // Update tokens
          const updatedUser = await existingUser.update({
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken || existingUser.googleRefreshToken,
            avatar: profile.photos[0]?.value,
          });
          return done(null, updatedUser);
        }

        // Check if user exists with the same email
        const existingEmailUser = await models.User.findOne({
          where: {
            email: profile.emails[0].value,
          },
        });

        if (existingEmailUser) {
          // Link Google account to existing user
          const updatedUser = await existingEmailUser.update({
            googleId: profile.id,
            avatar: profile.photos[0]?.value,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
          });
          return done(null, updatedUser);
        }

        // Create new user
        const newUser = await models.User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          accountName:
            profile.displayName || profile.emails[0].value.split("@")[0],
          avatar: profile.photos[0]?.value,
          status: "confirmed", // Google users are auto-confirmed
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.accountId);
});

passport.deserializeUser(async (accountId, done) => {
  try {
    const user = await models.User.findOne({
      where: { accountId },
      attributes: [
        "uuid",
        "email",
        "status",
        "accountId",
        "accountName",
        "avatar",
        "googleId",
      ],
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
