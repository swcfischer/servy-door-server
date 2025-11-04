const { Sequelize, DataTypes } = require("sequelize");

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    port: 5432,
    host: process.env.DATABASE_HOST,
    logging: true, //false
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  // sequelize = new Sequelize("stevenfischer", "stevenfischer", "", {
  //   host: "localhost",
  //   dialect: "postgres",
  // });
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "db/database.sqlite",
  });
}

const User = require("./User")(sequelize, DataTypes);
const Book = require("./Book")(sequelize, DataTypes);
const Bookmark = require("./Bookmark")(sequelize, DataTypes);
const ReadingSession = require("./ReadingSession")(sequelize, DataTypes);
const BookWordDefinition = require("./BookWordDefinition")(
  sequelize,
  DataTypes
);
const YouTubeVideo = require("./YouTubeVideo")(sequelize, DataTypes);
const YouTubeSearchCache = require("./YouTubeSearchCache")(
  sequelize,
  DataTypes
);

User.hasMany(Book, { foreignKey: "userId" });
User.hasMany(Bookmark, { foreignKey: "userId" });
Book.belongsTo(User, { foreignKey: "userId" });
Bookmark.belongsTo(User, { foreignKey: "userId" });
ReadingSession.belongsTo(User, { foreignKey: "userId" });

BookWordDefinition.belongsTo(User, { foreignKey: "userId" });
BookWordDefinition.belongsTo(Book, { foreignKey: "bookId" });

YouTubeVideo.belongsTo(User, { foreignKey: "userId" });
YouTubeVideo.belongsTo(Book, { foreignKey: "bookId" });

Book.hasMany(ReadingSession, { foreignKey: "bookId" });
Book.hasMany(BookWordDefinition, { foreignKey: "bookId" });
Book.hasMany(YouTubeVideo, { foreignKey: "bookId" });

User.sync({ force: false })
  .then(() => Book.sync({ force: false }))
  .then(() => Bookmark.sync({ force: false }))
  .then(() => ReadingSession.sync({ force: false }))
  .then(() => BookWordDefinition.sync({ force: false }))
  .then(() => YouTubeVideo.sync({ force: false }))
  .then(() => YouTubeSearchCache.sync({ force: false }))
  .catch((err) => console.error(err));

module.exports = {
  Sequelize,
  sequelize,
  User,
  Book,
  ReadingSession,
  Bookmark,
  BookWordDefinition,
  YouTubeVideo,
  YouTubeSearchCache,
};
