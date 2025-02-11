module.exports = (sequelize, DataTypes) => {
  var Book = sequelize.define("book", {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      defaultValue: "",
    },
    pageCount: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Not Provided",
    },
    infoLink: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    previewLink: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    volumeInfo: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    publisher: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    datePublished: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    author: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
  });

  return Book;
};
