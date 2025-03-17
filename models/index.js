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
  sequelize = new Sequelize("stevenfischer", "stevenfischer", "", {
    host: "localhost",
    dialect: "postgres",
  });
  // sequelize = new Sequelize({
  //   dialect: "sqlite",
  //   storage: "db/database.sqlite",
  // });
}

const User = require("./User")(sequelize, DataTypes);
const Book = require("./Book")(sequelize, DataTypes);
const Bookmark = require("./Bookmark")(sequelize, DataTypes);
const ReadingSession = require("./ReadingSession")(sequelize, DataTypes);

User.hasMany(Book, { foreignKey: "userId" });
User.hasMany(Bookmark, { foreignKey: "userId" });
Book.belongsTo(User, { foreignKey: "userId" });
Bookmark.belongsTo(User, { foreignKey: "userId" });
ReadingSession.belongsTo(User, { foreignKey: "userId" });
ReadingSession.belongsTo(Book, { foreignKey: "bookId" });

Book.hasMany(ReadingSession, { foreignKey: "bookId" });

User.sync({ force: false })
  .then(() => Book.sync({ force: false }))
  .then(() => Bookmark.sync({ force: true }))
  .then(() => ReadingSession.sync({ force: false }))
  .catch((err) => console.error(err));

module.exports = {
  Sequelize,
  sequelize,
  User,
  Book,
  ReadingSession,
  Bookmark,
};
