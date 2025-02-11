const models = require("../models");
const jwt = require("jsonwebtoken");

async function isAuthorized(req, res, next) {
  const userUuid = req.params.userUuid ?? req.body.userUuid;
  const authorization = req.header("authorization");

  if (!authorization) {
    return res.json({
      error: true,
      message: "You are not authorized",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const verified = await jwt.verify(token, process.env.secret);
    const user = await models.User.findOne({
      where: {
        accountId: verified.data,
      },
    });

    if (verified && userUuid === user.uuid) {
      req.user = user;
      next();
    } else {
      return res.json({
        error: true,
        message: "You are not authorized",
      });
    }
  } catch (e) {
    return res.json({
      error: true,
      message: e.message,
    });
  }
}

module.exports = {
  isAuthorized,
};
