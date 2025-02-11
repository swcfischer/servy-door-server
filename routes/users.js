const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
// const postmark = require("postmark");

// const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const sgMail = require("@sendgrid/mail");
// const { Op } = require("sequelize");
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const models = require("../models");
const { isAuthorized } = require("./isAuthorized");
const userStatuses = require("../models/userStatuses");

const saltRounds = 10;

router.post("/register-anon", async (req, res) => {
  const uuid = uuidv4();

  const user = await models.User.build({
    uuid,
  });

  try {
    await user.save();
  } catch (e) {
    return res.json({
      error: true,
      message: "That email is already in use",
    });
  }

  jwt.sign({ data: user.accountId }, process.env.secret, async (err, token) => {
    if (err) {
      throw Error(err.message);
    }
    try {
      return res.json({
        error: false,
        token,
        uuid: user.uuid,
      });
    } catch (e) {
      console.log("Registration Error", e);
      return res.json({
        error: true,
        message: e.message,
      });
    }
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  bcrypt.hash(password, saltRounds, async function (err, hash) {
    try {
      const user = await models.User.findOne({
        where: {
          email,
        },
        attributes: ["email", "uuid", "status", "accountId", "password"],
      });
      bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
          jwt.sign(
            { data: user.accountId },
            process.env.secret,
            async (err, token) => {
              if (err) {
                throw Error(err.message);
              }
              try {
                return res.json({
                  token,
                  user: {
                    email: user.email,
                    uuid: user.uuid,
                  },
                });
              } catch (e) {
                console.log("Registration Error", e);
                return res.json({
                  error: true,
                  message: e.message,
                });
              }
            }
          );
        }
      });
    } catch (e) {
      console.log("🚀 ~ file: users.js:89 ~ e:", e);
      return res.json({
        error: true,
        message: "Email already in use",
      });
    }
  });
});

// router.post("/create-account", async (req, res) => {
//   const { email, password, uuid } = req.body;

//   bcrypt.hash(password, saltRounds, async function (err, hash) {
//     try {
//       const user = await models.User.findOne({
//         where: {
//           uuid,
//         },
//       });

//       if (user.status !== userStatuses.anonymous) {
//         throw new Error("Confirmation email already sent");
//       }
//       await user.update({
//         email,
//         password: hash,
//         status: userStatuses.confirmationSent,
//       });

//       // * 2-day Expiration on JWT
//       jwt.sign(
//         { data: user.accountId },
//         process.env.email_secret,
//         { expiresIn: "2d" },
//         async (err, emailToken) => {
//           if (err) {
//             throw Error(err.message);
//           }
//           try {
//             let url;
//             if (process.env.NODE_ENV === "production") {
//               url = `https://www.avidlanguagelearning.com/account/confirm?token=${emailToken}`;
//             } else {
//               url = `http://localhost:8000/account/confirm?token=${emailToken}`;
//             }
//             const msg = {
//               // To: user.email,
//               To: email,
//               From: "Steve@avidlanguagelearning.com",
//               Subject: "Confirmation email from Avid Language Learning",
//               TextBody: `Hello! \nUse this link to verify your email: ${url}`,
//               HtmlBody: `Hello!<br /><p>Please use this link to verify your email <a href=${url}>here</a>.</p>`,
//             };

//             await postmarkClient.sendEmail(msg);
//             return res.json({
//               error: false,
//               message: "Confirmation email was sent to " + user.email,
//               url,
//               msg,
//             });
//           } catch (e) {
//             console.log("Registration Error", e);
//             return res.json({
//               error: true,
//               message: e.message,
//             });
//           }
//         }
//       );
//     } catch (e) {
//       return res.json({
//         error: true,
//         message: "Email already in use",
//       });
//     }
//   });
// });

router.post("/confirm/", async (req, res) => {
  const { token } = req.body;

  jwt.verify(token, process.env.email_secret, async (err, verified) => {
    if (!verified) {
      return res.json({
        error: true,
        message: err.message,
      });
    }
    const user = await models.User.findOne({
      where: {
        accountId: verified.data,
      },
      attributes: ["uuid", "email", "status"],
    });

    if (!user) {
      return res.json({
        error: true,
        message: "User not found",
      });
    }
    // const customer = await stripe.customers.create({
    //   email: user.email,
    //   metadata: {
    //     userId: verified.data,
    //   },
    // });

    const updatedUser = await user.update({
      status: userStatuses.confirmed,
    });

    return res.json({
      error: false,
      message: "Account confirmation successful",
      user: updatedUser,
    });
  });
});

// router.get("/users", async (req, res) => {
//   const users = await models.User.findAll({
//     attributes: ["uuid", "email"],
//   });

//   res.json(users);
// });

router.get("/current_user", async (req, res) => {
  const authorization = req.header("authorization");
  if (!authorization) {
    return res.json({
      currentUser: null,
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const verified = await jwt.verify(token, process.env.secret);
    // ! this is the user's id
    // ! I'm not sure if I want req.user
    // ! or if I want to do it through the client via the redux store

    if (verified) {
      const user = await models.User.findOne({
        where: {
          accountId: verified.data,
        },
        attributes: ["uuid", "email", "status"],
      });

      return res.json({ currentUser: user });
    } else {
      res.json({ currentUser: null });
    }
  } catch (err) {
    console.log(err);
    return res.json({
      error: true,
      message: err.message,
      currentUser: null,
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await models.User.findOne({
    where: {
      email,
    },
    attributes: ["uuid", "confirmed", "email", "password"],
  });

  if (!user) {
    return res.json({
      error: true,
      message: "Email or password was incorrect",
    });
  }
  if (!user.confirmed) {
    return res.json({
      error: true,
      message: "You must verify your email before you login",
    });
  }
  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      return res.json({
        error: true,
        message: "Email or password was incorrect",
      });
    }

    // ! set expiration on jwt
    jwt.sign(
      { data: user.uuid },
      process.env.secret,
      { expiresIn: "365d" },
      (err, token) => {
        console.log(err);
        res.set("Auth-Token", token);
        return res.json({
          currentUser: {
            email: user.email,
            uuid: user.uuid,
            confirmed: user.confirmed,
          },
        });
      }
    );
  });
});

// router.get("/forgot-password", async (req, res) => {
//   const { email } = req.query;
//   // this will send an email with a 2 day expiration jwt

//   const user = await models.User.findOne({
//     where: {
//       email,
//     },
//   });

//   if (!user) {
//     return res.json({
//       error: true,
//       message: "That email does not exist",
//     });
//   }

//   jwt.sign(
//     { data: user.uuid },
//     process.env.EMAIL_FORGOT_PASS_SECRET,
//     { expiresIn: "2d" },
//     async (err, emailToken) => {
//       if (err) {
//         return res.json({
//           error: true,
//           message: err.message,
//         });
//       }

//       const url =
//         process.env.NODE_ENV === "production"
//           ? `https://www.avidlanguagelearning.com/account/set-password?token=${emailToken}`
//           : `http://localhost:8000/account/set-password?token=${emailToken}`;

//       const msg = {
//         From: "steve@avidlanguagelearning.com",
//         To: email,
//         Subject: "Forgot Password Email",
//         TextBody: `Hello!\n \n Use this link to enter in a new password ${url}`,
//         HtmlBody: `Hello!
//            <br />
//            <p>
//             Please use this link to enter in a new password <a href=${url}>here</a>
//             <br />
//             This link will expire in two days.
//            </p>`,
//       };

//       await postmarkClient.sendEmail(msg);

//       return res.json({
//         error: false,
//         message: "Email was sent successfully",
//       });
//     }
//   );
// });

router.post("/set-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  try {
    if (!password || !confirmPassword) {
      throw new Error("Must provide passwords");
    }
    const verified = await jwt.verify(
      token,
      process.env.EMAIL_FORGOT_PASS_SECRET
    );

    const userUuid = verified.data;

    const user = await models.User.findOne({
      where: {
        uuid: userUuid,
      },
    });

    bcrypt.hash(password, saltRounds, async function (err, hash) {
      if (err) {
        throw new Error(err.message);
      }

      await user.update({
        password: hash,
      });

      res.json({
        error: false,
        message: "Password has been set",
      });
    });
  } catch (e) {
    return res.json({
      error: true,
      message: e.message,
    });
  }
});

router.get("/user/:userUuid", isAuthorized, async (req, res) => {
  const { userUuid } = req.params;

  try {
    const user = await models.User.findOne({
      where: {
        uuid: userUuid,
      },
      attributes: ["email", "confirmed"],
    });

    res.json(user);
  } catch (err) {
    res.json({
      error: true,
      message: err.message,
    });
  }
});

router.post("/contact-us", async (req, res) => {
  const { email, text, subject } = req.body;

  if (subject) {
    return res.json({
      error: true,
      message: "Invalid inputs",
    });
  }

  try {
    const msg = {
      from: "Hello@asia-teach.com",
      to: "Hello@asia-teach.com",
      subject: "Contact Us " + email,
      text,
    };
    // await sgMail.send(msg);

    res.json({
      error: false,
      message: "Message sent",
    });
  } catch (err) {
    res.json({
      error: true,
      message: err.message,
    });
  }
});

module.exports = router;
